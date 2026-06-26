import { Worker } from "bullmq"
import logger from "../utils/logger.js"
import { parseRedisUrl } from "../utils/redis.js"
import * as datasetFileModel from "../models/dataset-files.js"
import * as datasetModel from "../models/datasets.js"
import * as youtubeService from "../services/youtube.js"
import { runProcessingPipeline } from "../services/processing-pipeline.js"

/**
 * BullMQ job processor for the youtube-processing queue.
 *
 * Loads the dataset file + dataset, resolves the transcript from the canonical URL in
 * metadata (manual captions or Whisper), enriches the file metadata with the resolved
 * title/source/language, and runs the shared processing pipeline on the transcript
 * markdown. Throws on failure so BullMQ retries with exponential backoff.
 *
 * @param {import('bullmq').Job<{ datasetFileId: string, datasetId: string }>} job - BullMQ job
 * @returns {Promise<void>}
 * @throws {Error} If file/dataset missing, the file is not a YouTube source, or processing fails
 */
export const processYoutubeJob = async (job) => {
  const { datasetFileId, datasetId } = job.data

  const [file, dataset] = await Promise.all([
    datasetFileModel.findOne({ id: datasetFileId }),
    datasetModel.findOne({ id: datasetId }),
  ])

  if (!file) throw new Error(`Dataset file ${datasetFileId} not found`)
  if (!dataset) throw new Error(`Dataset ${datasetId} not found`)

  const metadata =
    typeof file.metadata === "string" ? JSON.parse(file.metadata) : (file.metadata ?? {})
  if (metadata.source_type !== "youtube" || !metadata.canonical_url) {
    throw new Error(`File ${datasetFileId} is not a YouTube source`)
  }

  const { text, title, transcriptSource, language } = await youtubeService.getTranscript(
    metadata.canonical_url,
  )

  await datasetFileModel.update(datasetFileId, {
    filename: title.trim().slice(0, 255) || metadata.source_url,
    metadata: JSON.stringify({
      ...metadata,
      title,
      transcript_source: transcriptSource,
      language,
    }),
    updated_at: new Date(),
  })

  const markdown = `# ${title}\n\nSource: ${metadata.source_url}\n\n${text}`
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
export const handleYoutubeFailedJob = async (job, err) => {
  logger.error("YouTube processing job failed", {
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
 * Creates and starts the inline BullMQ worker for the youtube-processing queue.
 *
 * Concurrency is read from YOUTUBE_WORKER_CONCURRENCY (default 1) to keep long
 * transcription jobs from saturating CPU. The returned worker must be closed on
 * process shutdown via worker.close().
 *
 * @returns {import('bullmq').Worker} The started BullMQ worker instance
 */
export const startYoutubeWorker = () => {
  const worker = new Worker("youtube-processing", processYoutubeJob, {
    connection: { ...parseRedisUrl(process.env.REDIS_URL), maxRetriesPerRequest: null },
    concurrency: Number(process.env.YOUTUBE_WORKER_CONCURRENCY) || 1,
  })

  worker.on("completed", (job) => {
    logger.info("YouTube processing job completed", {
      jobId: job.id,
      datasetFileId: job.data.datasetFileId,
    })
  })

  worker.on("failed", handleYoutubeFailedJob)

  worker.on("error", (err) => {
    logger.error("YouTube processing worker error", { error: err.message })
  })

  return worker
}
