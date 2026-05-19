import HttpError from "../utils/http-error.js"
import apiResponse from "../utils/response.js"
import * as datasetFileModel from "../models/dataset-files.js"
import { addProcessingJob } from "../queues/file-processing.js"

/**
 * POST /api/webhooks/llamaindex/callback — Handle LlamaIndex v2 async parse callback.
 *
 * Locates the dataset file by the LlamaIndex job ID stored in metadata and
 * enqueues a BullMQ processing job on parse.success. On parse.error, updates
 * the file record directly. Returns 200 for unknown job IDs to prevent LlamaIndex
 * retry storms. No HMAC verification — the job ID UUID is unguessable and all
 * content is fetched from LlamaIndex directly using the server's own API key,
 * so a forged webhook cannot inject content.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {Promise<void>}
 */
export const handleLlamaIndexCallback = async (req, res, next) => {
  try {
    const payload = req.body
    const jobId = payload?.data?.id || payload?.data?.job_id
    if (!jobId) throw new HttpError(400, "Missing job ID in webhook payload")

    const file = await datasetFileModel.findByMetaJobId(jobId)
    if (!file) {
      return res.json(apiResponse({ message: "OK", data: null }))
    }

    const eventType = payload?.event_type

    if (eventType === "parse.success") {
      await addProcessingJob({ datasetFileId: file.id, datasetId: file.dataset_id })
    } else if (eventType === "parse.error") {
      await datasetFileModel.update(file.id, {
        status: "failed",
        error_message: "LlamaIndex parsing failed",
        updated_at: new Date(),
      })
    }

    return res.json(apiResponse({ message: "OK", data: null }))
  } catch (error) {
    return next(error)
  }
}
