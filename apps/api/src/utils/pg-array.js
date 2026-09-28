import { isUuid } from "./uuid.js"

/**
 * Returns a PostgreSQL array literal for a `?::uuid[]` binding. Knex expands a JavaScript array
 * binding in `db.raw` into a list, so raw SQL uses this literal instead.
 *
 * @param {string[]} ids - UUID strings
 * @returns {string} Literal such as `{a,b}`
 * @throws {Error} When a value is not a UUID, so no other text can get into the literal
 */
export const uuidArray = (ids) => {
  for (const id of ids) if (!isUuid(id)) throw new Error(`Not a UUID: ${id}`)
  return `{${ids.join(",")}}`
}
