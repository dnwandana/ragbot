import { Router } from "express"
import { requirePermission } from "../middlewares/require-permission.js"
import * as datasetFolders from "../controllers/dataset-folders.js"

const router = Router({ mergeParams: true })

router.get("/", requirePermission("file:read"), datasetFolders.listFolders)
router.post("/", requirePermission("file:upload"), datasetFolders.createFolder)
router.post("/ensure-paths", requirePermission("file:upload"), datasetFolders.ensurePaths)
router.put("/:folder_id", requirePermission("file:update"), datasetFolders.renameFolder)

export default router
