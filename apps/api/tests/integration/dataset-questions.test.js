import crypto from "node:crypto"
import { beforeAll, beforeEach, describe, it, expect } from "vitest"
import db from "../../src/config/database.js"
import {
  request,
  createTestUser,
  createTestWorkspace,
  getAuthHeaders,
  addWorkspaceMember,
  cleanAllTables,
  seedPermissions,
} from "../helpers.js"

let owner, ws, dsId, completedFileId, processingFileId

/** Create a custom role holding exactly the given permission names; return its id. */
async function createRoleWithPermissions(workspaceId, headers, name, permissionNames) {
  const perms = await db("permissions").whereIn("name", permissionNames).select("id")
  const res = await (
    await request()
  )
    .post(`/api/workspaces/${workspaceId}/roles`)
    .set(headers)
    .send({ name, permission_ids: perms.map((p) => p.id) })
  return res.body.data.id
}

beforeAll(async () => {
  await seedPermissions()
})

beforeEach(async () => {
  await cleanAllTables()
  owner = await createTestUser()
  ws = await createTestWorkspace(owner.id)
  dsId = crypto.randomUUID()
  await db("datasets").insert({
    id: dsId,
    workspace_id: ws.id,
    name: "DS",
    created_at: new Date(),
    updated_at: new Date(),
  })
  completedFileId = crypto.randomUUID()
  processingFileId = crypto.randomUUID()
  await db("dataset_files").insert([
    {
      id: completedFileId,
      dataset_id: dsId,
      workspace_id: ws.id,
      filename: "c.md",
      status: "completed",
      chunk_count: 0,
      metadata: JSON.stringify({}),
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: processingFileId,
      dataset_id: dsId,
      workspace_id: ws.id,
      filename: "p.md",
      status: "processing",
      chunk_count: 0,
      metadata: JSON.stringify({}),
      created_at: new Date(),
      updated_at: new Date(),
    },
  ])
  await db("dataset_file_questions").insert([
    { id: crypto.randomUUID(), dataset_file_id: completedFileId, question: "Q1?" },
    { id: crypto.randomUUID(), dataset_file_id: completedFileId, question: "Q2?" },
    { id: crypto.randomUUID(), dataset_file_id: completedFileId, question: "Q3?" },
    { id: crypto.randomUUID(), dataset_file_id: processingFileId, question: "Q processing?" },
  ])
})

describe("GET /api/workspaces/:id/datasets/:id/questions", () => {
  it("returns sampled questions from completed files only", async () => {
    const res = await (await request())
      .get(`/api/workspaces/${ws.id}/datasets/${dsId}/questions`)
      .set(await getAuthHeaders(owner.id))

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data.length).toBe(3)
    expect(res.body.data.map((q) => q.question)).not.toContain("Q processing?")
  })

  it("clamps to the requested limit", async () => {
    const res = await (await request())
      .get(`/api/workspaces/${ws.id}/datasets/${dsId}/questions?limit=2`)
      .set(await getAuthHeaders(owner.id))

    expect(res.status).toBe(200)
    expect(res.body.data.length).toBe(2)
  })

  it("rejects a limit above the maximum", async () => {
    const res = await (await request())
      .get(`/api/workspaces/${ws.id}/datasets/${dsId}/questions?limit=999`)
      .set(await getAuthHeaders(owner.id))

    expect(res.status).toBe(400)
  })

  it("returns 404 for a dataset that does not exist in the workspace", async () => {
    const res = await (await request())
      .get(`/api/workspaces/${ws.id}/datasets/${crypto.randomUUID()}/questions`)
      .set(await getAuthHeaders(owner.id))

    expect(res.status).toBe(404)
  })

  it("returns 403 for a member without file:read", async () => {
    const roleId = await createRoleWithPermissions(
      ws.id,
      await getAuthHeaders(owner.id),
      "No Files",
      ["dataset:read"],
    )
    const member = await createTestUser()
    await addWorkspaceMember(ws.id, member.id, roleId)

    const res = await (await request())
      .get(`/api/workspaces/${ws.id}/datasets/${dsId}/questions`)
      .set(await getAuthHeaders(member.id))

    expect(res.status).toBe(403)
  })
})
