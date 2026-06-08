import { beforeAll, beforeEach, describe, it, expect } from "vitest"
import db from "../../src/config/database.js"
import { createTestUser, createTestWorkspace, cleanAllTables, seedPermissions } from "../helpers.js"
import * as questionModel from "../../src/models/dataset-file-questions.js"

let dsId, fileId, otherFileId

beforeAll(async () => {
  await seedPermissions()
})
beforeEach(async () => {
  await cleanAllTables()
  const user = await createTestUser()
  const ws = await createTestWorkspace(user.id)
  dsId = crypto.randomUUID()
  await db("datasets").insert({
    id: dsId,
    workspace_id: ws.id,
    name: "DS",
    created_at: new Date(),
    updated_at: new Date(),
  })
  fileId = crypto.randomUUID()
  otherFileId = crypto.randomUUID()
  for (const id of [fileId, otherFileId]) {
    await db("dataset_files").insert({
      id,
      dataset_id: dsId,
      workspace_id: ws.id,
      filename: `${id}.md`,
      status: "completed",
      chunk_count: 0,
      metadata: JSON.stringify({}),
      created_at: new Date(),
      updated_at: new Date(),
    })
  }
})

describe("dataset-file-questions model", () => {
  it("bulkInsert inserts rows and findByFileId returns them scoped to the file", async () => {
    await questionModel.bulkInsert([
      { id: crypto.randomUUID(), dataset_file_id: fileId, question: "What is A?" },
      { id: crypto.randomUUID(), dataset_file_id: fileId, question: "What is B?" },
      { id: crypto.randomUUID(), dataset_file_id: otherFileId, question: "Other?" },
    ])
    const rows = await questionModel.findByFileId(fileId)
    expect(rows).toHaveLength(2)
    expect(rows.map((r) => r.question).toSorted()).toEqual(["What is A?", "What is B?"])
  })

  it("bulkInsert is a no-op for an empty array", async () => {
    await expect(questionModel.bulkInsert([])).resolves.toBeUndefined()
    expect(await questionModel.findByFileId(fileId)).toHaveLength(0)
  })

  it("deleteByFileId removes only that file's questions", async () => {
    await questionModel.bulkInsert([
      { id: crypto.randomUUID(), dataset_file_id: fileId, question: "Q1?" },
      { id: crypto.randomUUID(), dataset_file_id: otherFileId, question: "Q2?" },
    ])
    await questionModel.deleteByFileId(fileId)
    expect(await questionModel.findByFileId(fileId)).toHaveLength(0)
    expect(await questionModel.findByFileId(otherFileId)).toHaveLength(1)
  })

  it("deleteByDatasetId removes questions for all files in the dataset", async () => {
    await questionModel.bulkInsert([
      { id: crypto.randomUUID(), dataset_file_id: fileId, question: "Q1?" },
      { id: crypto.randomUUID(), dataset_file_id: otherFileId, question: "Q2?" },
    ])
    await questionModel.deleteByDatasetId(dsId)
    expect(await questionModel.findByFileId(fileId)).toHaveLength(0)
    expect(await questionModel.findByFileId(otherFileId)).toHaveLength(0)
  })
})
