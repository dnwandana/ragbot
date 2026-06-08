import { vi, beforeAll, beforeEach, describe, it, expect } from "vitest"
import db from "../../src/config/database.js"
import { createTestUser, createTestWorkspace, cleanAllTables, seedPermissions } from "../helpers.js"

vi.mock("../../src/services/openrouter.js", () => ({
  embedText: vi.fn(),
  embedBatch: vi.fn((chunks) =>
    Promise.resolve(chunks.map(() => Array.from({ length: 1536 }, () => 0))),
  ),
  chatCompletion: vi.fn(),
  chatCompletionStream: vi.fn(),
}))
vi.mock("../../src/services/question-generator.js", () => ({
  generateQuestions: vi.fn().mockResolvedValue(["What is X?", "How does Y work?"]),
}))

const { runProcessingPipeline } = await import("../../src/workers/file-processing.js")

let dsId, fileId

beforeAll(async () => {
  await seedPermissions()
})
beforeEach(async () => {
  vi.clearAllMocks()
  await cleanAllTables()
  const user = await createTestUser()
  const ws = await createTestWorkspace(user.id)
  dsId = crypto.randomUUID()
  await db("datasets").insert({
    id: dsId,
    workspace_id: ws.id,
    name: "DS",
    embedding_model: "text-embedding-3-small",
    chunk_size: 1024,
    chunk_overlap: 128,
    created_at: new Date(),
    updated_at: new Date(),
  })
  fileId = crypto.randomUUID()
  await db("dataset_files").insert({
    id: fileId,
    dataset_id: dsId,
    workspace_id: ws.id,
    filename: "f.md",
    status: "processing",
    chunk_count: 0,
    metadata: JSON.stringify({ source_url: "https://example.com" }),
    created_at: new Date(),
    updated_at: new Date(),
  })
})

const loadDataset = () => db("datasets").where({ id: dsId }).first()

describe("runProcessingPipeline", () => {
  it("writes questions to dataset_file_questions and not into metadata", async () => {
    await runProcessingPipeline({
      datasetFileId: fileId,
      markdownContent: "# Title\n\nSome body text.",
      dataset: await loadDataset(),
    })

    const questions = await db("dataset_file_questions").where({ dataset_file_id: fileId })
    expect(questions).toHaveLength(2)
    expect(questions.map((q) => q.question)).toContain("What is X?")

    const file = await db("dataset_files").where({ id: fileId }).first()
    const metadata = typeof file.metadata === "string" ? JSON.parse(file.metadata) : file.metadata
    expect(metadata.exploration_questions).toBeUndefined()
    expect(metadata.source_url).toBe("https://example.com")
    expect(file.status).toBe("completed")
  })

  it("deletes orphaned chunks when reprocessing yields no chunks", async () => {
    await db("dataset_file_chunks").insert({
      id: crypto.randomUUID(),
      dataset_file_id: fileId,
      content: "stale chunk",
      chunk_index: 0,
      created_at: new Date(),
    })
    await db("dataset_file_questions").insert({
      id: crypto.randomUUID(),
      dataset_file_id: fileId,
      question: "STALE QUESTION?",
      created_at: new Date(),
    })

    await runProcessingPipeline({
      datasetFileId: fileId,
      markdownContent: "",
      dataset: await loadDataset(),
    })

    const chunks = await db("dataset_file_chunks").where({ dataset_file_id: fileId })
    expect(chunks).toHaveLength(0)

    const questions = await db("dataset_file_questions").where({ dataset_file_id: fileId })
    expect(questions).toHaveLength(0)

    const file = await db("dataset_files").where({ id: fileId }).first()
    expect(file.chunk_count).toBe(0)
    expect(file.status).toBe("completed")
  })

  it("clears prior questions when reprocessing", async () => {
    await db("dataset_file_questions").insert({
      id: crypto.randomUUID(),
      dataset_file_id: fileId,
      question: "OLD QUESTION?",
      created_at: new Date(),
    })

    await runProcessingPipeline({
      datasetFileId: fileId,
      markdownContent: "# Title\n\nSome body text.",
      dataset: await loadDataset(),
    })

    const questions = await db("dataset_file_questions").where({ dataset_file_id: fileId })
    expect(questions.map((q) => q.question)).not.toContain("OLD QUESTION?")
    expect(questions).toHaveLength(2)
  })
})
