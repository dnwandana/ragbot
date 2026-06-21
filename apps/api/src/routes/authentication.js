import { Router } from "express"
import { authLimiter } from "../middlewares/rate-limit.js"
import { requireAccessToken, requireRefreshToken } from "../middlewares/authorization.js"
import * as auth from "../controllers/authentication.js"
import sessionsRoutes from "./sessions.js"

const router = Router()

router.post("/signup", authLimiter, auth.signup)
router.post("/verify-email", authLimiter, auth.verifyEmail)
router.post("/resend-verification", authLimiter, auth.resendVerification)
router.post("/signin", authLimiter, auth.signin)
router.post("/forgot-password", authLimiter, auth.forgotPassword)
router.post("/reset-password", authLimiter, auth.resetPassword)
router.get("/me", requireAccessToken, authLimiter, auth.getMe)
router.put("/profile", requireAccessToken, authLimiter, auth.updateProfile)
router.delete("/profile", requireAccessToken, authLimiter, auth.deleteProfile)
router.put("/password", requireAccessToken, authLimiter, auth.changePassword)
router.post("/refresh", requireRefreshToken, authLimiter, auth.refreshAccessToken)
router.post("/logout", requireRefreshToken, auth.logout)
router.use("/sessions", requireAccessToken, authLimiter, sessionsRoutes)

export default router
