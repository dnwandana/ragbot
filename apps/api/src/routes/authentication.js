import { Router } from "express"
import { authLimiter } from "../middlewares/rate-limit.js"
import { requireAccessToken, requireRefreshToken } from "../middlewares/authorization.js"
import * as auth from "../controllers/authentication.js"

const router = Router()

router.post("/signup", authLimiter, auth.signup)
router.post("/verify-email", authLimiter, auth.verifyEmail)
router.post("/resend-verification", authLimiter, auth.resendVerification)
router.post("/signin", authLimiter, auth.signin)
router.post("/forgot-password", authLimiter, auth.forgotPassword)
router.post("/reset-password", authLimiter, auth.resetPassword)
router.get("/me", requireAccessToken, authLimiter, auth.getMe)
router.post("/refresh", requireRefreshToken, authLimiter, auth.refreshAccessToken)
router.post("/logout", requireRefreshToken, auth.logout)

export default router
