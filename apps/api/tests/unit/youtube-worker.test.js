import { afterEach, vi } from "vitest"

vi.mock("../../src/models/dataset-files.js", () => ({ findOne: vi.fn(), update: vi.fn() }))
vi.mock("../../src/models/datasets.js", () => ({ findOne: vi.fn() }))
vi.mock("../../src/services/youtube.js", () => ({ getTranscript: vi.fn() }))
vi.mock("../../src/services/processing-pipeline.js", () => ({ runProcessingPipeline: vi.fn() }))

const datasetFileModel = await import("../../src/models/dataset-files.js")
const datasetModel = await import("../../src/models/datasets.js")
const youtube = await import("../../src/services/youtube.js")
const pipeline = await import("../../src/services/processing-pipeline.js")
const { processYoutubeJob, handleYoutubeFailedJob } =
  await import("../../src/workers/youtube-processing.js")

afterEach(() => vi.clearAllMocks())

const job = (overrides = {}) => ({
  id: "job1",
  attemptsMade: 1,
  opts: { attempts: 3 },
  data: { datasetFileId: "file1", datasetId: "ds1" },
  ...overrides,
})

describe("processYoutubeJob", () => {
  it("transcribes and runs the shared pipeline with a titled markdown header", async () => {
    datasetFileModel.findOne.mockResolvedValue({
      id: "file1",
      metadata: JSON.stringify({
        source_type: "youtube",
        canonical_url: "https://www.youtube.com/watch?v=aircAruvnKk",
        source_url: "https://youtu.be/aircAruvnKk",
      }),
    })
    datasetModel.findOne.mockResolvedValue({ id: "ds1", chunk_size: 1024 })
    youtube.getTranscript.mockResolvedValue({
      text: "transcript body",
      title: "My Talk",
      transcriptSource: "manual_subtitle",
      language: "en",
    })

    await processYoutubeJob(job())

    expect(youtube.getTranscript).toHaveBeenCalledWith(
      "https://www.youtube.com/watch?v=aircAruvnKk",
    )
    const arg = pipeline.runProcessingPipeline.mock.calls[0][0]
    expect(arg.datasetFileId).toBe("file1")
    expect(arg.markdownContent).toContain("# My Talk")
    expect(arg.markdownContent).toContain("transcript body")
    // metadata enriched with the resolved title + transcript source
    expect(datasetFileModel.update).toHaveBeenCalledWith(
      "file1",
      expect.objectContaining({ metadata: expect.stringContaining("manual_subtitle") }),
    )
  })

  it("sets the filename to the resolved video title", async () => {
    datasetFileModel.findOne.mockResolvedValue({
      id: "file1",
      metadata: JSON.stringify({
        source_type: "youtube",
        canonical_url: "https://www.youtube.com/watch?v=aircAruvnKk",
        source_url: "https://youtu.be/aircAruvnKk",
      }),
    })
    datasetModel.findOne.mockResolvedValue({ id: "ds1", chunk_size: 1024 })
    youtube.getTranscript.mockResolvedValue({
      text: "transcript body",
      title: "How to Build a RAG Chatbot | Full Tutorial",
      transcriptSource: "manual_subtitle",
      language: "en",
    })

    await processYoutubeJob(job())

    expect(datasetFileModel.update).toHaveBeenCalledWith(
      "file1",
      expect.objectContaining({ filename: "How to Build a RAG Chatbot | Full Tutorial" }),
    )
  })

  it("falls back to source_url when the title is empty", async () => {
    datasetFileModel.findOne.mockResolvedValue({
      id: "file1",
      metadata: JSON.stringify({
        source_type: "youtube",
        canonical_url: "https://www.youtube.com/watch?v=aircAruvnKk",
        source_url: "https://youtu.be/aircAruvnKk",
      }),
    })
    datasetModel.findOne.mockResolvedValue({ id: "ds1", chunk_size: 1024 })
    youtube.getTranscript.mockResolvedValue({
      text: "transcript body",
      title: "   ",
      transcriptSource: "whisper",
      language: "en",
    })

    await processYoutubeJob(job())

    expect(datasetFileModel.update).toHaveBeenCalledWith(
      "file1",
      expect.objectContaining({ filename: "https://youtu.be/aircAruvnKk" }),
    )
  })

  it("truncates a title longer than 255 characters", async () => {
    datasetFileModel.findOne.mockResolvedValue({
      id: "file1",
      metadata: JSON.stringify({
        source_type: "youtube",
        canonical_url: "https://www.youtube.com/watch?v=aircAruvnKk",
        source_url: "https://youtu.be/aircAruvnKk",
      }),
    })
    datasetModel.findOne.mockResolvedValue({ id: "ds1", chunk_size: 1024 })
    youtube.getTranscript.mockResolvedValue({
      text: "transcript body",
      title: "A".repeat(300),
      transcriptSource: "whisper",
      language: "en",
    })

    await processYoutubeJob(job())

    const fields = datasetFileModel.update.mock.calls[0][1]
    expect(fields.filename).toHaveLength(255)
    expect(fields.filename).toBe("A".repeat(255))
  })

  it("throws when the file is not a YouTube source", async () => {
    datasetFileModel.findOne.mockResolvedValue({ id: "file1", metadata: JSON.stringify({}) })
    datasetModel.findOne.mockResolvedValue({ id: "ds1" })
    await expect(processYoutubeJob(job())).rejects.toThrow(/not a youtube source/i)
  })

  it("marks the file failed only after the final attempt", async () => {
    await handleYoutubeFailedJob(job({ attemptsMade: 3 }), new Error("boom"))
    expect(datasetFileModel.update).toHaveBeenCalledWith(
      "file1",
      expect.objectContaining({ status: "failed" }),
    )
  })

  it("does not mark failed before the final attempt", async () => {
    await handleYoutubeFailedJob(job({ attemptsMade: 1 }), new Error("transient"))
    expect(datasetFileModel.update).not.toHaveBeenCalled()
  })
})
