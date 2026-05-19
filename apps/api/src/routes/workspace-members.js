import { Router } from "express"
import { requirePermission } from "../middlewares/require-permission.js"
import * as members from "../controllers/members.js"

const router = Router({ mergeParams: true })

router.get("/", requirePermission("member:read"), members.listMembers)
router.get("/:member_id", requirePermission("member:read"), members.getMember)
router.post("/invite", requirePermission("member:invite"), members.inviteMember)
router.put("/:member_id/role", requirePermission("member:manage_role"), members.changeRole)
router.delete("/:member_id", requirePermission("member:remove"), members.removeMember)

export default router
