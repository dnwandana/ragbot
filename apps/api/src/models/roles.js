import db from "../config/database.js"

const TABLE = "roles"
const COLUMNS = [
  "id",
  "workspace_id",
  "name",
  "description",
  "is_system",
  "created_at",
  "updated_at",
]

/**
 * Insert a new role into the database.
 *
 * @param {Object} role - Role data to insert
 * @param {string} role.workspace_id - UUID of the workspace this role belongs to
 * @param {string} role.name - Role name (e.g., "admin", "member")
 * @param {string} [role.description] - Role description
 * @param {boolean} [role.is_system] - Whether this is a system-defined role
 * @returns {Promise<Object[]>} Array containing the newly created role
 */
export const create = (role) => db.insert(role).into(TABLE).returning(COLUMNS)

/**
 * Find a single role matching the given conditions.
 *
 * @param {Object} conditions - Key-value pairs to match against (e.g., { id, workspace_id })
 * @returns {Promise<Object|undefined>} The matched role or undefined
 */
export const findOne = (conditions) => db.select(COLUMNS).from(TABLE).where(conditions).first()

/**
 * Find all roles matching the given conditions, ordered by system roles first then by name.
 *
 * @param {Object} conditions - Key-value pairs to filter by (e.g., { workspace_id })
 * @returns {Promise<Object[]>} Array of matched roles
 */
export const findMany = (conditions) =>
  db.select(COLUMNS).from(TABLE).where(conditions).orderBy("is_system", "desc").orderBy("name")

/**
 * Update a role matching the given conditions.
 *
 * @param {Object} conditions - Key-value pairs to identify the role
 * @param {Object} data - Fields to update (e.g., { name, description })
 * @returns {Promise<Object[]>} Array containing the updated role
 */
export const update = (conditions, data) =>
  db.update(data).table(TABLE).where(conditions).returning(COLUMNS)

/**
 * Delete a role matching the given conditions.
 *
 * @param {Object} conditions - Key-value pairs to identify the role
 * @returns {Promise<number>} Number of rows deleted
 */
export const remove = (conditions) => db.delete().from(TABLE).where(conditions)

/**
 * Find all permissions assigned to a role by joining role_permissions and permissions.
 *
 * @param {string} roleId - UUID of the role
 * @returns {Promise<Object[]>} Array of permissions with id, name, resource, and action
 */
export const findPermissionsByRoleId = (roleId) =>
  db("permissions")
    .select(["permissions.id", "permissions.name", "permissions.resource", "permissions.action"])
    .join("role_permissions", "role_permissions.permission_id", "permissions.id")
    .where("role_permissions.role_id", roleId)

/**
 * Replace all permissions for a role within the given transaction.
 * Deletes existing role_permissions rows, then bulk-inserts the new set.
 * Handles the case where permissionIds is empty (removes all permissions).
 *
 * @param {import('knex').Knex.Transaction} trx - Active Knex transaction
 * @param {string} roleId - UUID of the role
 * @param {string[]} permissionIds - Array of permission UUIDs to assign
 * @returns {Promise<void>}
 */
export const setPermissions = (trx, roleId, permissionIds) =>
  trx("role_permissions")
    .where({ role_id: roleId })
    .delete()
    .then(() => {
      if (!permissionIds.length) return
      return trx("role_permissions").insert(
        permissionIds.map((pid) => ({ role_id: roleId, permission_id: pid })),
      )
    })
