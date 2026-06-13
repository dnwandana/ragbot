import { Router } from "express"
import { requirePermission } from "../middlewares/require-permission.js"
import * as datasets from "../controllers/datasets.js"
import datasetFilesRouter from "./dataset-files.js"

const router = Router({ mergeParams: true })

router
  .route("/")
  .get(requirePermission("dataset:read"), datasets.listDatasets)
  .post(requirePermission("dataset:create"), datasets.createDataset)

router
  .route("/:dataset_id")
  .get(requirePermission("dataset:read"), datasets.getDataset)
  .put(requirePermission("dataset:update"), datasets.updateDataset)
  .delete(requirePermission("dataset:delete"), datasets.deleteDataset)

router.get("/:dataset_id/questions", requirePermission("file:read"), datasets.listDatasetQuestions)

router.post(
  "/:dataset_id/conversations",
  requirePermission("conversation:create"),
  datasets.createConversationFromDataset,
)

router.use("/:dataset_id/files", datasetFilesRouter)

export default router
