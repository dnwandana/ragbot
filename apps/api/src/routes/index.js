import { Router } from "express"
import { requireAccessToken } from "../middlewares/authorization.js"
import authRoutes from "./authentication.js"
import permissionsRoutes from "./permissions.js"
import workspacesRoutes from "./workspaces.js"
import invitationsRoutes from "./workspace-invitations.js"

const router = Router()

// Note: /health is mounted separately in app.js before the /api prefix — do not add it here.
// Note: this router is mounted at /api in app.js, so paths here must NOT include /api.
router.use("/auth", authRoutes)
router.use("/permissions", requireAccessToken, permissionsRoutes)
router.use("/invitations", invitationsRoutes)
router.use("/workspaces", requireAccessToken, workspacesRoutes)

export default router
