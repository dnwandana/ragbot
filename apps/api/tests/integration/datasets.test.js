import { vi } from "vitest"
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

beforeAll(async () => {
  await seedPermissions()
})
beforeEach(async () => {
  await cleanAllTables()
})

describe("POST /api/workspaces/:id/datasets", () => {
  it("creates dataset with defaults", async () => {
    const user = await createTestUser()
    const ws = await createTestWorkspace(user.id)
    const res = await (
      await request()
    )
      .post(`/api/workspaces/${ws.id}/datasets`)
      .set(await getAuthHeaders(user.id))
      .send({ name: "My Dataset" })

    expect(res.status).toBe(201)
    expect(res.body.data.name).toBe("My Dataset")
    expect(res.body.data.chunk_size).toBe(1024)
    expect(res.body.data.workspace_id).toBe(ws.id)
  })

  it("returns 400 for missing name", async () => {
    const user = await createTestUser()
    const ws = await createTestWorkspace(user.id)
    const res = await (
      await request()
    )
      .post(`/api/workspaces/${ws.id}/datasets`)
      .set(await getAuthHeaders(user.id))
      .send({})

    expect(res.status).toBe(400)
  })
})

describe("GET /api/workspaces/:id/datasets", () => {
  it("returns paginated datasets", async () => {
    const user = await createTestUser()
    const ws = await createTestWorkspace(user.id)

    await (
      await request()
    )
      .post(`/api/workspaces/${ws.id}/datasets`)
      .set(await getAuthHeaders(user.id))
      .send({ name: "Dataset A" })

    const res = await (await request())
      .get(`/api/workspaces/${ws.id}/datasets`)
      .set(await getAuthHeaders(user.id))

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.pagination).toBeDefined()
  })
})

describe("PUT /api/workspaces/:id/datasets/:dataset_id", () => {
  it("updates name only (immutable fields rejected)", async () => {
    const user = await createTestUser()
    const ws = await createTestWorkspace(user.id)
    const createRes = await (
      await request()
    )
      .post(`/api/workspaces/${ws.id}/datasets`)
      .set(await getAuthHeaders(user.id))
      .send({ name: "Original", chunk_size: 512 })
    const dsId = createRes.body.data.id

    const res = await (
      await request()
    )
      .put(`/api/workspaces/${ws.id}/datasets/${dsId}`)
      .set(await getAuthHeaders(user.id))
      .send({ name: "Renamed", chunk_size: 2048 }) // chunk_size stripped by updateSchema

    expect(res.status).toBe(200)
    expect(res.body.data.name).toBe("Renamed")
    expect(res.body.data.chunk_size).toBe(512) // unchanged
  })
})

describe("DELETE /api/workspaces/:id/datasets/:dataset_id", () => {
  it("soft-deletes dataset", async () => {
    const user = await createTestUser()
    const ws = await createTestWorkspace(user.id)
    const createRes = await (
      await request()
    )
      .post(`/api/workspaces/${ws.id}/datasets`)
      .set(await getAuthHeaders(user.id))
      .send({ name: "Delete Me" })
    const dsId = createRes.body.data.id

    const delRes = await (await request())
      .delete(`/api/workspaces/${ws.id}/datasets/${dsId}`)
      .set(await getAuthHeaders(user.id))
    expect(delRes.status).toBe(200)

    const getRes = await (await request())
      .get(`/api/workspaces/${ws.id}/datasets/${dsId}`)
      .set(await getAuthHeaders(user.id))
    expect(getRes.status).toBe(404)
  })

  it("cascades delete to files and chunks", async () => {
    const user = await createTestUser()
    const ws = await createTestWorkspace(user.id)
    const dsRes = await (
      await request()
    )
      .post(`/api/workspaces/${ws.id}/datasets`)
      .set(await getAuthHeaders(user.id))
      .send({ name: "Cascade Test" })
    const dsId = dsRes.body.data.id

    // Insert a file and a chunk directly
    const fileId = crypto.randomUUID()
    await db("dataset_files").insert({
      id: fileId,
      dataset_id: dsId,
      workspace_id: ws.id,
      filename: "test.pdf",
      mime_type: "application/pdf",
      file_size_bytes: 100,
      storage_provider: "r2",
      storage_path: "test/file.pdf",
      status: "completed",
      metadata: JSON.stringify({}),
      created_at: new Date(),
      updated_at: new Date(),
    })

    const chunkId = crypto.randomUUID()
    await db("document_chunks").insert({
      id: chunkId,
      dataset_file_id: fileId,
      content: "test chunk",
      chunk_index: 0,
      created_at: new Date(),
    })

    // Delete dataset
    const delRes = await (await request())
      .delete(`/api/workspaces/${ws.id}/datasets/${dsId}`)
      .set(await getAuthHeaders(user.id))
    expect(delRes.status).toBe(200)

    // Verify chunk is hard-deleted
    const chunk = await db("document_chunks").where({ id: chunkId }).first()
    expect(chunk).toBeUndefined()

    // Verify file is soft-deleted
    const file = await db("dataset_files").where({ id: fileId }).first()
    expect(file.deleted_at).not.toBeNull()
  })
})
