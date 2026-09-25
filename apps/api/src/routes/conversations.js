import { Router } from "express"
import { requirePermission } from "../middlewares/require-permission.js"
import * as conversations from "../controllers/conversations.js"
import * as chat from "../controllers/chat.js"
import * as shares from "../controllers/conversation-shares.js"

const router = Router({ mergeParams: true })

router
  .route("/")
  .get(requirePermission("conversation:read"), conversations.listConversations)
  .post(requirePermission("conversation:create"), conversations.createConversation)

router
  .route("/:conversation_id")
  .get(requirePermission("conversation:read"), conversations.getConversation)
  .put(requirePermission("conversation:update"), conversations.updateConversation)
  .delete(requirePermission("conversation:delete"), conversations.deleteConversation)

router.post("/:conversation_id/messages", requirePermission("conversation:chat"), chat.sendMessage)

router
  .route("/:conversation_id/share")
  .get(requirePermission("conversation:read"), shares.getShare)
  .post(requirePermission("conversation:share"), shares.createShare)
  .put(requirePermission("conversation:share"), shares.updateShare)
  .delete(requirePermission("conversation:share"), shares.revokeShare)

router.get(
  "/:conversation_id/export",
  requirePermission("conversation:read"),
  shares.exportConversation,
)

export default router
