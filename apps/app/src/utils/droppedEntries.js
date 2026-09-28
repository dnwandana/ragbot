/** Wraps the callback API of `FileSystemFileEntry.file` in a promise. */
const fileOf = (entry) => new Promise((resolve, reject) => entry.file(resolve, reject))

/** Wraps the callback API of `FileSystemDirectoryReader.readEntries` in a promise. */
const batchOf = (reader) => new Promise((resolve, reject) => reader.readEntries(resolve, reject))

/**
 * Tells if a drag carries files from the computer.
 * @param {DataTransfer | null | undefined} dataTransfer The `dataTransfer` of a drag event.
 * @returns {boolean} True when the drag types include `"Files"`.
 */
export const hasDroppedFiles = (dataTransfer) =>
  Array.from(dataTransfer?.types ?? []).includes("Files")

/**
 * Reads the files of a drop, and walks each dropped folder.
 * A file in a dropped folder gets its path from the dropped folder, for example `"docs/sub/c.txt"`.
 * A loose file gets its name. Without entry support, the function uses `dataTransfer.files`.
 * @param {DataTransfer} dataTransfer The `dataTransfer` of a `drop` event.
 * @returns {Promise<Array<{ file: File, relativePath: string }>>} One entry for each file.
 */
export async function readDroppedItems(dataTransfer) {
  // Read the entries before the first await. The browser clears the drop data after the event.
  const roots = Array.from(dataTransfer.items ?? [])
    .filter((item) => item.kind === "file")
    .map((item) => item.webkitGetAsEntry?.())
    .filter(Boolean)
  if (!roots.length)
    return Array.from(dataTransfer.files ?? [], (file) => ({ file, relativePath: file.name }))

  const out = []
  // An explicit stack, so a deep tree cannot overflow the call stack.
  const stack = roots.map((entry) => ({ entry, prefix: "" }))
  while (stack.length) {
    const { entry, prefix } = stack.pop()
    const path = prefix + entry.name
    if (entry.isFile) {
      out.push({ file: await fileOf(entry), relativePath: path })
      continue
    }
    // readEntries gives the children in batches (Chrome gives 100 at most). An empty batch is the end.
    const reader = entry.createReader()
    for (let batch = await batchOf(reader); batch.length; batch = await batchOf(reader)) {
      for (const child of batch) stack.push({ entry: child, prefix: `${path}/` })
    }
  }
  return out
}

/**
 * Turns the files of a file input into upload entries.
 * A folder picker sets `webkitRelativePath`. A plain file picker does not, so the entry gets the name.
 * @param {FileList | File[]} fileList The `files` of an `<input type="file">`.
 * @returns {Array<{ file: File, relativePath: string }>} One entry for each file.
 */
export function filesFromInput(fileList) {
  return Array.from(fileList, (file) => ({
    file,
    relativePath: file.webkitRelativePath || file.name,
  }))
}
