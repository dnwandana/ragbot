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

vi.mock("../../src/services/email.js", () => ({
  sendVerificationEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  sendInvitationEmail: vi.fn(),
}))

let user, ws, otherDsId

const insertDataset = async (workspaceId) => {
  const id = crypto.randomUUID()
  await db("datasets").insert({
    id,
    workspace_id: workspaceId,
    name: "DS",
    created_at: new Date(),
    updated_at: new Date(),
  })
  return id
}

beforeAll(async () => {
  await seedPermissions()
})
beforeEach(async () => {
  await cleanAllTables()
  user = await createTestUser()
  ws = await createTestWorkspace(user.id)
  const other = await createTestUser()
  const otherWs = await createTestWorkspace(other.id)
  otherDsId = await insertDataset(otherWs.id)
  await db("dataset_files").insert({
    id: crypto.randomUUID(),
    dataset_id: otherDsId,
    workspace_id: otherWs.id,
    filename: "secret.md",
    mime_type: "text/markdown",
    file_size_bytes: 1,
    status: "completed",
    created_at: new Date(),
    updated_at: new Date(),
  })
})

describe("resolveDataset", () => {
  it("returns 404 for a dataset of a different workspace", async () => {
    const res = await (await request())
      .get(`/api/workspaces/${ws.id}/datasets/${otherDsId}/files`)
      .set(await getAuthHeaders(user.id))
    expect(res.status).toBe(404)
    expect(res.body.message).toBe("Dataset not found")
  })

  it("returns 400 for a malformed dataset id", async () => {
    const res = await (await request())
      .get(`/api/workspaces/${ws.id}/datasets/not-a-uuid/files`)
      .set(await getAuthHeaders(user.id))
    expect(res.status).toBe(400)
  })

  it("lists the files of a dataset in the workspace", async () => {
    const dsId = await insertDataset(ws.id)
    const res = await (await request())
      .get(`/api/workspaces/${ws.id}/datasets/${dsId}/files`)
      .set(await getAuthHeaders(user.id))
    expect(res.status).toBe(200)
    expect(res.body.data).toEqual([])
  })
})
