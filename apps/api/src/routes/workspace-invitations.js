import { Router } from "express"
import { requireAccessToken } from "../middlewares/authorization.js"
import * as members from "../controllers/members.js"

const router = Router()

router.get("/:token", members.previewInvitation)
router.post("/accept", requireAccessToken, members.acceptInvitation)

export default router
