import db from "../config/database.js"

const TABLE = "workspaces"
const COLUMNS = ["id", "name", "description", "settings", "created_at", "updated_at"]

/**
 * Insert a new workspace record.
 *
 * @param {Object} workspace - Workspace data to insert.
 * @returns {Promise<Object[]>} Array containing the newly created workspace row.
 */
export const create = (workspace) => db.insert(workspace).into(TABLE).returning(COLUMNS)

/**
 * Find a single active workspace matching the given conditions.
 * Excludes soft-deleted rows.
 *
 * @param {Object} conditions - Key-value pairs to match against (e.g., { id }).
 * @returns {Promise<Object|undefined>} The matched workspace or undefined.
 */
export const findOne = (conditions) =>
  db.select(COLUMNS).from(TABLE).where(conditions).whereNull("deleted_at").first()

/**
 * Find all workspaces the given user is an active member of, joined with their role.
 * Excludes soft-deleted workspaces and deleted memberships.
 *
 * @param {string} userId - UUID of the user.
 * @returns {Promise<Object[]>} Array of workspaces with role_id and role_name columns.
 */
export const findManyByUserId = (userId) =>
  db(TABLE)
    .select([
      ...COLUMNS.map((c) => `${TABLE}.${c}`),
      "workspace_members.role_id",
      "roles.name as role_name",
    ])
    .join("workspace_members", function () {
      this.on("workspace_members.workspace_id", "workspaces.id")
        .andOn("workspace_members.user_id", db.raw("?", [userId]))
        .andOnNull("workspace_members.deleted_at")
    })
    .join("roles", "roles.id", "workspace_members.role_id")
    .whereNull("workspaces.deleted_at")
    .where("workspace_members.status", "active")

/**
 * Update workspace rows matching the given conditions.
 * Excludes soft-deleted rows.
 *
 * @param {Object} conditions - Key-value pairs to identify the workspace (e.g., { id }).
 * @param {Object} data - Fields to update (e.g., { name, settings, updated_at }).
 * @returns {Promise<Object[]>} Array of updated workspace rows.
 */
export const update = (conditions, data) =>
  db.update(data).table(TABLE).where(conditions).whereNull("deleted_at").returning(COLUMNS)

/**
 * Soft-delete a workspace by setting deleted_at to the current timestamp.
 * Only affects rows that are not already deleted.
 *
 * @param {string} id - UUID of the workspace to delete.
 * @returns {Promise<number>} Number of affected rows.
 */
export const softDelete = (id) =>
  db.update({ deleted_at: new Date() }).table(TABLE).where({ id }).whereNull("deleted_at")
