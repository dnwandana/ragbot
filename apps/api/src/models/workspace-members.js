import db from "../config/database.js"

const TABLE = "workspace_members"
const COLUMNS = [
  "id",
  "workspace_id",
  "user_id",
  "role_id",
  "status",
  "invited_by",
  "invited_email",
  "joined_at",
  "created_at",
]

/**
 * Insert a new workspace member record.
 *
 * @param {Object} member - Member data to insert.
 * @returns {Promise<Object[]>} Array containing the newly created member row.
 */
export const create = (member) => db.insert(member).into(TABLE).returning(COLUMNS)

/**
 * Find a single active workspace member matching the given conditions.
 * Excludes soft-deleted rows.
 *
 * @param {Object} conditions - Key-value pairs to match against (e.g., { workspace_id, user_id }).
 * @returns {Promise<Object|undefined>} The matched member or undefined.
 */
export const findOne = (conditions) =>
  db.select(COLUMNS).from(TABLE).where(conditions).whereNull("deleted_at").first()

/**
 * Find all active members of a workspace, joined with user and role details.
 * Excludes soft-deleted membership rows.
 *
 * @param {string} workspaceId - UUID of the workspace.
 * @returns {Promise<Object[]>} Array of members with user and role fields, ordered by join date.
 */
export const findManyByWorkspaceId = (workspaceId) =>
  db(TABLE)
    .select([
      `${TABLE}.id`,
      `${TABLE}.status`,
      `${TABLE}.joined_at`,
      "users.id as user_id",
      "users.email",
      "users.full_name",
      "roles.id as role_id",
      "roles.name as role_name",
    ])
    .leftJoin("users", "users.id", `${TABLE}.user_id`)
    .join("roles", "roles.id", `${TABLE}.role_id`)
    .where(`${TABLE}.workspace_id`, workspaceId)
    .whereNull(`${TABLE}.deleted_at`)
    .orderBy(`${TABLE}.joined_at`)

/**
 * Retrieve all permission names granted to a user within a specific workspace.
 * Resolves permissions through the member's active role and role_permissions join.
 *
 * @param {string} userId - UUID of the user.
 * @param {string} workspaceId - UUID of the workspace.
 * @returns {Promise<Object[]>} Array of objects with a `name` field (permission name).
 */
export const getPermissions = (userId, workspaceId) =>
  db("workspace_members")
    .select("permissions.name")
    .join("roles", "roles.id", "workspace_members.role_id")
    .join("role_permissions", "role_permissions.role_id", "roles.id")
    .join("permissions", "permissions.id", "role_permissions.permission_id")
    .where("workspace_members.user_id", userId)
    .where("workspace_members.workspace_id", workspaceId)
    .where("workspace_members.status", "active")
    .whereNull("workspace_members.deleted_at")

/**
 * Count how many active owner-role members exist in a workspace.
 * Used to prevent removing the last owner.
 *
 * @param {string} workspaceId - UUID of the workspace.
 * @returns {Promise<Object>} Object with a `count` field (string from PostgreSQL).
 */
export const countActiveOwners = (workspaceId) =>
  db(TABLE)
    .join("roles", "roles.id", `${TABLE}.role_id`)
    .where(`${TABLE}.workspace_id`, workspaceId)
    .where(`${TABLE}.status`, "active")
    .whereNull(`${TABLE}.deleted_at`)
    .where("roles.name", "owner")
    .count("* as count")
    .first()

/**
 * Update the role_id of a workspace member.
 *
 * @param {string} memberId - UUID of the workspace_members row.
 * @param {string} roleId - UUID of the new role to assign.
 * @returns {Promise<Object[]>} Array containing the updated member row.
 */
export const updateRole = (memberId, roleId) =>
  db(TABLE)
    .where({ id: memberId })
    .update({ role_id: roleId, updated_at: new Date() })
    .returning(COLUMNS)

/**
 * Soft-delete a workspace member by setting deleted_at and updated_at.
 *
 * @param {string} id - UUID of the workspace_members row to soft-delete.
 * @returns {Promise<number>} Number of affected rows.
 */
export const softDelete = (id) =>
  db(TABLE).where({ id }).update({ deleted_at: new Date(), updated_at: new Date() })
