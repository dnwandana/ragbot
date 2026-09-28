import { Router } from "express"
import { requirePermission } from "../middlewares/require-permission.js"
import { resolveDataset } from "../middlewares/resolve-dataset.js"
import * as datasets from "../controllers/datasets.js"
import datasetFilesRouter from "./dataset-files.js"
import datasetItemsRouter from "./dataset-items.js"
import datasetFoldersRouter from "./dataset-folders.js"

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

router.use("/:dataset_id/files", resolveDataset, datasetFilesRouter)
router.use("/:dataset_id/items", resolveDataset, datasetItemsRouter)
router.use("/:dataset_id/folders", resolveDataset, datasetFoldersRouter)

export default router
