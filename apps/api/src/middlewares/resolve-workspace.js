import HttpError from "../utils/http-error.js"
import * as workspaceModel from "../models/workspaces.js"
import * as workspaceMemberModel from "../models/workspace-members.js"

/** Regex that matches a canonical lowercase UUID v4 string. */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Express middleware that resolves a workspace from the route parameter and loads the
 * authenticated user's permissions for that workspace.
 *
 * Validates that `req.params.workspace_id` is a well-formed UUID (400 if not), loads the
 * workspace record excluding soft-deleted rows (404 if missing), then loads the user's
 * permission names via their active workspace_members role chain (403 if they have no
 * membership). On success, sets `req.workspace` to the workspace object and
 * `req.permissions` to an array of permission name strings for use by downstream
 * `requirePermission` guards.
 *
 * Must be placed after `requireAccessToken` so that `req.user.id` is available.
 *
 * @param {Object} req - Express request object. Expects `req.params.workspace_id` and `req.user.id`.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 * @returns {Promise<void>} Calls next() on success or next(error) with an HttpError on failure.
 */
export const resolveWorkspace = async (req, res, next) => {
  try {
    const { workspace_id } = req.params
    if (!UUID_REGEX.test(workspace_id)) {
      throw new HttpError(400, "Invalid workspace ID format")
    }

    const workspace = await workspaceModel.findOne({ id: workspace_id })
    if (!workspace) throw new HttpError(404, "Workspace not found")

    const permRows = await workspaceMemberModel.getPermissions(req.user.id, workspace_id)
    if (!permRows.length) throw new HttpError(403, "You are not a member of this workspace")

    req.workspace = workspace
    req.permissions = permRows.map((r) => r.name)

    next()
  } catch (error) {
    next(error)
  }
}
