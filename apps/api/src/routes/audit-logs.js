/**
 * Audit logs router — nested under /api/workspaces/:workspace_id/audit-logs.
 *
 * Exposes a single read-only endpoint for listing paginated audit log entries scoped to
 * a workspace. Requires `mergeParams: true` so that `req.params.workspace_id` (set by
 * the parent workspaces router) is accessible to the resolveWorkspace middleware and
 * downstream controllers.
 *
 * All routes require the caller to hold the `audit:read` permission.
 */

import { Router } from "express"
import { requirePermission } from "../middlewares/require-permission.js"
import * as auditLogs from "../controllers/audit-logs.js"

const router = Router({ mergeParams: true })

router.get("/", requirePermission("audit:read"), auditLogs.listAuditLogs)

export default router
