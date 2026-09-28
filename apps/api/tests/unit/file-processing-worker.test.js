import { vi } from "vitest"

vi.mock("../../src/models/dataset-files.js", () => ({
  update: vi.fn(),
  findOne: vi.fn(),
}))
vi.mock("../../src/models/datasets.js", () => ({
  findOne: vi.fn(),
}))
vi.mock("../../src/services/processing-pipeline.js", () => ({
  runProcessingPipeline: vi.fn(),
}))
vi.mock("../../src/services/tabular/profile.js", () => ({
  profileTabularFile: vi.fn(),
}))
vi.mock("../../src/services/llamaindex.js", () => ({
  pollForMarkdown: vi.fn(),
}))
vi.mock("../../src/services/firecrawl.js", () => ({
  scrapeUrl: vi.fn(),
}))

import * as datasetFileModel from "../../src/models/dataset-files.js"
import * as datasetModel from "../../src/models/datasets.js"
import { runProcessingPipeline } from "../../src/services/processing-pipeline.js"
import { profileTabularFile } from "../../src/services/tabular/profile.js"
import { handleFailedJob, processJob } from "../../src/workers/file-processing.js"

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

describe("processJob", () => {
  const dataset = { id: "d1", workspace_id: "w1" }
  const tabularFile = {
    id: "f1",
    dataset_id: "d1",
    filename: "cities.csv",
    storage_path: "workspaces/w1/datasets/d1/files/f1.csv",
    metadata: JSON.stringify({ source_type: "tabular" }),
  }
  const jobFor = (file) => ({ id: "j1", data: { datasetFileId: file.id, datasetId: dataset.id } })

  beforeEach(() => {
    datasetModel.findOne.mockResolvedValue(dataset)
  })

  it("routes tabular files through profiling, stores the profile, then embeds", async () => {
    datasetFileModel.findOne.mockResolvedValue(tabularFile)
    vi.mocked(profileTabularFile).mockResolvedValue({
      profile: { format: "csv", sheets: [], truncated: false },
      markdown: "# Data file: cities.csv",
    })

    await processJob(jobFor(tabularFile))

    expect(profileTabularFile).toHaveBeenCalledWith(tabularFile)
    const updateCall = vi.mocked(datasetFileModel.update).mock.calls[0]
    expect(updateCall[0]).toBe("f1")
    const written = JSON.parse(updateCall[1].metadata)
    expect(written.profile.format).toBe("csv")
    expect(written.source_type).toBe("tabular")
    expect(runProcessingPipeline).toHaveBeenCalledWith(
      expect.objectContaining({
        datasetFileId: "f1",
        markdownContent: "# Data file: cities.csv",
        dataset,
      }),
    )
  })

  it("stores the profile before the pipeline runs", async () => {
    datasetFileModel.findOne.mockResolvedValue(tabularFile)
    const order = []
    vi.mocked(profileTabularFile).mockResolvedValue({
      profile: { format: "csv", sheets: [], truncated: false },
      markdown: "# Data file: cities.csv",
    })
    datasetFileModel.update.mockImplementation(async () => {
      order.push("update")
    })
    vi.mocked(runProcessingPipeline).mockImplementation(async () => {
      order.push("pipeline")
    })

    await processJob(jobFor(tabularFile))

    expect(order).toEqual(["update", "pipeline"])
  })

  it("finishes without a retry when the file is deleted", async () => {
    datasetFileModel.findOne.mockResolvedValueOnce(undefined)
    datasetModel.findOne.mockResolvedValueOnce(dataset)
    await expect(
      processJob({ data: { datasetFileId: "f1", datasetId: "d1" } }),
    ).resolves.toBeUndefined()
    expect(runProcessingPipeline).not.toHaveBeenCalled()
  })

  it("still throws when the dataset is missing", async () => {
    datasetFileModel.findOne.mockResolvedValueOnce(tabularFile)
    datasetModel.findOne.mockResolvedValueOnce(undefined)
    await expect(processJob(jobFor(tabularFile))).rejects.toThrow(/Dataset d1 not found/)
  })

  it("propagates a profiling failure so the file is marked failed", async () => {
    datasetFileModel.findOne.mockResolvedValue(tabularFile)
    vi.mocked(profileTabularFile).mockRejectedValue(new Error("Tabular profiling failed"))

    await expect(processJob(jobFor(tabularFile))).rejects.toThrow(/Tabular profiling failed/)
    expect(runProcessingPipeline).not.toHaveBeenCalled()
  })
})
