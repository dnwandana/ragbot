/** @param {number|null} bytes @returns {string} */
export function humanSize(bytes) {
  if (bytes == null) return "—"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

/** @param {string} filename @returns {string} */
export function fileType(filename) {
  if (!filename) return "file"
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
