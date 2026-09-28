/**
 * Returns true when a PostgreSQL error is a unique violation (SQLSTATE 23505).
 *
 * @param {unknown} err - Error from the pg driver
 * @param {string} [constraint] - Constraint or index name that must match, if given
 * @returns {boolean} True for a matching unique violation
 */
export const isUniqueViolation = (err, constraint) =>
  err?.code === "23505" && (!constraint || err.constraint === constraint)
