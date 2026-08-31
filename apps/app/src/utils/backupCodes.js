/**
 * Copies backup codes to the clipboard, one per line.
 *
 * @param {string[]} codes - The backup codes.
 * @returns {Promise<void>}
 */
export async function copyCodes(codes) {
  await navigator.clipboard?.writeText(codes.join("\n"))
}

/**
 * Downloads backup codes as a plain-text file.
 *
 * @param {string[]} codes - The backup codes.
 */
export function downloadCodes(codes) {
  const blob = new Blob([`RAGBot backup codes\n\n${codes.join("\n")}\n`], { type: "text/plain" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "ragbot-backup-codes.txt"
  a.click()
  URL.revokeObjectURL(url)
}
