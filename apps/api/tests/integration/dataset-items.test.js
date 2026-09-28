import { vi, beforeAll, beforeEach, describe, it, expect } from "vitest"
import db from "../../src/config/database.js"
import {
  request,
  createTestUser,
  createTestWorkspace,
  getAuthHeaders,
  cleanAllTables,
  seedPermissions,
} from "../helpers.js"
import * as folderModel from "../../src/models/dataset-folders.js"

vi.mock("../../src/services/email.js", () => ({
  sendVerificationEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  sendInvitationEmail: vi.fn(),
}))

let user, ws, dsId
const url = (qs = "") => `/api/workspaces/${ws.id}/datasets/${dsId}/items${qs}`
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
const get = async (qs) => (await request()).get(url(qs)).set(await getAuthHeaders(user.id))

beforeAll(async () => {
  await seedPermissions()
})
beforeEach(async () => {
  await cleanAllTables()
  user = await createTestUser()
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

describe("GET /items (browse)", () => {
  it("returns the items, an empty breadcrumb list, and no cursor at the root", async () => {
    await mk("Alpha")
    await addFile(null, "a.md")
    const res = await get("")
    expect(res.status).toBe(200)
    const { items, breadcrumbs, next_cursor } = res.body.data
    expect(items.map((i) => i.kind)).toEqual(["folder", "file"])
    expect(items[0].item_count).toEqual({ folders: 0, files: 0 })
    expect(breadcrumbs).toEqual([])
    expect(next_cursor).toBeNull()
  })

  it("returns the breadcrumbs of a nested folder", async () => {
    const a = await mk("A")
    const b = await mk("B", a.id)
    const res = await get(`?folder_id=${b.id}`)
    expect(res.body.data.breadcrumbs).toEqual([
      { id: a.id, name: "A" },
      { id: b.id, name: "B" },
    ])
  })

  it("follows next_cursor to the second page", async () => {
    await mk("F1")
    const f1 = await addFile(null, "a.md")
    const first = await get("?limit=1")
    expect(first.body.data.next_cursor).toEqual(expect.any(String))
    const second = await get(`?limit=1&cursor=${first.body.data.next_cursor}`)
    expect(second.body.data.items.map((i) => i.id)).toEqual([f1])
    expect(second.body.data.next_cursor).toBeNull()
  })

  it("returns 404 for an unknown folder and for a folder of a different dataset", async () => {
    expect((await get(`?folder_id=${crypto.randomUUID()}`)).status).toBe(404)
    const otherDs = crypto.randomUUID()
    await db("datasets").insert({
      id: otherDs,
      workspace_id: ws.id,
      name: "O",
      created_at: new Date(),
      updated_at: new Date(),
    })
    const other = await folderModel.create({
      datasetId: otherDs,
      workspaceId: ws.id,
      parentId: null,
      name: "X",
    })
    expect((await get(`?folder_id=${other.id}`)).status).toBe(404)
  })

  it("returns 400 for a bad folder_id, cursor, or limit", async () => {
    expect((await get("?folder_id=nope")).status).toBe(400)
    expect((await get("?cursor=not-a-cursor")).status).toBe(400)
    expect((await get("?limit=500")).status).toBe(400)
  })
})

const names = (res) =>
  res.body.data.items.map(
    (i) => `${i.kind}:${i.name ?? i.filename}:${i.path.map((p) => p.name).join("/")}`,
  )

describe("GET /items (search)", () => {
  let alpha, r1, r2
  beforeEach(async () => {
    alpha = await mk("Alpha")
    const beta = await mk("Beta")
    r1 = await mk("Reports", alpha.id)
    r2 = await mk("Reports", beta.id)
    await addFile(r1.id, "q3-report.pdf")
    await addFile(r2.id, "report-b.pdf", "failed")
    await addFile(null, "report-root.md")
  })

  it("searches the whole dataset at the root, with paths from the root", async () => {
    const res = await get("?q=report")
    expect(res.status).toBe(200)
    const got = names(res)
    // The two "Reports" folders tie on the name, so the random id sets their order.
    expect(got.slice(0, 2).toSorted()).toEqual(["folder:Reports:Alpha", "folder:Reports:Beta"])
    expect(got.slice(2)).toEqual([
      "file:q3-report.pdf:Alpha/Reports",
      "file:report-b.pdf:Beta/Reports",
      "file:report-root.md:",
    ])
  })

  it("stays inside the subtree of the current folder", async () => {
    const res = await get(`?folder_id=${alpha.id}&q=report`)
    expect(names(res)).toEqual(["folder:Reports:", "file:q3-report.pdf:Reports"])
  })

  it("does not return the current folder itself", async () => {
    const res = await get(`?folder_id=${r1.id}&q=reports`)
    expect(res.body.data.items).toEqual([])
  })

  it("hides folders when a status filter is active", async () => {
    const res = await get("?q=report&status=failed,processing")
    expect(names(res)).toEqual(["file:report-b.pdf:Beta/Reports"])
    expect((await get("?status=bogus")).status).toBe(400)
  })

  it("pages through folders with the same name in different parents", async () => {
    const first = await get("?q=reports&limit=1")
    const second = await get(`?q=reports&limit=1&cursor=${first.body.data.next_cursor}`)
    const ids = [first.body.data.items[0].id, second.body.data.items[0].id]
    expect(new Set(ids)).toEqual(new Set([r1.id, r2.id]))
  })

  it("treats % and _ in the query as plain characters", async () => {
    await addFile(null, "100%.md")
    await addFile(null, "1000.md")
    const res = await get(`?q=${encodeURIComponent("100%")}`)
    expect(res.body.data.items.map((i) => i.filename)).toEqual(["100%.md"])
  })
})
