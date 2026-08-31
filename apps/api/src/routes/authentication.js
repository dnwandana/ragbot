import { Router } from "express"
import { authLimiter } from "../middlewares/rate-limit.js"
import {
  requireAccessToken,
  requireRefreshToken,
  requireChallengeToken,
} from "../middlewares/authorization.js"
import * as auth from "../controllers/authentication.js"
import sessionsRoutes from "./sessions.js"
import twoFactorRoutes from "./two-factor.js"

const router = Router()

router.post("/signup", authLimiter, auth.signup)
router.post("/verify-email", authLimiter, auth.verifyEmail)
router.post("/resend-verification", authLimiter, auth.resendVerification)
router.post("/signin", authLimiter, auth.signin)
router.post("/signin/2fa", authLimiter, requireChallengeToken, auth.verifySigninTwoFactor)
router.post("/signin/2fa/email", authLimiter, requireChallengeToken, auth.requestSigninEmailCode)
router.post("/forgot-password", authLimiter, auth.forgotPassword)
router.post("/reset-password", authLimiter, auth.resetPassword)
router.get("/me", requireAccessToken, authLimiter, auth.getMe)
router.put("/profile", requireAccessToken, authLimiter, auth.updateProfile)
router.delete("/profile", requireAccessToken, authLimiter, auth.deleteProfile)
router.put("/password", requireAccessToken, authLimiter, auth.changePassword)
router.post("/refresh", requireRefreshToken, authLimiter, auth.refreshAccessToken)
router.post("/logout", requireRefreshToken, auth.logout)
router.use("/sessions", requireAccessToken, authLimiter, sessionsRoutes)
router.use("/2fa", requireAccessToken, authLimiter, twoFactorRoutes)

export default router
