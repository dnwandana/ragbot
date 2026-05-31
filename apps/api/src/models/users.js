import db from "../config/database.js"

const TABLE = "users"
const COLUMNS = [
  "id",
  "email",
  "full_name",
  "timezone",
  "email_verified",
  "last_login_at",
  "settings",
  "created_at",
  "updated_at",
]

/**
 * Creates a new user record.
 *
 * @param {Object} user - User data to insert.
 * @returns {Promise<Object[]>} Array containing the created user row (selected columns).
 */
export const create = (user) => db.insert(user).into(TABLE).returning(COLUMNS)

/**
 * Finds a single user matching the given conditions (excluding soft-deleted).
 *
 * @param {Object} conditions - Knex where conditions (e.g., { email }).
 * @returns {Promise<Object|undefined>} The matching user row, or undefined.
 */
export const findOne = (conditions) =>
  db.select(COLUMNS).from(TABLE).where(conditions).whereNull("deleted_at").first()

/**
 * Finds a single user including the password_hash column (for authentication).
 *
 * @param {Object} conditions - Knex where conditions (e.g., { email }).
 * @returns {Promise<Object|undefined>} The matching user row with password_hash, or undefined.
 */
export const findOneWithPassword = (conditions) =>
  db
    .select([...COLUMNS, "password_hash", "failed_login_attempts", "locked_until"])
    .from(TABLE)
    .where(conditions)
    .whereNull("deleted_at")
    .first()

/**
 * Updates user rows matching the given conditions.
 *
 * @param {Object} conditions - Knex where conditions (e.g., { id }).
 * @param {Object} data - Fields to update.
 * @returns {Promise<Object[]>} Array of updated user rows (selected columns).
 */
export const update = (conditions, data) =>
  db.update(data).table(TABLE).where(conditions).returning(COLUMNS)

/**
 * Soft-deletes a user by setting deleted_at to the current timestamp.
 *
 * @param {string} id - The user UUID.
 * @returns {Promise<number>} Number of affected rows.
 */
export const softDelete = (id) => db.update({ deleted_at: new Date() }).table(TABLE).where({ id })

/**
 * Atomically increments failed_login_attempts for a user.
 * Returns the updated row with the new count.
 *
 * @param {string} userId - UUID of the user.
 * @returns {Promise<Object[]>} Array with the updated row containing failed_login_attempts.
 */
export const incrementFailedAttempts = (userId) =>
  db("users")
    .where({ id: userId })
    .update({ failed_login_attempts: db.raw("failed_login_attempts + 1") })
    .returning("failed_login_attempts")

/**
 * Locks a user account until the given timestamp.
 * Resets failed_login_attempts to 0 at the same time.
 *
 * @param {string} userId - UUID of the user.
 * @param {Date} lockedUntil - Timestamp until which the account is locked.
 * @returns {Promise<number>} Number of affected rows.
 */
export const lockAccount = (userId, lockedUntil) =>
  db(TABLE)
    .where({ id: userId })
    .update({ failed_login_attempts: 0, locked_until: lockedUntil, updated_at: new Date() })

/**
 * Resets login failure state after a successful signin.
 * Clears failed_login_attempts and locked_until, sets last_login_at to now.
 *
 * @param {string} userId - UUID of the user.
 * @returns {Promise<number>} Number of affected rows.
 */
export const resetLoginState = (userId) =>
  db(TABLE).where({ id: userId }).update({
    failed_login_attempts: 0,
    locked_until: null,
    last_login_at: new Date(),
    updated_at: new Date(),
  })
