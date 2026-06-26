import { Queue } from "bullmq"
import { parseRedisUrl } from "../utils/redis.js"

/** BullMQ Queue instance for async YouTube transcript processing jobs. */
export const youtubeProcessingQueue = new Queue("youtube-processing", {
  connection: parseRedisUrl(process.env.REDIS_URL),
})

/** Default job options: 3 attempts with exponential backoff, capped retention. */
const JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: "exponential", delay: 5000 },
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 500 },
}

/**
 * Enqueues a YouTube processing job for the given dataset file.
 *
 * The worker resolves the canonical URL from the file's DB metadata, so no content
 * is stored in the job payload — only IDs are passed.
 *
 * @param {Object} params
 * @param {string} params.datasetFileId - UUID of the dataset_files record to process
 * @param {string} params.datasetId - UUID of the parent datasets record
 * @returns {Promise<import('bullmq').Job>} The created BullMQ job
 */
export const addYoutubeJob = ({ datasetFileId, datasetId }) =>
  youtubeProcessingQueue.add("process-youtube", { datasetFileId, datasetId }, JOB_OPTIONS)
