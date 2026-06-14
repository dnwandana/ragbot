import { Worker } from "bullmq"
import logger from "../utils/logger.js"
import { parseRedisUrl } from "../utils/redis.js"
import * as datasetFileModel from "../models/dataset-files.js"
import * as datasetModel from "../models/datasets.js"
import * as chunkModel from "../models/dataset-file-chunks.js"
import * as textSplitter from "../services/text-splitter.js"
import * as openrouterService from "../services/openrouter.js"
import * as questionGenerator from "../services/question-generator.js"
import * as questionModel from "../models/dataset-file-questions.js"
import * as llamaindexService from "../services/llamaindex.js"
import * as firecrawlService from "../services/firecrawl.js"

/**
 * Runs the full RAG processing pipeline for a dataset file.
 *
 * Splits markdown into chunks, generates embeddings in batches via OpenRouter,
 * replaces the file's dataset_file_chunks, generates exploration questions and stores
 * them in dataset_file_questions (replacing any prior questions), and marks the file
 * 'completed'. File metadata (llamaindex_job_id / source_url) is left untouched.
 * Throws on any failure so BullMQ can retry the parent job.
 *
 * @param {Object} params
 * @param {string} params.datasetFileId - UUID of the dataset_files record
 * @param {string} params.markdownContent - Parsed markdown content to process
 * @param {Object} params.dataset - Dataset record with chunk_size, chunk_overlap, embedding_model
 * @returns {Promise<void>}
 * @throws {Error} If text splitting, embedding, DB write, or question generation fails
 */
export const runProcessingPipeline = async ({ datasetFileId, markdownContent, dataset }) => {
  const chunks = await textSplitter.splitText(
    markdownContent,
    dataset.chunk_size,
    dataset.chunk_overlap,
  )

  if (!chunks.length) {
    await chunkModel.deleteByFileId(datasetFileId)
    await questionModel.deleteByFileId(datasetFileId)
    await datasetFileModel.update(datasetFileId, {
      status: "completed",
      chunk_count: 0,
      updated_at: new Date(),
    })
    return
  }

  const embeddings = await openrouterService.embedBatch(chunks, dataset.embedding_model)

  await chunkModel.deleteByFileId(datasetFileId)
  await chunkModel.bulkInsert(
    chunks.map((content, i) => ({
      id: crypto.randomUUID(),
      dataset_file_id: datasetFileId,
      content,
      chunk_index: i,
      embedding: embeddings[i],
    })),
  )

  const questions = await questionGenerator.generateQuestions(markdownContent)
  await questionModel.deleteByFileId(datasetFileId)
  await questionModel.bulkInsert(
    questions.map((question) => ({
      id: crypto.randomUUID(),
      dataset_file_id: datasetFileId,
      question,
    })),
  )

  await datasetFileModel.update(datasetFileId, {
    status: "completed",
    chunk_count: chunks.length,
    updated_at: new Date(),
  })
}

/**
 * BullMQ job processor for the file-processing queue.
 *
 * Loads the dataset file and dataset from DB in parallel, resolves the markdown
 * source from file metadata (LlamaIndex job ID or Firecrawl source URL), and runs
 * the processing pipeline. Throws on failure so BullMQ retries with exponential backoff.
 *
 * @param {import('bullmq').Job<{ datasetFileId: string, datasetId: string }>} job - BullMQ job
 * @returns {Promise<void>}
 * @throws {Error} If file or dataset not found, no source in metadata, or pipeline fails
 */
const processJob = async (job) => {
  const { datasetFileId, datasetId } = job.data

  const [file, dataset] = await Promise.all([
    datasetFileModel.findOne({ id: datasetFileId }),
    datasetModel.findOne({ id: datasetId }),
  ])

  if (!file) throw new Error(`Dataset file ${datasetFileId} not found`)
  if (!dataset) throw new Error(`Dataset ${datasetId} not found`)

  const metadata =
    typeof file.metadata === "string" ? JSON.parse(file.metadata) : (file.metadata ?? {})

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
