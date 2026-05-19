import { Router } from "express"
import { requirePermission } from "../middlewares/require-permission.js"
import { resolveWorkspace } from "../middlewares/resolve-workspace.js"
import * as workspaces from "../controllers/workspaces.js"
import rolesRouter from "./roles.js"
import membersRouter from "./workspace-members.js"
import auditLogsRouter from "./audit-logs.js"
import datasetsRouter from "./datasets.js"

const router = Router()

router.route("/").get(workspaces.getWorkspaces).post(workspaces.createWorkspace)

router.use("/:workspace_id", resolveWorkspace)
router.get("/:workspace_id", requirePermission("workspace:read"), workspaces.getWorkspace)
router.put("/:workspace_id", requirePermission("workspace:update"), workspaces.updateWorkspace)
router.delete("/:workspace_id", requirePermission("workspace:delete"), workspaces.deleteWorkspace)

router.use("/:workspace_id/roles", rolesRouter)
router.use("/:workspace_id/members", membersRouter)
router.use("/:workspace_id/audit-logs", auditLogsRouter)
router.use("/:workspace_id/datasets", datasetsRouter)

export default router
