/**
 * Roles router — nested under /api/workspaces/:workspace_id/roles.
 *
 * Provides CRUD endpoints for workspace roles. Requires `mergeParams: true` so that
 * `req.params.workspace_id` (set by the parent workspaces router) is available to
 * the resolveWorkspace middleware and downstream controllers.
 *
 * All routes require the caller to hold the corresponding role permission.
 */

import { Router } from "express"
import { requirePermission } from "../middlewares/require-permission.js"
import * as roles from "../controllers/roles.js"

const router = Router({ mergeParams: true })

router
  .route("/")
  .get(requirePermission("role:read"), roles.getRoles)
  .post(requirePermission("role:create"), roles.createRole)

router
  .route("/:role_id")
  .get(requirePermission("role:read"), roles.getRole)
  .put(requirePermission("role:update"), roles.updateRole)
  .delete(requirePermission("role:delete"), roles.deleteRole)

export default router
