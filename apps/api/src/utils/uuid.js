/** Matches a canonical UUID string. The check ignores case. */
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Returns true when the value is a UUID string.
 *
 * @param {unknown} value - Value to check
 * @returns {boolean} True for a UUID string
 */
export const isUuid = (value) => typeof value === "string" && UUID_REGEX.test(value)
