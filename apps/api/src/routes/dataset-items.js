import { Router } from "express"
import { requirePermission } from "../middlewares/require-permission.js"
import * as datasetItems from "../controllers/dataset-items.js"

const router = Router({ mergeParams: true })

router.get("/", requirePermission("file:read"), datasetItems.listItems)
router.post("/move", requirePermission("file:update"), datasetItems.moveItems)
router.post("/summary", requirePermission("file:read"), datasetItems.summarizeItems)
router.post("/delete", requirePermission("file:delete"), datasetItems.deleteItems)

export default router
