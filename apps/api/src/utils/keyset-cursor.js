import HttpError from "./http-error.js"
import { HTTP_STATUS_CODE } from "./constant.js"
import { isUuid } from "./uuid.js"

const KINDS = new Set(["folder", "file"])
export const DEFAULT_LIMIT = 50
export const MAX_LIMIT = 200

const invalid = () => new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, "Invalid cursor")

/**
 * Encodes the last row of a page as an opaque cursor.
 *
 * @param {{ kind: "folder"|"file", name: string, id: string }} key - Keyset of the last row
 * @returns {string} base64url JSON
 */
export const encodeCursor = ({ kind, name, id }) =>
  Buffer.from(JSON.stringify({ kind, name, id })).toString("base64url")

/**
 * Decodes and checks a cursor from the query string.
 *
 * @param {string|undefined} value - Raw cursor
 * @returns {{ kind: "folder"|"file", name: string, id: string }|null} The keyset, or null when empty
 * @throws {HttpError} 400 when the cursor is not valid
 */
export const decodeCursor = (value) => {
  if (!value) return null
  let parsed
  try {
    parsed = JSON.parse(Buffer.from(String(value), "base64url").toString("utf8"))
  } catch {
    throw invalid()
  }
  if (
    !parsed ||
    typeof parsed !== "object" ||
    !KINDS.has(parsed.kind) ||
    typeof parsed.name !== "string" ||
    !isUuid(parsed.id)
  ) {
    throw invalid()
  }
  return { kind: parsed.kind, name: parsed.name, id: parsed.id }
}

/**
 * Parses the page size from the query string.
 *
 * @param {unknown} value - Raw limit
 * @returns {number} A limit from 1 to 200, 50 when empty
 * @throws {HttpError} 400 when the limit is not valid
 */
export const parseLimit = (value) => {
  if (value === undefined || value === "") return DEFAULT_LIMIT
  const n = Number(value)
  if (!Number.isInteger(n) || n < 1 || n > MAX_LIMIT) {
    throw new HttpError(
      HTTP_STATUS_CODE.BAD_REQUEST,
      `limit must be an integer from 1 to ${MAX_LIMIT}`,
    )
  }
  return n
}
