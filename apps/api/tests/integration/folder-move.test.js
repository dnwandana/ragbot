import { beforeAll, beforeEach, describe, it, expect } from "vitest"
import db from "../../src/config/database.js"
import { createTestUser, createTestWorkspace, cleanAllTables, seedPermissions } from "../helpers.js"
import * as folders from "../../src/models/dataset-folders.js"
import { checkMove } from "../../src/services/folder-move.js"
import { parseItemIds } from "../../src/utils/item-ids.js"

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
  folders.create({ datasetId: dsId, workspaceId: ws.id, parentId, name })
const addFile = async (folderId, filename = "f.md") => {
  const id = crypto.randomUUID()
  await db("dataset_files").insert({
    id,
    dataset_id: dsId,
    workspace_id: ws.id,
    folder_id: folderId,
    filename,
    mime_type: "text/markdown",
    file_size_bytes: 1,
    status: "completed",
  })
  return id
}
const check = (folderIds, fileIds, targetId) =>
  db.transaction((trx) =>
    checkMove({ datasetId: dsId, datasetName: "DS", folderIds, fileIds, targetId }, trx),
  )
const chain = async (prefix, n, parentId = null) => {
  const out = []
  for (let i = 0; i < n; i++) out.push(await mk(`${prefix}${i}`, out.at(-1)?.id ?? parentId))
  return out
}

describe("parseItemIds", () => {
  it("dedupes ids and enforces 1 to 500 ids", () => {
    const id = crypto.randomUUID()
    expect(parseItemIds({ folder_ids: [id, id] })).toEqual({ folderIds: [id], fileIds: [] })
    expect(() => parseItemIds({})).toThrow()
    expect(() => parseItemIds({ file_ids: ["nope"] })).toThrow()
    const many = Array.from({ length: 501 }, () => crypto.randomUUID())
    expect(() => parseItemIds({ file_ids: many })).toThrow("500")
  })
})

describe("checkMove", () => {
  it("returns 404 for a missing item or target", async () => {
    await expect(check([crypto.randomUUID()], [], null)).rejects.toMatchObject({ status: 404 })
    await expect(check([], [crypto.randomUUID()], null)).rejects.toMatchObject({ status: 404 })
    const a = await mk("A")
    await expect(check([a.id], [], crypto.randomUUID())).rejects.toMatchObject({ status: 404 })
  })

  it("returns 422 when a folder moves into itself or its subfolder", async () => {
    const a = await mk("Security")
    const b = await mk("B", a.id)
    await expect(check([a.id], [], b.id)).rejects.toMatchObject({
      status: 422,
      message: 'Cannot move "Security" into its own subfolder.',
    })
    await expect(check([a.id], [], a.id)).rejects.toMatchObject({ status: 422 })
  })

  it("returns 422 when the tree would be deeper than 20 levels", async () => {
    const target = await chain("L", 15)
    const moved = await chain("X", 6)
    await expect(check([moved[0].id], [], target[14].id)).rejects.toMatchObject({
      status: 422,
      message: "Cannot move the items. The folder tree would be deeper than 20 levels.",
    })
    await expect(check([moved[0].id], [], target[13].id)).resolves.toBeTruthy()
  })

  it("returns 409 for a case-only duplicate in the target and among the moved folders", async () => {
    const t = await mk("Target")
    await mk("Reports", t.id)
    const other = await mk("reports")
    await expect(check([other.id], [], t.id)).rejects.toMatchObject({
      status: 409,
      message: 'A folder named "reports" already exists in "Target".',
    })
    const p = await mk("P")
    const d1 = await mk("Docs", p.id)
    const d2 = await mk("docs", t.id)
    await expect(check([d1.id, d2.id], [], null)).rejects.toMatchObject({ status: 409 })
  })

  it("skips items that are already in the target", async () => {
    const t = await mk("T")
    const inside = await mk("In", t.id)
    const outside = await mk("Out")
    const fileId = await addFile(t.id, "a.md")
    const res = await check([inside.id, outside.id], [fileId], t.id)
    expect(res.folders.map((f) => f.id)).toEqual([outside.id])
    expect(res.files).toEqual([])
    expect(res.containerName).toBe("T")
  })
})
