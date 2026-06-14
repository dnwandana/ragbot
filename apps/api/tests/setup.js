import { vi } from "vitest"

// Outbound-timeout env vars consumed by service modules via AbortSignal.timeout(). At runtime
// these are populated by the Joi env schema's defaults; here we mirror those defaults so service
// unit tests work in isolation (validateEnv() does not run in the test worker process).
process.env.OPENROUTER_STREAM_TIMEOUT_MS ??= "60000"
process.env.OPENROUTER_TIMEOUT_MS ??= "30000"
process.env.FIRECRAWL_TIMEOUT_MS ??= "60000"
process.env.LLAMAINDEX_TIMEOUT_MS ??= "30000"
process.env.S3_TIMEOUT_MS ??= "10000"

vi.mock("../src/queues/file-processing.js", () => ({
  fileProcessingQueue: {
    add: vi.fn().mockResolvedValue({ id: "mock-job-id" }),
    close: vi.fn().mockResolvedValue(undefined),
  },
  addProcessingJob: vi.fn().mockResolvedValue({ id: "mock-job-id" }),
}))
