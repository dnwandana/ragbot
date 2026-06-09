/**
 * Total item count from an API pagination meta, falling back when the field
 * (or the whole meta object) is absent.
 *
 * @param {object|null|undefined} pagination - API pagination metadata (the `pagination` object from a list response)
 * @param {number} [fallback=0] - Value to use when total_items is unavailable
 * @returns {number} The total item count
 */
export function totalItems(pagination, fallback = 0) {
  return pagination?.total_items ?? fallback
}
