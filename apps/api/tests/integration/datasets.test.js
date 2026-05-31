import crypto from "node:crypto"
import { vi } from "vitest"
import db from "../../src/config/database.js"
import * as datasetModel from "../../src/models/datasets.js"
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

  it("returns file_count 0 and total_size_mb 0 for a newly created dataset", async () => {
    const user = await createTestUser()
    const ws = await createTestWorkspace(user.id)
    const res = await (
      await request()
    )
      .post(`/api/workspaces/${ws.id}/datasets`)
      .set(await getAuthHeaders(user.id))
      .send({ name: "Brand New" })

    expect(res.status).toBe(201)
    expect(res.body.data.file_count).toBe(0)
    expect(res.body.data.total_size_mb).toBe(0)
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

  it("returns file_count and total_size_mb aggregated across all non-deleted files", async () => {
    const user = await createTestUser()
    const ws = await createTestWorkspace(user.id)
    const createRes = await (
      await request()
    )
      .post(`/api/workspaces/${ws.id}/datasets`)
      .set(await getAuthHeaders(user.id))
      .send({ name: "Stats Dataset" })
    const dsId = createRes.body.data.id

    await db("dataset_files").insert([
      {
        id: crypto.randomUUID(),
        dataset_id: dsId,
        workspace_id: ws.id,
        filename: "a.pdf",
        mime_type: "application/pdf",
        file_size_bytes: 2 * 1024 * 1024,
        storage_provider: "r2",
        storage_path: "test/a.pdf",
        status: "completed",
        metadata: JSON.stringify({}),
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: crypto.randomUUID(),
        dataset_id: dsId,
        workspace_id: ws.id,
        filename: "b.pdf",
        mime_type: "application/pdf",
        file_size_bytes: 3 * 1024 * 1024,
        storage_provider: "r2",
        storage_path: "test/b.pdf",
        status: "pending",
        metadata: JSON.stringify({}),
        created_at: new Date(),
        updated_at: new Date(),
      },
    ])

    const res = await (await request())
      .get(`/api/workspaces/${ws.id}/datasets`)
      .set(await getAuthHeaders(user.id))

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    const ds = res.body.data[0]
    expect(ds.file_count).toBe(2)
    expect(Number(ds.total_size_mb)).toBeCloseTo(5, 1)
  })

  it("returns file_count 0 and total_size_mb 0 when dataset has no files", async () => {
    const user = await createTestUser()
    const ws = await createTestWorkspace(user.id)
    await (
      await request()
    )
      .post(`/api/workspaces/${ws.id}/datasets`)
      .set(await getAuthHeaders(user.id))
      .send({ name: "Empty Dataset" })

    const res = await (await request())
      .get(`/api/workspaces/${ws.id}/datasets`)
      .set(await getAuthHeaders(user.id))

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    const ds = res.body.data[0]
    expect(ds.file_count).toBe(0)
    expect(Number(ds.total_size_mb)).toBe(0)
  })

  it("excludes soft-deleted files from file_count and total_size_mb", async () => {
    const user = await createTestUser()
    const ws = await createTestWorkspace(user.id)
    const createRes = await (
      await request()
    )
      .post(`/api/workspaces/${ws.id}/datasets`)
      .set(await getAuthHeaders(user.id))
      .send({ name: "Partial Deleted" })
    const dsId = createRes.body.data.id

    await db("dataset_files").insert([
      {
        id: crypto.randomUUID(),
        dataset_id: dsId,
        workspace_id: ws.id,
        filename: "active.pdf",
        mime_type: "application/pdf",
        file_size_bytes: 1 * 1024 * 1024,
        storage_provider: "r2",
        storage_path: "test/active.pdf",
        status: "completed",
        metadata: JSON.stringify({}),
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: crypto.randomUUID(),
        dataset_id: dsId,
        workspace_id: ws.id,
        filename: "deleted.pdf",
        mime_type: "application/pdf",
        file_size_bytes: 4 * 1024 * 1024,
        storage_provider: "r2",
        storage_path: "test/deleted.pdf",
        status: "completed",
        metadata: JSON.stringify({}),
        deleted_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      },
    ])

    const res = await (await request())
      .get(`/api/workspaces/${ws.id}/datasets`)
      .set(await getAuthHeaders(user.id))

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    const ds = res.body.data[0]
    expect(ds.file_count).toBe(1)
    expect(Number(ds.total_size_mb)).toBeCloseTo(1, 1)
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

  it("returns file_count and total_size_mb in the update response", async () => {
    const user = await createTestUser()
    const ws = await createTestWorkspace(user.id)
    const createRes = await (
      await request()
    )
      .post(`/api/workspaces/${ws.id}/datasets`)
      .set(await getAuthHeaders(user.id))
      .send({ name: "Original Name" })
    const dsId = createRes.body.data.id

    await db("dataset_files").insert({
      id: crypto.randomUUID(),
      dataset_id: dsId,
      workspace_id: ws.id,
      filename: "report.pdf",
      mime_type: "application/pdf",
      file_size_bytes: 1 * 1024 * 1024,
      storage_provider: "r2",
      storage_path: "test/report.pdf",
      status: "completed",
      metadata: JSON.stringify({}),
      created_at: new Date(),
      updated_at: new Date(),
    })

    const res = await (
      await request()
    )
      .put(`/api/workspaces/${ws.id}/datasets/${dsId}`)
      .set(await getAuthHeaders(user.id))
      .send({ name: "Renamed" })

    expect(res.status).toBe(200)
    expect(res.body.data.name).toBe("Renamed")
    expect(res.body.data.file_count).toBe(1)
    expect(Number(res.body.data.total_size_mb)).toBeCloseTo(1, 1)
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

describe("GET /api/workspaces/:id/datasets/:dataset_id", () => {
  it("returns file_count and total_size_mb for a single dataset", async () => {
    const user = await createTestUser()
    const ws = await createTestWorkspace(user.id)
    const createRes = await (
      await request()
    )
      .post(`/api/workspaces/${ws.id}/datasets`)
      .set(await getAuthHeaders(user.id))
      .send({ name: "Single Stats" })
    const dsId = createRes.body.data.id

    await db("dataset_files").insert({
      id: crypto.randomUUID(),
      dataset_id: dsId,
      workspace_id: ws.id,
      filename: "doc.pdf",
      mime_type: "application/pdf",
      file_size_bytes: 512 * 1024,
      storage_provider: "r2",
      storage_path: "test/doc.pdf",
      status: "completed",
      metadata: JSON.stringify({}),
      created_at: new Date(),
      updated_at: new Date(),
    })

    const res = await (await request())
      .get(`/api/workspaces/${ws.id}/datasets/${dsId}`)
      .set(await getAuthHeaders(user.id))

    expect(res.status).toBe(200)
    expect(res.body.data.file_count).toBe(1)
    expect(Number(res.body.data.total_size_mb)).toBeCloseTo(0.5, 2)
  })

  it("excludes soft-deleted files from file_count and total_size_mb", async () => {
    const user = await createTestUser()
    const ws = await createTestWorkspace(user.id)
    const createRes = await (
      await request()
    )
      .post(`/api/workspaces/${ws.id}/datasets`)
      .set(await getAuthHeaders(user.id))
      .send({ name: "Single Soft Delete" })
    const dsId = createRes.body.data.id

    await db("dataset_files").insert([
      {
        id: crypto.randomUUID(),
        dataset_id: dsId,
        workspace_id: ws.id,
        filename: "active.pdf",
        mime_type: "application/pdf",
        file_size_bytes: 2 * 1024 * 1024,
        storage_provider: "r2",
        storage_path: "test/active-single.pdf",
        status: "completed",
        metadata: JSON.stringify({}),
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: crypto.randomUUID(),
        dataset_id: dsId,
        workspace_id: ws.id,
        filename: "deleted.pdf",
        mime_type: "application/pdf",
        file_size_bytes: 5 * 1024 * 1024,
        storage_provider: "r2",
        storage_path: "test/deleted-single.pdf",
        status: "completed",
        metadata: JSON.stringify({}),
        deleted_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      },
    ])

    const res = await (await request())
      .get(`/api/workspaces/${ws.id}/datasets/${dsId}`)
      .set(await getAuthHeaders(user.id))

    expect(res.status).toBe(200)
    expect(res.body.data.file_count).toBe(1)
    expect(Number(res.body.data.total_size_mb)).toBeCloseTo(2, 1)
  })
})

describe("datasetModel.findManyPaginated — aggregate sort guard", () => {
  it("does not table-prefix aggregate alias columns in orderBy", async () => {
    const user = await createTestUser()
    const ws = await createTestWorkspace(user.id)

    // Before fix: throws "ERROR: column datasets.file_count does not exist"
    // After fix: returns empty array without error
    const result = await datasetModel.findManyPaginated(
      { workspace_id: ws.id },
      { limit: 10, offset: 0, orders: [{ column: "file_count", order: "asc" }] },
    )
    expect(Array.isArray(result)).toBe(true)
  })
})
