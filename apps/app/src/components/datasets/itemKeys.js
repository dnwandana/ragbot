/**
 * The MIME type that marks a drag of dataset items that started in this app.
 * A drag of files from the computer does not carry this type.
 * @type {string}
 */
export const DRAG_TYPE = "application/x-ragbot-items"

/**
 * Returns the selection key of an item. The key includes the kind, so a folder and a file with
 * the same id get different keys.
 * @param {{ kind: "folder" | "file", id: string }} item An item from `GET /items`.
 * @returns {string} `"folder:<id>"` or `"file:<id>"`.
 */
export const itemKey = (item) => `${item.kind}:${item.id}`

/**
 * Splits selection keys into folder ids and file ids in one pass.
 * @param {Iterable<string>} keys Keys that `itemKey` made.
 * @returns {{ folder_ids: string[], file_ids: string[] }} The ids, in the order of the keys.
 */
export function splitKeys(keys) {
  const out = { folder_ids: [], file_ids: [] }
  for (const key of keys) {
    const colon = key.indexOf(":")
    const kind = key.slice(0, colon)
    const id = key.slice(colon + 1)
    ;(kind === "folder" ? out.folder_ids : out.file_ids).push(id)
  }
  return out
}

/**
 * Writes selection keys into the data of a drag, and allows only a move.
 * @param {DataTransfer} dataTransfer The `dataTransfer` of a `dragstart` event.
 * @param {string[]} keys Keys that `itemKey` made.
 * @returns {void}
 */
export function writeDragKeys(dataTransfer, keys) {
  dataTransfer.setData(DRAG_TYPE, JSON.stringify(keys))
  dataTransfer.effectAllowed = "move"
}

/**
 * Reads the selection keys from the data of a drag.
 * @param {DataTransfer | null | undefined} dataTransfer The `dataTransfer` of a drag event.
 * @returns {string[] | null} The keys, or `null` for a drag that did not start in this app (for
 *   example, files from the computer) or for data that is not JSON.
 */
export function readDragKeys(dataTransfer) {
  if (!Array.from(dataTransfer?.types ?? []).includes(DRAG_TYPE)) return null
  try {
    return JSON.parse(dataTransfer.getData(DRAG_TYPE))
  } catch {
    return null
  }
}
