import { beforeAll, beforeEach, describe, it, expect } from "vitest"
import db from "../../src/config/database.js"
import { createTestUser, createTestWorkspace, cleanAllTables, seedPermissions } from "../helpers.js"
import * as chunkModel from "../../src/models/document-chunks.js"

let fileId

beforeAll(async () => {
  await seedPermissions()
})
beforeEach(async () => {
  await cleanAllTables()
  const user = await createTestUser()
  const ws = await createTestWorkspace(user.id)
  const dsId = crypto.randomUUID()
  await db("datasets").insert({
    id: dsId,
    workspace_id: ws.id,
    name: "DS",
    created_at: new Date(),
    updated_at: new Date(),
  })
  fileId = crypto.randomUUID()
  await db("dataset_files").insert({
    id: fileId,
    dataset_id: dsId,
    workspace_id: ws.id,
    filename: "f.md",
    status: "completed",
    chunk_count: 3,
    metadata: JSON.stringify({}),
    created_at: new Date(),
    updated_at: new Date(),
  })
  for (let i = 0; i < 3; i++) {
    await db("document_chunks").insert({
      id: crypto.randomUUID(),
      dataset_file_id: fileId,
      content: `chunk ${i}`,
      chunk_index: i,
      created_at: new Date(),
    })
  }
})

describe("document-chunks model pagination", () => {
  it("count returns the number of chunks for a file", async () => {
    const { count } = await chunkModel.count({ dataset_file_id: fileId })
    expect(parseInt(count)).toBe(3)
  })

  it("findManyPaginated returns chunks without embeddings, ordered and limited", async () => {
    const rows = await chunkModel.findManyPaginated(
      { dataset_file_id: fileId },
      { limit: 2, offset: 0, orders: [{ column: "chunk_index", order: "asc" }] },
    )
    expect(rows).toHaveLength(2)
    expect(rows[0].chunk_index).toBe(0)
    expect(rows[0].content).toBe("chunk 0")
    expect(rows[0]).not.toHaveProperty("embedding")
  })
})
