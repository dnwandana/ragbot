import { Router } from "express"
import * as sessions from "../controllers/sessions.js"

const router = Router()

router.get("/", sessions.listSessions)
router.delete("/", sessions.revokeOtherSessions)
router.delete("/:id", sessions.revokeSession)

export default router
