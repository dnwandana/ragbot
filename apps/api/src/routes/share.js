import { Router } from "express"
import { shareLimiter } from "../middlewares/rate-limit.js"
import * as shares from "../controllers/conversation-shares.js"

const router = Router()

// Public. Mounted outside requireAccessToken in routes/index.js.
router.get("/:id", shareLimiter, shares.getPublicShare)

export default router
