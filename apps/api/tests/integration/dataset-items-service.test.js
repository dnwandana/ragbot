import { beforeAll, beforeEach, describe, it, expect } from "vitest"
import db from "../../src/config/database.js"
import { createTestUser, createTestWorkspace, cleanAllTables, seedPermissions } from "../helpers.js"
import * as folderModel from "../../src/models/dataset-folders.js"
import { browseItems } from "../../src/services/dataset-items.js"
import { decodeCursor } from "../../src/utils/keyset-cursor.js"

let ws, dsId

beforeAll(async () => {
  await seedPermissions()
})
beforeEach(async () => {
  await cleanAllTables()
  const user = await createTestUser()
  ws = await createTestWorkspace(user.id)
  dsId = crypto.randomUUID()
  await db("datasets").insert({
    id: dsId,
    workspace_id: ws.id,
    name: "DS",
    created_at: new Date(),
    updated_at: new Date(),
  })
})

const mk = (name, parentId = null) =>
  folderModel.create({ datasetId: dsId, workspaceId: ws.id, parentId, name })
const addFile = async (folderId, filename, status = "completed") => {
  const id = crypto.randomUUID()
  await db("dataset_files").insert({
    id,
    dataset_id: dsId,
    workspace_id: ws.id,
    folder_id: folderId,
    filename,
    mime_type: "text/markdown",
    file_size_bytes: 1,
    status,
  })
  return id
}

describe("browseItems", () => {
  it("lists folders first, then files, with counts and kinds", async () => {
    const a = await mk("beta")
    await mk("Alpha")
    await addFile(null, "a.md")
    await addFile(a.id, "in-beta.md")
    const { items, nextCursor } = await browseItems({
      datasetId: dsId,
      folderId: null,
      cursor: null,
      limit: 50,
    })
    expect(items.map((i) => [i.kind, i.name ?? i.filename])).toEqual([
      ["folder", "Alpha"],
      ["folder", "beta"],
      ["file", "a.md"],
    ])
    expect(items[1].item_count).toEqual({ folders: 0, files: 1 })
    expect(nextCursor).toBeNull()
  })

  it("pages across the folder and file boundary without a repeat or a gap", async () => {
    await mk("F1")
    await mk("F2")
    const f1 = await addFile(null, "same.md")
    const f2 = await addFile(null, "same.md")
    const f3 = await addFile(null, "same.md")
    const seen = []
    let cursor = null
    do {
      const page = await browseItems({ datasetId: dsId, folderId: null, cursor, limit: 2 })
      seen.push(...page.items.map((i) => i.id))
      cursor = page.nextCursor ? decodeCursor(page.nextCursor) : null
    } while (cursor)
    expect(seen).toHaveLength(5)
    expect(new Set(seen).size).toBe(5)
    expect(seen.slice(2).toSorted()).toEqual([f1, f2, f3].toSorted())
  })
})
