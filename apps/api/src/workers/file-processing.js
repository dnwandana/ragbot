import { Worker } from "bullmq"
import logger from "../utils/logger.js"
import { parseRedisUrl } from "../utils/redis.js"
import * as datasetFileModel from "../models/dataset-files.js"
import * as datasetModel from "../models/datasets.js"
import * as llamaindexService from "../services/llamaindex.js"
import * as firecrawlService from "../services/firecrawl.js"
import { runProcessingPipeline } from "../services/processing-pipeline.js"
import { profileTabularFile } from "../services/tabular/profile.js"

export { runProcessingPipeline } from "../services/processing-pipeline.js"

/**
 * BullMQ job processor for the file-processing queue.
 *
 * Loads the dataset file and dataset from DB in parallel, resolves the markdown
 * source from file metadata (tabular profile, LlamaIndex job ID, or Firecrawl source
 * URL), and runs the processing pipeline. A tabular file is profiled in the sandbox
 * and the profile is stored in metadata before the pipeline embeds its markdown.
 * Throws on failure so BullMQ retries with exponential backoff.
 *
 * @param {import('bullmq').Job<{ datasetFileId: string, datasetId: string }>} job - BullMQ job
 * @returns {Promise<void>} Resolves without work when the file is missing or deleted
 * @throws {Error} If the dataset is not found, no source in metadata, or pipeline fails
 */
export const processJob = async (job) => {
  const { datasetFileId, datasetId } = job.data

  const [file, dataset] = await Promise.all([
    datasetFileModel.findOne({ id: datasetFileId }),
    datasetModel.findOne({ id: datasetId }),
  ])

  if (!dataset) throw new Error(`Dataset ${datasetId} not found`)
  if (!file) {
    // A deleted file has no work left. A throw would only cause useless retries.
    logger.info("Skipped a job for a deleted dataset file", { datasetFileId })
    return
  }

  const metadata =
    typeof file.metadata === "string" ? JSON.parse(file.metadata) : (file.metadata ?? {})

  if (metadata.source_type === "tabular") {
    const { profile, markdown } = await profileTabularFile(file)
    await datasetFileModel.update(datasetFileId, {
      metadata: JSON.stringify({ ...metadata, profile }),
      updated_at: new Date(),
    })
    return runProcessingPipeline({ datasetFileId, markdownContent: markdown, dataset })
  }

  let markdown
  if (metadata.llamaindex_job_id) {
    markdown = await llamaindexService.pollForMarkdown(metadata.llamaindex_job_id, {
      timeoutMs: 300_000,
    })
  } else if (metadata.source_url) {
    markdown = await firecrawlService.scrapeUrl(metadata.source_url)
  } else {
    throw new Error(`No processing source found in metadata for file ${datasetFileId}`)
  }

  await runProcessingPipeline({ datasetFileId, markdownContent: markdown, dataset })
}

/**
 * Handles a BullMQ 'failed' event: logs it, and after the final retry marks the
 * dataset file 'failed'. Wrapped so a transient DB error here can never become an
 * unhandled rejection (BullMQ does not await event listeners).
 *
 * @param {import('bullmq').Job} job - The failed job (may be undefined on some errors)
 * @param {Error} err - The failure error
 * @returns {Promise<void>}
 */
export const handleFailedJob = async (job, err) => {
  logger.error("File processing job failed", {
    jobId: job?.id,
    datasetFileId: job?.data?.datasetFileId,
    attempt: job?.attemptsMade,
    error: err.message,
  })
  if (job && job.attemptsMade >= (job.opts.attempts ?? 1)) {
    try {
      await datasetFileModel.update(job.data.datasetFileId, {
        status: "failed",
        error_message: err.message.slice(0, 500),
        updated_at: new Date(),
      })
    } catch (updateErr) {
      logger.error("Failed to mark dataset file as failed", {
        datasetFileId: job.data.datasetFileId,
        error: updateErr.message,
      })
    }
  }
}

/**
 * Creates and starts the inline BullMQ worker for the file-processing queue.
 *
 * Registers completed and failed event handlers. The failed handler updates
 * dataset_files status to 'failed' only after all retry attempts are exhausted.
 * The returned worker must be closed on process shutdown via worker.close().
 *
 * @returns {import('bullmq').Worker} The started BullMQ worker instance
 */
export const startWorker = () => {
  const worker = new Worker("file-processing", processJob, {
    connection: { ...parseRedisUrl(process.env.REDIS_URL), maxRetriesPerRequest: null },
    concurrency: 2,
  })

  worker.on("completed", (job) => {
    logger.info("File processing job completed", {
      jobId: job.id,
      datasetFileId: job.data.datasetFileId,
    })
  })

  worker.on("failed", handleFailedJob)

  worker.on("error", (err) => {
    logger.error("File processing worker error", { error: err.message })
  })

  return worker
}
