/** @param {number|null} bytes @returns {string} */
export function humanSize(bytes) {
  if (bytes == null) return "—"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

/** @param {string} url @returns {boolean} */
export function isYouTubeUrl(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "")
    return ["youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be"].includes(host)
  } catch {
    return false
  }
}

/**
 * Classify a dataset file's source type for display.
 * `sourceType` (from `metadata.source_type`) is authoritative: a YouTube file's
 * filename is promoted to the video title once processed, so it is no longer a
 * URL and cannot be recognised by the filename alone.
 * @param {string} filename @param {string} [sourceType] @returns {string}
 */
export function fileType(filename, sourceType) {
  if (sourceType === "youtube") return "youtube"
  if (!filename) return "file"
  if (isYouTubeUrl(filename)) return "youtube"
  if (/^https?:\/\//i.test(filename)) return "url"
  const ext = filename.split(".").pop()?.toLowerCase()
  if (ext === "pdf") return "pdf"
  if (ext === "docx" || ext === "doc") return "docx"
  if (ext === "md") return "md"
  return "file"
}

/** @param {string} status @returns {string} */
export function statusLabel(status) {
  if (status === "completed") return "Indexed"
  if (status === "processing" || status === "queued") return "Parsing"
  if (status === "failed") return "Failed"
  return status ?? "—"
}

/** @param {string} status @returns {string} */
export function statusChipClass(status) {
  if (status === "completed") return "chip--ok"
  if (status === "processing" || status === "queued") return "chip--brand"
  if (status === "failed") return "chip--err"
  return ""
}
