import { vi, beforeAll, beforeEach, describe, it, expect } from "vitest"
import db from "../../src/config/database.js"
import {
  request,
  createTestUser,
  createTestWorkspace,
  getAuthHeaders,
  cleanAllTables,
  seedPermissions,
  addWorkspaceMember,
} from "../helpers.js"
import * as folderModel from "../../src/models/dataset-folders.js"

const { deleteObjects } = vi.hoisted(() => ({
  deleteObjects: vi.fn().mockResolvedValue({ failed: [] }),
}))
vi.mock("../../src/services/storage.js", () => ({
  deleteObjects,
  deleteFile: vi.fn(),
  uploadFile: vi.fn(),
}))
vi.mock("../../src/services/email.js", () => ({
  sendVerificationEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  sendInvitationEmail: vi.fn(),
}))

let user, ws, dsId
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
const api = async (path, body, as = user) =>
  (await request())
    .post(`/api/workspaces/${ws.id}/datasets/${dsId}/items/${path}`)
    .set(await getAuthHeaders(as.id))
    .send(body)

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

describe("POST /items/summary and /items/delete", () => {
  let a, b, c, fa, fc, loose
  beforeEach(async () => {
    a = await mk("A")
    b = await mk("B", a.id)
    c = await mk("C", b.id)
    fa = await addFile(a.id, "a.md")
    fc = await addFile(c.id, "c.md")
    loose = await addFile(null, "loose.md")
    deleteObjects.mockClear()
    await db("dataset_files")
      .whereIn("id", [fa, fc])
      .update({ storage_path: db.raw("'k/' || id") })
    await db("dataset_file_chunks").insert({ dataset_file_id: fc, content: "x", chunk_index: 0 })
    await db("dataset_file_questions").insert({ dataset_file_id: fc, question: "q?" })
  })

  it("counts every folder and file below the selection once", async () => {
    const res = await api("summary", { folder_ids: [a.id, b.id], file_ids: [loose, fc] })
    expect(res.status).toBe(200)
    expect(res.body.data).toEqual({ folders: 3, files: 3 })
  })

  it("counts a selected file outside the selected folders", async () => {
    const res = await api("summary", { folder_ids: [c.id], file_ids: [fa] })
    expect(res.body.data).toEqual({ folders: 1, files: 2 })
  })

  it("returns 404 from the summary for a missing item", async () => {
    const res = await api("summary", { folder_ids: [a.id], file_ids: [crypto.randomUUID()] })
    expect(res.status).toBe(404)
  })

  it("deletes the subtree, the chunks, and the questions, then removes the R2 objects", async () => {
    const res = await api("delete", { folder_ids: [a.id] })
    expect(res.status).toBe(200)
    expect(res.body.data.deleted).toEqual({ folders: 3, files: 2 })
    const alive = await db("dataset_folders").whereNull("deleted_at")
    expect(alive).toHaveLength(0)
    expect(await db("dataset_files").whereNull("deleted_at").pluck("id")).toEqual([loose])
    expect(await db("dataset_file_chunks").where({ dataset_file_id: fc })).toHaveLength(0)
    expect(await db("dataset_file_questions").where({ dataset_file_id: fc })).toHaveLength(0)
    expect(deleteObjects.mock.calls[0][0].toSorted()).toEqual([`k/${fa}`, `k/${fc}`].toSorted())
    const audit = await db("audit_logs").where({ action: "deleted" })
    expect(audit.map((r) => [r.entity_type, r.changes])).toEqual([
      ["dataset_folder", { name: "A", folders: 2, files: 2 }],
    ])
    expect((await mk("A")).name).toBe("A")
  })

  it("writes one audit row for each selected file", async () => {
    const res = await api("delete", { file_ids: [loose] })
    expect(res.status).toBe(200)
    expect(res.body.data.deleted).toEqual({ folders: 0, files: 1 })
    const audit = await db("audit_logs").where({ action: "deleted" })
    expect(audit.map((r) => [r.entity_type, r.entity_id])).toEqual([["dataset_file", loose]])
    expect(await db("dataset_folders").whereNull("deleted_at")).toHaveLength(3)
  })

  it("deletes a file that a concurrent insert added to the folder", async () => {
    const trx = await db.transaction()
    await trx.raw("SELECT id FROM dataset_folders WHERE id = ? FOR SHARE", [c.id])
    const pending = api("delete", { folder_ids: [a.id] }).then((r) => r)
    await new Promise((r) => setTimeout(r, 200))
    const lateId = crypto.randomUUID()
    await trx("dataset_files").insert({
      id: lateId,
      dataset_id: dsId,
      workspace_id: ws.id,
      folder_id: c.id,
      filename: "late.md",
      mime_type: "text/markdown",
      file_size_bytes: 1,
      status: "queued",
    })
    await trx.commit()
    expect((await pending).status).toBe(200)
    expect((await db("dataset_files").where({ id: lateId }).first()).deleted_at).not.toBeNull()
  })

  it("returns 404 for a missing item and changes nothing", async () => {
    const res = await api("delete", { folder_ids: [a.id], file_ids: [crypto.randomUUID()] })
    expect(res.status).toBe(404)
    expect(await db("dataset_folders").whereNull("deleted_at")).toHaveLength(3)
  })

  it("returns 403 to an editor and to a viewer", async () => {
    for (const role of ["editor", "viewer"]) {
      const member = await createTestUser()
      await addWorkspaceMember(ws.id, member.id, ws.roles[role])
      expect((await api("delete", { folder_ids: [a.id] }, member)).status).toBe(403)
    }
  })
})
