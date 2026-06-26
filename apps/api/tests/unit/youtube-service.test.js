import { afterEach, beforeEach, vi } from "vitest"
import { EventEmitter } from "node:events"

// Mock the native-binary + filesystem + OpenRouter dependencies.
vi.mock("node:child_process", () => ({ spawn: vi.fn() }))
vi.mock("node:fs/promises", () => ({
  mkdtemp: vi.fn(async (p) => `${p}XXXX`),
  rm: vi.fn(async () => {}),
  readdir: vi.fn(),
  readFile: vi.fn(),
}))
vi.mock("../../src/services/openrouter.js", () => ({ transcribeAudio: vi.fn() }))

const { spawn } = await import("node:child_process")
const fsp = await import("node:fs/promises")
const openrouter = await import("../../src/services/openrouter.js")
const { getTranscript, killActiveChildren } = await import("../../src/services/youtube.js")

/** Make spawn() resolve: emit `stdout`, then close with `code`. */
function mockSpawnOnce(stdout = "", code = 0) {
  const child = new EventEmitter()
  child.stdout = new EventEmitter()
  child.stderr = new EventEmitter()
  child.kill = vi.fn()
  spawn.mockImplementationOnce(() => {
    queueMicrotask(() => {
      if (stdout) child.stdout.emit("data", stdout)
      child.emit("close", code)
    })
    return child
  })
  return child
}

beforeEach(() => {
  process.env.YOUTUBE_AUDIO_SEGMENT_SECONDS = "600"
  process.env.YOUTUBE_DOWNLOAD_TIMEOUT_MS = "600000"
  process.env.YOUTUBE_MAX_DURATION_SECONDS = "7200"
  process.env.YOUTUBE_MAX_FILESIZE = "150M"
})
afterEach(() => vi.clearAllMocks())

describe("getTranscript", () => {
  it("uses a manual subtitle when one exists in the original language", async () => {
    // 1) fetchVideoInfo -J  2) fetchManualSubtitle download
    mockSpawnOnce(JSON.stringify({ title: "Talk", language: "en", subtitles: { en: [{}] } }))
    mockSpawnOnce("")
    fsp.readdir.mockResolvedValueOnce(["sub.en.json3"])
    fsp.readFile.mockResolvedValueOnce(
      JSON.stringify({ events: [{ segs: [{ utf8: "captioned text" }] }] }),
    )

    const result = await getTranscript("https://www.youtube.com/watch?v=aircAruvnKk")

    expect(result).toEqual({
      text: "captioned text",
      title: "Talk",
      transcriptSource: "manual_subtitle",
      language: "en",
    })
    expect(openrouter.transcribeAudio).not.toHaveBeenCalled()
    expect(fsp.rm).toHaveBeenCalled() // temp dir cleaned up
  })

  it("falls back to Whisper when there are no manual subtitles", async () => {
    mockSpawnOnce(JSON.stringify({ title: "Talk", language: "en", subtitles: {} })) // info
    mockSpawnOnce("") // yt-dlp audio download
    mockSpawnOnce("") // ffmpeg segment
    fsp.readdir
      .mockResolvedValueOnce(["audio.mp3"]) // A2: audio-existence check after download
      .mockResolvedValueOnce(["seg000.mp3", "seg001.mp3"]) // segment listing
    fsp.readFile.mockResolvedValue(Buffer.from("audio"))
    openrouter.transcribeAudio.mockResolvedValueOnce("part one").mockResolvedValueOnce("part two")

    const result = await getTranscript("https://www.youtube.com/watch?v=aircAruvnKk")

    expect(result.transcriptSource).toBe("whisper")
    expect(result.text).toBe("part one\npart two")
    expect(openrouter.transcribeAudio).toHaveBeenCalledTimes(2)
  })

  it("downloads capped low-bitrate audio and downsamples to 16kHz mono", async () => {
    mockSpawnOnce(JSON.stringify({ title: "Talk", language: "en", subtitles: {} })) // info
    mockSpawnOnce("") // yt-dlp audio download
    mockSpawnOnce("") // ffmpeg segment
    fsp.readdir
      .mockResolvedValueOnce(["audio.mp3"]) // A2: audio-existence check after download
      .mockResolvedValueOnce(["seg000.mp3"]) // segment listing
    fsp.readFile.mockResolvedValue(Buffer.from("audio"))
    openrouter.transcribeAudio.mockResolvedValueOnce("text")

    await getTranscript("https://www.youtube.com/watch?v=aircAruvnKk")

    const downloadArgs = spawn.mock.calls[1][1] // 2nd spawn = yt-dlp audio download
    expect(downloadArgs.join(" ")).toContain("bestaudio[abr<=70]")
    expect(downloadArgs).toContain("--max-filesize")
    expect(downloadArgs).toContain("150M")

    const ffmpegArgs = spawn.mock.calls[2][1] // 3rd spawn = ffmpeg segmentation
    expect(ffmpegArgs).toEqual(expect.arrayContaining(["-ar", "16000", "-ac", "1"]))
    expect(ffmpegArgs).not.toContain("copy")
  })

  it("rejects an over-long video before downloading audio", async () => {
    // fetchVideoInfo -J returns a 10000s video with no manual subs → would hit Whisper
    mockSpawnOnce(JSON.stringify({ title: "Long", language: "en", subtitles: {}, duration: 10000 }))

    await expect(getTranscript("https://www.youtube.com/watch?v=aircAruvnKk")).rejects.toThrow(
      /too long/i,
    )

    expect(openrouter.transcribeAudio).not.toHaveBeenCalled()
    expect(spawn).toHaveBeenCalledTimes(1) // only the -J info call; no audio download
    expect(fsp.rm).toHaveBeenCalled() // temp dir still cleaned up
  })

  it("uses a regional caption variant when the exact language code is absent", async () => {
    // yt-dlp reports language "en" but only an "en-US" manual track exists
    mockSpawnOnce(JSON.stringify({ title: "Talk", language: "en", subtitles: { "en-US": [{}] } })) // info
    mockSpawnOnce("") // fetchManualSubtitle download
    fsp.readdir.mockResolvedValueOnce(["sub.en-US.json3"])
    fsp.readFile.mockResolvedValueOnce(
      JSON.stringify({ events: [{ segs: [{ utf8: "variant captions" }] }] }),
    )

    const result = await getTranscript("https://www.youtube.com/watch?v=aircAruvnKk")

    expect(result.transcriptSource).toBe("manual_subtitle")
    expect(result.text).toBe("variant captions")
    expect(result.language).toBe("en-US")
    expect(openrouter.transcribeAudio).not.toHaveBeenCalled()
  })

  it("retries a transient segment transcription failure before succeeding", async () => {
    mockSpawnOnce(JSON.stringify({ title: "Talk", language: "en", subtitles: {} })) // info
    mockSpawnOnce("") // yt-dlp audio download
    mockSpawnOnce("") // ffmpeg segment
    fsp.readdir
      .mockResolvedValueOnce(["audio.mp3"]) // audio-existence check
      .mockResolvedValueOnce(["seg000.mp3"]) // segment listing
    fsp.readFile.mockResolvedValue(Buffer.from("audio"))
    openrouter.transcribeAudio
      .mockRejectedValueOnce(new Error("503 transient"))
      .mockResolvedValueOnce("recovered text")

    const result = await getTranscript("https://www.youtube.com/watch?v=aircAruvnKk")

    expect(result.text).toBe("recovered text")
    expect(openrouter.transcribeAudio).toHaveBeenCalledTimes(2) // failed once, retried once
  })

  it("fails the job when a segment never transcribes", async () => {
    mockSpawnOnce(JSON.stringify({ title: "Talk", language: "en", subtitles: {} })) // info
    mockSpawnOnce("") // yt-dlp audio download
    mockSpawnOnce("") // ffmpeg segment
    fsp.readdir
      .mockResolvedValueOnce(["audio.mp3"]) // audio-existence check
      .mockResolvedValueOnce(["seg000.mp3"]) // segment listing
    fsp.readFile.mockResolvedValue(Buffer.from("audio"))
    openrouter.transcribeAudio.mockRejectedValue(new Error("persistent 500"))

    await expect(getTranscript("https://www.youtube.com/watch?v=aircAruvnKk")).rejects.toThrow(
      /persistent 500/,
    )
    expect(openrouter.transcribeAudio).toHaveBeenCalledTimes(2) // 2 attempts, then throw
    expect(fsp.rm).toHaveBeenCalled() // temp dir still cleaned up
  })

  it("rejects an oversized video whose audio was skipped by --max-filesize", async () => {
    mockSpawnOnce(JSON.stringify({ title: "Big", language: "en", subtitles: {} })) // info
    mockSpawnOnce("") // yt-dlp audio download exits 0 but writes nothing
    fsp.readdir.mockResolvedValueOnce([]) // no audio.mp3 present

    await expect(getTranscript("https://www.youtube.com/watch?v=aircAruvnKk")).rejects.toThrow(
      /exceeds.*limit/i,
    )

    expect(spawn).toHaveBeenCalledTimes(2) // info + download only; ffmpeg never runs
    expect(openrouter.transcribeAudio).not.toHaveBeenCalled()
    expect(fsp.rm).toHaveBeenCalled() // temp dir still cleaned up
  })

  it("cleans up the temp dir even when processing throws", async () => {
    mockSpawnOnce("", 1) // fetchVideoInfo fails (non-zero exit)
    await expect(getTranscript("https://www.youtube.com/watch?v=aircAruvnKk")).rejects.toThrow()
    expect(fsp.rm).toHaveBeenCalled()
  })

  it("killActiveChildren SIGKILLs an in-flight subprocess", async () => {
    const child = new EventEmitter()
    child.stdout = new EventEmitter()
    child.stderr = new EventEmitter()
    child.kill = vi.fn()
    spawn.mockImplementationOnce(() => child) // never emits "close" — stays in-flight

    const pending = getTranscript("https://www.youtube.com/watch?v=aircAruvnKk")
    pending.catch(() => {}) // the job is abandoned; swallow any later rejection

    await vi.waitFor(() => expect(spawn).toHaveBeenCalled())
    killActiveChildren()

    expect(child.kill).toHaveBeenCalledWith("SIGKILL")
  })
})
