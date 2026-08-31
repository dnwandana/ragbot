import { Router } from "express"
import * as twoFactor from "../controllers/two-factor.js"

const router = Router()

router.get("/", twoFactor.getStatus)
router.post("/setup", twoFactor.setup)
router.post("/activate", twoFactor.activate)
router.post("/disable", twoFactor.disable)
router.post("/backup-codes/regenerate", twoFactor.regenerateBackupCodes)

export default router
