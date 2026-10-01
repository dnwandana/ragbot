/**
 * Per-turn citation registry.
 *
 * One chat turn has one number space for its chunks. A `[n]` from the system
 * prompt and a `[n]` from a tool search thus never point to two different
 * chunks. A chunk that comes back in a later search keeps its first number.
 */

/**
 * Creates an empty citation registry for one chat turn.
 *
 * @returns {{ register: (chunks: Object[]) => Array<Object & { n: number }>, get: (n: number) => (Object & { n: number }) | undefined }}
 *   The registry.
 */
export const createCitationRegistry = () => {
  const numberById = new Map()
  const chunkByNumber = new Map()

  /**
   * Gives each chunk a number. A known `chunk_id` keeps its first number. A
   * chunk without `chunk_id` always gets a new number.
   *
   * @param {Object[]} chunks - Chunk rows from a search, in rank order.
   * @returns {Array<Object & { n: number }>} Copies of the chunks with their numbers, in input order.
   */
  const register = (chunks) =>
    chunks.map((chunk) => {
      const id = chunk.chunk_id
      const known = id != null ? numberById.get(id) : undefined
      if (known !== undefined) return { ...chunk, n: known }

      const n = chunkByNumber.size + 1
      const numbered = { ...chunk, n }
      chunkByNumber.set(n, numbered)
      if (id != null) numberById.set(id, n)
      return numbered
    })

  /**
   * Returns the chunk that has the number `n`.
   *
   * @param {number} n - The citation number.
   * @returns {(Object & { n: number }) | undefined} The numbered chunk, or `undefined` for an unknown number.
   */
  const get = (n) => chunkByNumber.get(n)

  return { register, get }
}
