import { Router } from "express"
import { requirePermission } from "../middlewares/require-permission.js"
import * as datasetFiles from "../controllers/dataset-files.js"

const router = Router({ mergeParams: true })

router.post(
  "/upload",
  requirePermission("file:upload"),
  datasetFiles.upload.single("file"),
  datasetFiles.uploadFile,
)
router.post("/scrape-url", requirePermission("file:upload"), datasetFiles.scrapeUrl)
router.post("/youtube", requirePermission("file:upload"), datasetFiles.addYouTube)
router.get("/", requirePermission("file:read"), datasetFiles.listFiles)
router.get("/:file_id", requirePermission("file:read"), datasetFiles.getFile)
router.get("/:file_id/questions", requirePermission("file:read"), datasetFiles.listFileQuestions)
router.get("/:file_id/chunks", requirePermission("file:read"), datasetFiles.listFileChunks)
router.put("/:file_id", requirePermission("file:update"), datasetFiles.updateFile)
router.delete("/:file_id", requirePermission("file:delete"), datasetFiles.deleteFile)
router.post("/:file_id/reprocess", requirePermission("file:reprocess"), datasetFiles.reprocessFile)

export default router
