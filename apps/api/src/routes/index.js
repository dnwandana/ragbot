import { Router } from "express"
import { requireAccessToken } from "../middlewares/authorization.js"
import authRoutes from "./authentication.js"
import permissionsRoutes from "./permissions.js"

const router = Router()

router.use("/auth", authRoutes)
router.use("/permissions", requireAccessToken, permissionsRoutes)

export default router
