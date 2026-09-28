import { beforeAll, beforeEach, describe, it, expect } from "vitest"
import db from "../../src/config/database.js"
import { createTestUser, createTestWorkspace, cleanAllTables, seedPermissions } from "../helpers.js"
import * as folders from "../../src/models/dataset-folders.js"

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

describe("dataset tree lock", () => {
  it("holds the dataset lock until the transaction ends", async () => {
    await db.transaction(async (trx) => {
      await folders.lockDatasetTree(trx, dsId)
      const { rows } = await db.raw(
        "SELECT pg_try_advisory_xact_lock(hashtextextended(?, 0)) AS got",
        [`dataset_folders:${dsId}`],
      )
      expect(rows[0].got).toBe(false)
    })
  })
})

const mk = (name, parentId = null) =>
  folders.create({ datasetId: dsId, workspaceId: ws.id, parentId, name })

describe("dataset folder model", () => {
  it("creates, finds, and renames a folder", async () => {
    const a = await mk("A")
    expect(await folders.findActive({ id: a.id, datasetId: dsId })).toMatchObject({ name: "A" })
    const renamed = await folders.rename({ id: a.id, datasetId: dsId, name: "B" })
    expect(renamed.name).toBe("B")
    expect(await folders.findActive({ id: a.id, datasetId: crypto.randomUUID() })).toBeUndefined()
  })

  it("returns the ancestors from the root to the folder", async () => {
    const a = await mk("A")
    const b = await mk("B", a.id)
    const c = await mk("C", b.id)
    const path = await folders.ancestors({ folderId: c.id, datasetId: dsId })
    expect(path.map((f) => f.name)).toEqual(["A", "B", "C"])
    expect(await folders.ancestors({ folderId: null, datasetId: dsId })).toEqual([])
  })

  it("finds many active folders in one dataset", async () => {
    const a = await mk("A")
    const b = await mk("B")
    await db("dataset_folders").where({ id: b.id }).update({ deleted_at: new Date() })
    const rows = await folders.findActiveMany({ ids: [a.id, b.id], datasetId: dsId })
    expect(rows.map((r) => r.id)).toEqual([a.id])
  })
})

describe("child queries", () => {
  let a, b, x
  const addFile = (folderId, filename = "f.md") =>
    db("dataset_files").insert({
      id: crypto.randomUUID(),
      dataset_id: dsId,
      workspace_id: ws.id,
      folder_id: folderId,
      filename,
      mime_type: "text/markdown",
      file_size_bytes: 1,
      status: "completed",
    })

  beforeEach(async () => {
    a = await mk("Alpha")
    b = await mk("beta", a.id)
    await mk("Gamma", b.id)
    x = await mk("x-ray")
    await addFile(a.id)
    await addFile(b.id)
    await addFile(b.id)
  })

  it("lists child folders in case-insensitive order with has_children", async () => {
    const rows = await folders.listChildren({
      datasetId: dsId,
      parentId: null,
      afterKey: null,
      limit: 10,
      withHasChildren: true,
    })
    expect(rows.map((r) => [r.name, r.has_children])).toEqual([
      ["Alpha", true],
      ["x-ray", false],
    ])
    const next = await folders.listChildren({
      datasetId: dsId,
      parentId: null,
      afterKey: rows[0].sort_key,
      limit: 10,
    })
    expect(next.map((r) => r.name)).toEqual(["x-ray"])
  })

  it("counts the direct child folders and files", async () => {
    const counts = await folders.countChildren({ folderIds: [a.id, b.id, x.id], datasetId: dsId })
    expect(counts.get(a.id)).toEqual({ folders: 1, files: 1 })
    expect(counts.get(b.id)).toEqual({ folders: 1, files: 2 })
    expect(counts.get(x.id)).toEqual({ folders: 0, files: 0 })
  })
})

describe("recursive queries", () => {
  let a, b, c, x

  beforeEach(async () => {
    a = await mk("Alpha")
    b = await mk("beta", a.id)
    c = await mk("Gamma", b.id)
    x = await mk("x-ray")
  })

  it("walks the subtree of each root", async () => {
    const rows = await folders.subtree({ rootIds: [a.id, x.id], datasetId: dsId })
    const ids = rows.filter((r) => r.root_id === a.id).map((r) => r.id)
    expect(new Set(ids)).toEqual(new Set([a.id, b.id, c.id]))
    expect(rows.filter((r) => r.root_id === x.id)).toHaveLength(1)
  })

  it("builds relative paths that stop at the current folder", async () => {
    const fromRoot = await folders.pathsBelow({ folderIds: [c.id], stopAt: null, datasetId: dsId })
    expect(fromRoot.get(c.id).map((p) => p.name)).toEqual(["Alpha", "beta", "Gamma"])
    const fromA = await folders.pathsBelow({
      folderIds: [c.id, a.id],
      stopAt: a.id,
      datasetId: dsId,
    })
    expect(fromA.get(c.id).map((p) => p.name)).toEqual(["beta", "Gamma"])
    expect(fromA.has(a.id)).toBe(false)
  })
})
