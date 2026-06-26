import { spawn } from "node:child_process"
import { mkdtemp, rm, readdir, readFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import * as openrouterService from "./openrouter.js"

/** Hostnames accepted as YouTube sources. Anything else is rejected. */
const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
])

/**
 * Parse and validate a YouTube URL, returning the video id and a canonical watch URL.
 *
 * Accepts standard watch URLs (`youtube.com/watch?v=ID`), short URLs (`youtu.be/ID`),
 * and the m./music. hosts. A `list` (playlist) param is ignored — only the single
 * video is imported. Rejects non-URLs, non-YouTube hosts, and URLs with no valid
 * 11-character video id (which excludes playlist and channel URLs).
 *
 * @param {string} input - The user-supplied URL
 * @returns {{ videoId: string, canonicalUrl: string }} Parsed video id and canonical watch URL
 * @throws {Error} If the input is not a valid YouTube video URL
 */
export const parseYouTubeUrl = (input) => {
  let url
  try {
    url = new URL(input)
  } catch {
    throw new Error("Invalid URL")
  }
  if (!YOUTUBE_HOSTS.has(url.hostname)) {
    throw new Error("Only YouTube URLs are supported")
  }
  const videoId =
    url.hostname === "youtu.be" ? url.pathname.slice(1).split("/")[0] : url.searchParams.get("v")
  if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    throw new Error("Could not find a YouTube video id in the URL")
  }
  return { videoId, canonicalUrl: `https://www.youtube.com/watch?v=${videoId}` }
}

/**
 * Convert a YouTube json3 caption document into plain transcript text.
 *
 * Joins each event's `segs[].utf8` fragments, drops formatting-only events,
 * removes consecutive duplicate lines (YouTube rolling captions repeat the
 * previous tail), strips `[Music]` markers, and collapses whitespace.
 *
 * @param {string|object} json3 - The json3 caption document (raw string or parsed object)
 * @returns {string} Cleaned transcript text, or "" if the input cannot be parsed
 */
export const cleanJson3Captions = (json3) => {
  let data
  try {
    data = typeof json3 === "string" ? JSON.parse(json3) : json3
  } catch {
    return ""
  }
  const lines = []
  for (const event of data?.events ?? []) {
    if (!event.segs) continue
    const text = event.segs
      .map((s) => s.utf8 || "")
      .join("")
      .replace(/\n/g, " ")
      .trim()
    if (text) lines.push(text)
  }
  const deduped = []
  for (const line of lines) {
    if (deduped[deduped.length - 1] !== line) deduped.push(line)
  }
  return deduped
    .join(" ")
    .replace(/\[Music\]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

/** Per-segment Whisper transcription attempts before failing the job (1 retry). */
const SEGMENT_TRANSCRIBE_ATTEMPTS = 2

/** Resolve the yt-dlp binary (PATH name or absolute path from env). */
const ytdlpBin = () => process.env.YTDLP_PATH || "yt-dlp"
/** Resolve the ffmpeg binary (PATH name or absolute path from env). */
const ffmpegBin = () => process.env.FFMPEG_PATH || "ffmpeg"

/** Children currently spawned by runCommand — killed on graceful shutdown. */
const activeChildren = new Set()

/** SIGKILL every in-flight yt-dlp/ffmpeg child (called during graceful shutdown). */
export const killActiveChildren = () => {
  for (const child of activeChildren) child.kill("SIGKILL")
}

/**
 * Spawn a command, capture stdout, and resolve it on a clean exit.
 *
 * @param {string} cmd - Executable name or path
 * @param {string[]} cmdArgs - Arguments
 * @param {Object} [options]
 * @param {number} [options.timeoutMs] - Kill the process and reject after this many ms
 * @returns {Promise<string>} Captured stdout
 * @throws {Error} On spawn error, non-zero exit, or timeout
 */
const runCommand = (cmd, cmdArgs, { timeoutMs } = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(cmd, cmdArgs, { stdio: ["ignore", "pipe", "pipe"] })
    activeChildren.add(child)
    let stdout = ""
    let stderr = ""
    const done = (fn) => (arg) => {
      activeChildren.delete(child)
      if (timer) clearTimeout(timer)
      fn(arg)
    }
    const timer = timeoutMs
      ? setTimeout(() => {
          child.kill("SIGKILL")
          done(reject)(new Error(`${cmd} timed out after ${timeoutMs}ms`))
        }, timeoutMs)
      : null
    child.stdout.on("data", (d) => (stdout += d))
    child.stderr.on("data", (d) => (stderr += d))
    child.on("error", (err) => done(reject)(err))
    child.on("close", (code) => {
      if (code === 0) done(resolve)(stdout)
      else done(reject)(new Error(`${cmd} exited with code ${code}: ${stderr.slice(0, 500)}`))
    })
  })

/**
 * Fetch video metadata (title, language, available manual subtitle languages) via yt-dlp -J.
 *
 * @param {string} canonicalUrl - Canonical YouTube watch URL
 * @returns {Promise<{ title: string, language: string, durationSeconds: number|null, manualSubLangs: string[] }>}
 * @throws {Error} If yt-dlp fails or returns unparseable JSON
 */
export const fetchVideoInfo = async (canonicalUrl) => {
  const stdout = await runCommand(
    ytdlpBin(),
    ["-J", "--skip-download", "--no-playlist", canonicalUrl],
    { timeoutMs: 60000 },
  )
  const info = JSON.parse(stdout)
  return {
    title: info.title || "YouTube video",
    language: info.language || "en",
    durationSeconds: info.duration ?? null,
    manualSubLangs: Object.keys(info.subtitles || {}),
  }
}

/**
 * Download a manual subtitle track for a language and return it as cleaned text.
 *
 * @param {Object} params
 * @param {string} params.canonicalUrl - Canonical YouTube watch URL
 * @param {string} params.lang - Subtitle language code (e.g. "en")
 * @param {string} params.dir - Temp directory to write the subtitle file into
 * @returns {Promise<string|null>} Cleaned transcript text, or null if no track was written
 * @throws {Error} If yt-dlp fails
 */
export const fetchManualSubtitle = async ({ canonicalUrl, lang, dir }) => {
  await runCommand(
    ytdlpBin(),
    [
      "--skip-download",
      "--write-subs",
      "--no-playlist",
      "--sub-langs",
      lang,
      "--sub-format",
      "json3",
      "-o",
      path.join(dir, "sub"),
      canonicalUrl,
    ],
    { timeoutMs: 60000 },
  )
  const files = await readdir(dir)
  // Match this language's file specifically — multiple language attempts share `dir`,
  // so a bare `.json3` match could re-read a prior language's leftover subtitle file.
  const subFile = files.find((f) => f.includes(`.${lang}.`) && f.endsWith(".json3"))
  if (!subFile) return null
  const raw = await readFile(path.join(dir, subFile), "utf8")
  return cleanJson3Captions(raw) || null
}

/**
 * Download the audio track, split it into time segments, and Whisper-transcribe each.
 *
 * @param {Object} params
 * @param {string} params.canonicalUrl - Canonical YouTube watch URL
 * @param {string} params.dir - Temp directory for the audio + segment files
 * @returns {Promise<string>} The concatenated transcript text
 * @throws {Error} If yt-dlp/ffmpeg fail
 */
export const transcribeViaWhisper = async ({ canonicalUrl, dir }) => {
  await runCommand(
    ytdlpBin(),
    [
      "-f",
      "bestaudio[abr<=70]/bestaudio/best",
      "--max-filesize",
      process.env.YOUTUBE_MAX_FILESIZE,
      "-x",
      "--audio-format",
      "mp3",
      "--no-playlist",
      "-o",
      path.join(dir, "audio.%(ext)s"),
      canonicalUrl,
    ],
    { timeoutMs: Number(process.env.YOUTUBE_DOWNLOAD_TIMEOUT_MS) },
  )
  // yt-dlp exits 0 without writing the file when --max-filesize is exceeded,
  // so a missing audio file means the video is too large to import.
  const downloaded = await readdir(dir)
  if (!downloaded.includes("audio.mp3")) {
    throw new Error(`Video exceeds the ${process.env.YOUTUBE_MAX_FILESIZE} download limit`)
  }
  await runCommand(
    ffmpegBin(),
    [
      "-i",
      path.join(dir, "audio.mp3"),
      "-ar",
      "16000",
      "-ac",
      "1",
      "-b:a",
      "32k",
      "-f",
      "segment",
      "-segment_time",
      String(Number(process.env.YOUTUBE_AUDIO_SEGMENT_SECONDS)),
      path.join(dir, "seg%03d.mp3"),
    ],
    { timeoutMs: Number(process.env.YOUTUBE_DOWNLOAD_TIMEOUT_MS) },
  )
  const segments = (await readdir(dir)).filter((f) => /^seg\d+\.mp3$/.test(f)).toSorted()
  const parts = []
  for (const seg of segments) {
    const base64 = (await readFile(path.join(dir, seg))).toString("base64")
    let text = ""
    let lastError = null
    for (let attempt = 1; attempt <= SEGMENT_TRANSCRIBE_ATTEMPTS; attempt++) {
      try {
        text = await openrouterService.transcribeAudio(base64, "mp3")
        lastError = null
        break
      } catch (err) {
        lastError = err
      }
    }
    if (lastError) throw lastError
    if (text) parts.push(text.trim())
  }
  return parts.join("\n")
}

/**
 * Find an available caption track matching a desired language by exact code or
 * region variant in either direction ("en" ↔ "en-US").
 *
 * @param {string} want - Desired language code
 * @param {string[]} available - Available manual subtitle language codes
 * @returns {string|undefined} The matching available track code, if any
 */
const resolveTrack = (want, available) =>
  available.find((l) => l === want || l.startsWith(`${want}-`) || want.startsWith(`${l}-`))

/**
 * Resolve a YouTube video to transcript text, preferring manual captions over Whisper.
 *
 * Policy: manual subtitle in the original language, then manual English, then
 * audio download + Whisper. All temp files are removed on completion or failure.
 *
 * @param {string} canonicalUrl - Canonical YouTube watch URL
 * @returns {Promise<{ text: string, title: string, transcriptSource: "manual_subtitle"|"whisper", language: string }>}
 * @throws {Error} If no transcript could be produced
 */
export const getTranscript = async (canonicalUrl) => {
  const dir = await mkdtemp(path.join(tmpdir(), "yt-"))
  try {
    const info = await fetchVideoInfo(canonicalUrl)
    const preferredLangs = [...new Set([info.language, "en"])]
    const triedTracks = new Set()
    for (const want of preferredLangs) {
      const track = resolveTrack(want, info.manualSubLangs)
      if (!track || triedTracks.has(track)) continue
      triedTracks.add(track)
      const text = await fetchManualSubtitle({ canonicalUrl, lang: track, dir })
      if (text) {
        return { text, title: info.title, transcriptSource: "manual_subtitle", language: track }
      }
    }
    const maxDuration = Number(process.env.YOUTUBE_MAX_DURATION_SECONDS)
    if (info.durationSeconds && maxDuration && info.durationSeconds > maxDuration) {
      throw new Error(`Video is too long to import (limit ${Math.round(maxDuration / 60)} min)`)
    }
    const text = await transcribeViaWhisper({ canonicalUrl, dir })
    if (!text) throw new Error("No transcript could be generated for this video")
    return { text, title: info.title, transcriptSource: "whisper", language: info.language }
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {})
  }
}
