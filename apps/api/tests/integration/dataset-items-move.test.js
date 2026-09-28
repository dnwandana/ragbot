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
    storage_path: `k/${id}`,
  })
  return id
}
const move = async (body, as = user) =>
  (await request())
    .post(`/api/workspaces/${ws.id}/datasets/${dsId}/items/move`)
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

describe("POST /items/move", () => {
  it("moves folders and files and writes one audit row for each moved item", async () => {
    const t = await mk("Target")
    const a = await mk("A")
    const fileId = await addFile(null, "x.md")
    const already = await addFile(t.id, "y.md")
    const before = await db("dataset_files").where({ id: fileId }).first()
    const res = await move({
      folder_ids: [a.id],
      file_ids: [fileId, already],
      target_folder_id: t.id,
    })
    expect(res.status).toBe(200)
    expect(res.body.data.moved).toEqual({ folders: 1, files: 1 })
    expect((await db("dataset_folders").where({ id: a.id }).first()).parent_id).toBe(t.id)
    const after = await db("dataset_files").where({ id: fileId }).first()
    expect(after.folder_id).toBe(t.id)
    expect(after.storage_path).toBe(before.storage_path)
    const audit = await db("audit_logs").where({ action: "updated" }).orderBy("entity_type")
    expect(audit.map((r) => [r.entity_type, r.changes])).toEqual([
      ["dataset_file", { folder_id: { from: null, to: t.id } }],
      ["dataset_folder", { parent_id: { from: null, to: t.id } }],
    ])
  })

  it("moves items back to the root with target_folder_id null", async () => {
    const t = await mk("T")
    const a = await mk("A", t.id)
    const res = await move({ folder_ids: [a.id], target_folder_id: null })
    expect(res.status).toBe(200)
    expect((await db("dataset_folders").where({ id: a.id }).first()).parent_id).toBeNull()
  })

  it("returns 409 for a case-only duplicate and changes nothing", async () => {
    const t = await mk("T")
    await mk("Reports", t.id)
    const r = await mk("reports")
    const fileId = await addFile(null, "x.md")
    const res = await move({ folder_ids: [r.id], file_ids: [fileId], target_folder_id: t.id })
    expect(res.status).toBe(409)
    expect(res.body.message).toBe('A folder named "reports" already exists in "T".')
    expect((await db("dataset_files").where({ id: fileId }).first()).folder_id).toBeNull()
    expect((await db("dataset_folders").where({ id: r.id }).first()).parent_id).toBeNull()
  })

  it("serializes two crossing moves, so they cannot make a cycle", async () => {
    const a = await mk("A")
    const b = await mk("B")
    const results = await Promise.all([
      move({ folder_ids: [a.id], target_folder_id: b.id }),
      move({ folder_ids: [b.id], target_folder_id: a.id }),
    ])
    expect(results.map((r) => r.status).toSorted()).toEqual([200, 422])
  })

  it("validates the body and the permission", async () => {
    const a = await mk("A")
    expect((await move({ folder_ids: [a.id] })).status).toBe(400)
    expect((await move({ folder_ids: [], file_ids: [], target_folder_id: null })).status).toBe(400)
    const viewer = await createTestUser()
    await addWorkspaceMember(ws.id, viewer.id, ws.roles.viewer)
    expect((await move({ folder_ids: [a.id], target_folder_id: null }, viewer)).status).toBe(403)
  })
})
