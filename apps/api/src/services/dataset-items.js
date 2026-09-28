import db from "../config/database.js"
import * as folderModel from "../models/dataset-folders.js"
import * as datasetFileModel from "../models/dataset-files.js"
import { encodeCursor } from "../utils/keyset-cursor.js"
import HttpError from "../utils/http-error.js"
import { HTTP_STATUS_CODE } from "../utils/constant.js"
import { escapeIlike } from "../utils/sanitize.js"
import { uuidArray } from "../utils/pg-array.js"

const NIL = `'${folderModel.NIL_UUID}'::uuid`

/**
 * Shapes a folder row as a list item.
 *
 * @param {Object} row - Folder row with sort_key
 * @param {Map<string, { folders: number, files: number }>} counts - Child counts for each folder
 * @returns {Object} The folder item
 */
export const toFolderItem = ({ sort_key: _s, has_children: _h, ...row }, counts) => ({
  kind: "folder",
  ...row,
  item_count: counts.get(row.id) ?? { folders: 0, files: 0 },
})

/**
 * Shapes a file row as a list item.
 *
 * @param {Object} row - File row with sort_key
 * @returns {Object} The file item
 */
export const toFileItem = ({ sort_key: _s, ...row }) => ({ kind: "file", ...row })

const STATUSES = ["pending", "queued", "processing", "completed", "failed", "cancelled"]

/**
 * Parses the status filter from the query string.
 *
 * @param {unknown} value - Raw comma list, such as "failed,processing"
 * @returns {string[]} The statuses without duplicates, or [] when empty
 * @throws {HttpError} 400 when a value is not a file status
 */
export const parseStatuses = (value) => {
  if (value === undefined || value === "") return []
  const list = [...new Set(String(value).split(","))]
  if (list.some((s) => !STATUSES.includes(s))) {
    throw new HttpError(
      HTTP_STATUS_CODE.BAD_REQUEST,
      `status must be a comma list of: ${STATUSES.join(", ")}`,
    )
  }
  return list
}

/**
 * Builds one page from two keyset sources: folders first, then files.
 * When a page ends after the last folder, the cursor is a folder cursor, so the next page
 * starts at the first file.
 *
 * @param {{ cursor: Object|null, limit: number, fetchFolders: Function, fetchFiles: Function }} params - fetchFolders(cursor, n) and fetchFiles(after, n) return rows with sort_key
 * @returns {Promise<{ folders: Object[], files: Object[], nextCursor: string|null }>} The page
 */
const assemblePage = async ({ cursor, limit, fetchFolders, fetchFiles }) => {
  const folders = cursor?.kind === "file" ? [] : await fetchFolders(cursor, limit + 1)
  const pageFolders = folders.slice(0, limit)
  const lastFolder = pageFolders.at(-1)
  if (folders.length > limit) {
    const nextCursor = encodeCursor({
      kind: "folder",
      name: lastFolder.sort_key,
      id: lastFolder.id,
    })
    return { folders: pageFolders, files: [], nextCursor }
  }
  const remaining = limit - pageFolders.length
  const rows = await fetchFiles(cursor?.kind === "file" ? cursor : null, remaining + 1)
  const files = rows.slice(0, remaining)
  let nextCursor = null
  if (rows.length > remaining) {
    const last = files.at(-1) ?? lastFolder
    nextCursor = encodeCursor({
      kind: files.length ? "file" : "folder",
      name: last.sort_key,
      id: last.id,
    })
  }
  return { folders: pageFolders, files, nextCursor }
}

/**
 * Returns one page of a folder: folders first, then files. Each part uses its own keyset.
 * The file query runs with LIMIT remaining + 1, so it also tells if a next page exists.
 *
 * @param {{ datasetId: string, folderId: string|null, cursor: Object|null, limit: number }} params - Page request
 * @returns {Promise<{ items: Object[], nextCursor: string|null }>} The page
 */
export const browseItems = async ({ datasetId, folderId, cursor, limit }) => {
  const page = await assemblePage({
    cursor,
    limit,
    fetchFolders: (c, n) =>
      folderModel.listChildren({
        datasetId,
        parentId: folderId,
        afterKey: c?.name ?? null,
        limit: n,
      }),
    fetchFiles: (after, n) =>
      datasetFileModel.listInFolder({ datasetId, folderId, after, limit: n }),
  })
  const counts = await folderModel.countChildren({
    folderIds: page.folders.map((f) => f.id),
    datasetId,
  })
  return {
    items: [...page.folders.map((f) => toFolderItem(f, counts)), ...page.files.map(toFileItem)],
    nextCursor: page.nextCursor,
  }
}

/** SQL keyset filter on (name, id). Bindings come from `keyArgs`. */
const keyset = (nameExpr, alias) =>
  `(?::text IS NULL OR (${nameExpr}, ${alias}.id) > (?::text, ?::uuid))`

/** Bindings for `keyset`. A null cursor turns the filter off. */
const keyArgs = (c) => [c?.name ?? null, c?.name ?? null, c?.id ?? null]

/**
 * Searches the current folder and all its subfolders. The trigram indexes serve ILIKE, and
 * PostgreSQL sorts the matches with a top-N heap: O(m log k). Paths cost O(k·d log n).
 *
 * @param {{ datasetId: string, folderId: string|null, q: string, statuses: string[], cursor: Object|null, limit: number }} params - Search request
 * @returns {Promise<{ items: Object[], nextCursor: string|null }>} The page, with a path on each item
 */
export const searchItems = async ({ datasetId, folderId, q, statuses, cursor, limit }) => {
  const pattern = `%${escapeIlike(q)}%`
  const withSub = folderId ? `WITH RECURSIVE ${folderModel.SUBTREE_CTE}` : ""
  const subArgs = folderId ? [uuidArray([folderId]), datasetId] : []
  const inScope = (col) => (folderId ? `COALESCE(${col}, ${NIL}) IN (SELECT id FROM sub)` : "TRUE")

  const fetchFolders = async (c, n) => {
    if (statuses.length) return []
    const { rows } = await db.raw(
      `${withSub} SELECT f.id, f.name, f.parent_id, f.created_at, f.updated_at,
         lower(f.name) AS sort_key
       FROM dataset_folders f
       WHERE f.dataset_id = ? AND f.deleted_at IS NULL AND f.name ILIKE ?
         AND ${inScope("f.parent_id")} AND ${keyset("lower(f.name)", "f")}
       ORDER BY lower(f.name), f.id LIMIT ?`,
      [...subArgs, datasetId, pattern, ...keyArgs(c), n],
    )
    return rows
  }
  const fetchFiles = async (after, n) => {
    const { rows } = await db.raw(
      `${withSub} SELECT d.${datasetFileModel.COLUMNS.join(", d.")}, lower(d.filename) AS sort_key
       FROM dataset_files d
       WHERE d.dataset_id = ? AND d.deleted_at IS NULL AND d.filename ILIKE ?
         AND ${inScope("d.folder_id")} AND ${keyset("lower(d.filename)", "d")}
         AND (?::text IS NULL OR d.status::text = ANY(?::text[]))
       ORDER BY lower(d.filename), d.id LIMIT ?`,
      [
        ...subArgs,
        datasetId,
        pattern,
        ...keyArgs(after),
        statuses.length ? "x" : null,
        `{${statuses.join(",")}}`,
        n,
      ],
    )
    return rows
  }

  const page = await assemblePage({ cursor, limit, fetchFolders, fetchFiles })
  const containers = [
    ...page.folders.map((f) => f.parent_id),
    ...page.files.map((f) => f.folder_id),
  ].filter(Boolean)
  const [paths, counts] = await Promise.all([
    folderModel.pathsBelow({ folderIds: containers, stopAt: folderId, datasetId }),
    folderModel.countChildren({ folderIds: page.folders.map((f) => f.id), datasetId }),
  ])
  const withPath = (item, container) => ({ ...item, path: paths.get(container) ?? [] })
  return {
    items: [
      ...page.folders.map((f) => withPath(toFolderItem(f, counts), f.parent_id)),
      ...page.files.map((f) => withPath(toFileItem(f), f.folder_id)),
    ],
    nextCursor: page.nextCursor,
  }
}
