import { Worker } from "bullmq"
import logger from "../utils/logger.js"
import { parseRedisUrl } from "../utils/redis.js"
import * as datasetFileModel from "../models/dataset-files.js"
import * as datasetModel from "../models/datasets.js"
import * as chunkModel from "../models/document-chunks.js"
import * as textSplitter from "../services/text-splitter.js"
import * as openrouterService from "../services/openrouter.js"
import * as questionGenerator from "../services/question-generator.js"
import * as llamaindexService from "../services/llamaindex.js"
import * as firecrawlService from "../services/firecrawl.js"

/**
 * Runs the full RAG processing pipeline for a dataset file.
 *
 * Splits markdown into chunks, generates embeddings in batches via OpenRouter,
 * deletes any existing chunks for the file, persists new chunks to document_chunks,
 * generates exploration questions, and updates the file status to 'completed'.
 * Preserves existing file metadata (e.g. llamaindex_job_id, source_url) for reprocessing.
 * Throws on any failure so BullMQ can retry the parent job.
 *
 * @param {Object} params
 * @param {string} params.datasetFileId - UUID of the dataset_files record
 * @param {string} params.markdownContent - Parsed markdown content to process
 * @param {Object} params.dataset - Dataset record with chunk_size, chunk_overlap, embedding_model
 * @param {Object} params.metadata - Existing file metadata to preserve (e.g. llamaindex_job_id, source_url)
 * @returns {Promise<void>}
 * @throws {Error} If text splitting, embedding, DB write, or question generation fails
 */
const runProcessingPipeline = async ({ datasetFileId, markdownContent, dataset, metadata }) => {
  const chunks = await textSplitter.splitText(
    markdownContent,
    dataset.chunk_size,
    dataset.chunk_overlap,
  )

  if (!chunks.length) {
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

  await datasetFileModel.update(datasetFileId, {
    status: "completed",
    chunk_count: chunks.length,
    metadata: JSON.stringify({ ...metadata, exploration_questions: questions }),
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

  await runProcessingPipeline({ datasetFileId, markdownContent: markdown, dataset, metadata })
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

  worker.on("failed", async (job, err) => {
    logger.error("File processing job failed", {
      jobId: job?.id,
      datasetFileId: job?.data?.datasetFileId,
      attempt: job?.attemptsMade,
      error: err.message,
    })
    if (job && job.attemptsMade >= (job.opts.attempts ?? 1)) {
      await datasetFileModel.update(job.data.datasetFileId, {
        status: "failed",
        error_message: err.message.slice(0, 500),
        updated_at: new Date(),
      })
    }
  })

  return worker
}
