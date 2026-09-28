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
const base = () => `/api/workspaces/${ws.id}/datasets/${dsId}/folders`
const mk = (name, parentId = null) =>
  folderModel.create({ datasetId: dsId, workspaceId: ws.id, parentId, name })
const post = async (body, as = user) =>
  (await request())
    .post(base())
    .set(await getAuthHeaders(as.id))
    .send(body)
const put = async (id, body) =>
  (await request())
    .put(`${base()}/${id}`)
    .set(await getAuthHeaders(user.id))
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
    name: "Handbook",
    created_at: new Date(),
    updated_at: new Date(),
  })
})

describe("folder endpoints", () => {
  it("lists child folders with has_children and a cursor", async () => {
    const a = await mk("A")
    await mk("child", a.id)
    await mk("B")
    const get = async (qs) =>
      (await request()).get(`${base()}${qs}`).set(await getAuthHeaders(user.id))
    const first = await get("?limit=1")
    expect(first.body.data.items).toEqual([
      { kind: "folder", id: a.id, name: "A", has_children: true },
    ])
    const second = await get(`?limit=1&cursor=${first.body.data.next_cursor}`)
    expect(second.body.data.items.map((i) => i.name)).toEqual(["B"])
    expect(second.body.data.next_cursor).toBeNull()
    expect((await get(`?parent_id=${crypto.randomUUID()}`)).status).toBe(404)
  })

  it("creates a folder, writes an audit row, and rejects a case-only duplicate", async () => {
    const sec = await mk("Security")
    const res = await post({ parent_id: sec.id, name: "  Reports " })
    expect(res.status).toBe(201)
    expect(res.body.data).toMatchObject({ name: "Reports", parent_id: sec.id })
    const audit = await db("audit_logs").where({ entity_type: "dataset_folder", action: "created" })
    expect(audit).toHaveLength(1)
    const dup = await post({ parent_id: sec.id, name: "reports" })
    expect(dup.status).toBe(409)
    expect(dup.body.message).toBe('A folder named "reports" already exists in "Security".')
    const rootDup = await post({ parent_id: null, name: "SECURITY" })
    expect(rootDup.status).toBe(409)
    expect(rootDup.body.message).toBe('A folder named "SECURITY" already exists in "Handbook".')
  })

  it("rejects bad names, a missing parent, and a depth over 20", async () => {
    for (const name of ["", "a/b", ".", "..", "x".repeat(256)]) {
      expect((await post({ parent_id: null, name })).status).toBe(400)
    }
    expect((await post({ parent_id: crypto.randomUUID(), name: "A" })).status).toBe(404)
    let parent = null
    for (let i = 0; i < 20; i++) parent = await mk(`L${i}`, parent?.id ?? null)
    const deep = await post({ parent_id: parent.id, name: "L20" })
    expect(deep.status).toBe(422)
  })

  it("returns 403 to a viewer on create", async () => {
    const viewer = await createTestUser()
    await addWorkspaceMember(ws.id, viewer.id, ws.roles.viewer)
    expect((await post({ parent_id: null, name: "A" }, viewer)).status).toBe(403)
  })

  it("renames a folder and maps a case-only duplicate to 409", async () => {
    const a = await mk("Alpha")
    await mk("Beta")
    const ok = await put(a.id, { name: "Gamma" })
    expect(ok.status).toBe(200)
    expect(ok.body.data.name).toBe("Gamma")
    const audit = await db("audit_logs").where({ entity_id: a.id, action: "updated" }).first()
    expect(audit.changes).toEqual({ name: { from: "Alpha", to: "Gamma" } })
    const dup = await put(a.id, { name: "beta" })
    expect(dup.status).toBe(409)
    expect(dup.body.message).toBe('A folder named "beta" already exists in "Handbook".')
    expect((await put(crypto.randomUUID(), { name: "X" })).status).toBe(404)
  })
})
