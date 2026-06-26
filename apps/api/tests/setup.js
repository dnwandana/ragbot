import { vi } from "vitest"

// Outbound-timeout env vars consumed by service modules via AbortSignal.timeout(). At runtime
// these are populated by the Joi env schema's defaults; here we mirror those defaults so service
// unit tests work in isolation (validateEnv() does not run in the test worker process).
process.env.OPENROUTER_STREAM_TIMEOUT_MS ??= "60000"
process.env.OPENROUTER_TIMEOUT_MS ??= "30000"
process.env.FIRECRAWL_TIMEOUT_MS ??= "60000"
process.env.LLAMAINDEX_TIMEOUT_MS ??= "30000"
process.env.S3_TIMEOUT_MS ??= "10000"
process.env.OPENROUTER_TRANSCRIBE_TIMEOUT_MS ??= "120000"
process.env.YOUTUBE_AUDIO_SEGMENT_SECONDS ??= "600"
process.env.YOUTUBE_DOWNLOAD_TIMEOUT_MS ??= "600000"
process.env.YOUTUBE_MAX_DURATION_SECONDS ??= "7200"
process.env.YOUTUBE_MAX_FILESIZE ??= "150M"
process.env.WHISPER_MODEL ??= "openai/whisper-large-v3-turbo"

vi.mock("../src/queues/file-processing.js", () => ({
  fileProcessingQueue: {
    add: vi.fn().mockResolvedValue({ id: "mock-job-id" }),
    close: vi.fn().mockResolvedValue(undefined),
  },
  addProcessingJob: vi.fn().mockResolvedValue({ id: "mock-job-id" }),
}))

vi.mock("../src/queues/youtube-processing.js", () => ({
  youtubeProcessingQueue: {
    add: vi.fn().mockResolvedValue({ id: "mock-yt-job-id" }),
    close: vi.fn().mockResolvedValue(undefined),
  },
  addYoutubeJob: vi.fn().mockResolvedValue({ id: "mock-yt-job-id" }),
}))

vi.mock("../src/utils/session-denylist.js", () => ({
  denySession: vi.fn().mockResolvedValue(undefined),
  isSessionDenied: vi.fn().mockResolvedValue(false),
}))

vi.mock("../src/middlewares/rate-limit.js", () => ({
  authLimiter: (req, res, next) => next(),
  generalLimiter: (req, res, next) => next(),
}))
