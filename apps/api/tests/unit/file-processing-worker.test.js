import { vi } from "vitest"

vi.mock("../../src/models/dataset-files.js", () => ({
  update: vi.fn(),
}))

import * as datasetFileModel from "../../src/models/dataset-files.js"
import { handleFailedJob } from "../../src/workers/file-processing.js"

beforeEach(() => {
  vi.clearAllMocks()
})

describe("handleFailedJob", () => {
  const job = { id: "j1", data: { datasetFileId: "f1" }, attemptsMade: 3, opts: { attempts: 3 } }

  it("does not reject when the status-update DB write throws", async () => {
    datasetFileModel.update.mockRejectedValueOnce(new Error("db down"))
    await expect(handleFailedJob(job, new Error("boom"))).resolves.toBeUndefined()
  })

  it("marks the file failed after the final attempt", async () => {
    datasetFileModel.update.mockResolvedValueOnce([{}])
    await handleFailedJob(job, new Error("boom"))
    expect(datasetFileModel.update).toHaveBeenCalledWith(
      "f1",
      expect.objectContaining({ status: "failed", error_message: "boom" }),
    )
  })

  it("does not write when retries remain", async () => {
    await handleFailedJob({ ...job, attemptsMade: 1 }, new Error("boom"))
    expect(datasetFileModel.update).not.toHaveBeenCalled()
  })
})
