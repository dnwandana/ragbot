import { Router } from "express"
import { requirePermission } from "../middlewares/require-permission.js"
import * as conversations from "../controllers/conversations.js"
import * as chat from "../controllers/chat.js"

const router = Router({ mergeParams: true })

router
  .route("/")
  .get(requirePermission("conversation:read"), conversations.listConversations)
  .post(requirePermission("conversation:create"), conversations.createConversation)

router
  .route("/:conversation_id")
  .get(requirePermission("conversation:read"), conversations.getConversation)
  .patch(requirePermission("conversation:update"), conversations.updateConversation)
  .delete(requirePermission("conversation:delete"), conversations.deleteConversation)

router.post("/:conversation_id/messages", requirePermission("conversation:chat"), chat.sendMessage)

export default router
