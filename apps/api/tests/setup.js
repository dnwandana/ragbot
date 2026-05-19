import { vi } from "vitest"

vi.mock("../src/queues/file-processing.js", () => ({
  fileProcessingQueue: {
    add: vi.fn().mockResolvedValue({ id: "mock-job-id" }),
    close: vi.fn().mockResolvedValue(undefined),
  },
  addProcessingJob: vi.fn().mockResolvedValue({ id: "mock-job-id" }),
}))
