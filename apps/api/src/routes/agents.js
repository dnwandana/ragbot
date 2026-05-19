import { Router } from "express"
import { requirePermission } from "../middlewares/require-permission.js"
import * as agents from "../controllers/agents.js"

const router = Router({ mergeParams: true })

router
  .route("/")
  .get(requirePermission("agent:read"), agents.listAgents)
  .post(requirePermission("agent:create"), agents.createAgent)

router
  .route("/:agent_id")
  .get(requirePermission("agent:read"), agents.getAgent)
  .put(requirePermission("agent:update"), agents.updateAgent)
  .delete(requirePermission("agent:delete"), agents.deleteAgent)

export default router
