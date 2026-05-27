import { vi, beforeAll, beforeEach } from "vitest"
import db from "../../src/config/database.js"
import {
  request,
  createTestUser,
  createTestWorkspace,
  getAuthHeaders,
  cleanAllTables,
  seedPermissions,
} from "../helpers.js"
import { addProcessingJob } from "../../src/queues/file-processing.js"

vi.mock("../../src/services/email.js", () => ({
  sendVerificationEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  sendInvitationEmail: vi.fn(),
}))
vi.mock("../../src/services/llamaindex.js", () => ({
  submitParseJob: vi.fn().mockResolvedValue("mock-job-id"),
  pollForMarkdown: vi.fn().mockResolvedValue("# Mock markdown content"),
}))
vi.mock("../../src/services/storage.js", () => ({
  uploadFile: vi.fn().mockResolvedValue("mock-path"),
  deleteFile: vi.fn().mockResolvedValue(undefined),
  getSignedDownloadUrl: vi.fn().mockResolvedValue("https://mock-signed-url.example.com/file"),
}))

let user, ws, dsId

beforeAll(async () => {
  await seedPermissions()
})
beforeEach(async () => {
  vi.clearAllMocks()
  await cleanAllTables()
  user = await createTestUser()
  ws = await createTestWorkspace(user.id)
  const res = await (
    await request()
  )
    .post(`/api/workspaces/${ws.id}/datasets`)
    .set(await getAuthHeaders(user.id))
    .send({ name: "Test Dataset" })
  dsId = res.body.data.id
})

const baseUrl = () => `/api/workspaces/${ws.id}/datasets/${dsId}/files`

describe("POST .../files/upload", () => {
  it("uploads a file and returns 201 with processing status", async () => {
    const res = await (
      await request()
    )
      .post(`${baseUrl()}/upload`)
      .set(await getAuthHeaders(user.id))
      .attach("file", Buffer.from("test content"), "test.txt")

    expect(res.status).toBe(201)
    expect(res.body.data.filename).toBe("test.txt")
    expect(res.body.data.status).toBe("processing")
    const metadata = res.body.data.metadata
    expect(metadata.llamaindex_job_id).toBe("mock-job-id")
    expect(addProcessingJob).toHaveBeenCalledWith({
      datasetFileId: res.body.data.id,
      datasetId: dsId,
    })
  })

  it("returns 400 when no file is attached", async () => {
    const res = await (await request())
      .post(`${baseUrl()}/upload`)
      .set(await getAuthHeaders(user.id))

    expect(res.status).toBe(400)
  })
})

describe("POST .../files/scrape-url", () => {
  it("creates a scrape job and returns 201", async () => {
    const res = await (
      await request()
    )
      .post(`${baseUrl()}/scrape-url`)
      .set(await getAuthHeaders(user.id))
      .send({ url: "https://example.com/page" })

    expect(res.status).toBe(201)
    expect(res.body.data.filename).toMatch(/example\.com/)
    expect(res.body.data.status).toBe("processing")
    expect(res.body.data.storage_provider).toBeNull()
    const metadata = res.body.data.metadata
    expect(metadata.source_url).toBe("https://example.com/page")
  })

  it("returns 400 for an invalid URL", async () => {
    const res = await (
      await request()
    )
      .post(`${baseUrl()}/scrape-url`)
      .set(await getAuthHeaders(user.id))
      .send({ url: "not-a-url" })

    expect(res.status).toBe(400)
  })
})

describe("GET .../files", () => {
  it("returns paginated files", async () => {
    await (
      await request()
    )
      .post(`${baseUrl()}/scrape-url`)
      .set(await getAuthHeaders(user.id))
      .send({ url: "https://example.com/page" })

    const res = await (await request()).get(baseUrl()).set(await getAuthHeaders(user.id))

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.pagination).toBeDefined()
  })
})

describe("GET .../files/:file_id", () => {
  it("returns a single file with signed URL", async () => {
    const createRes = await (
      await request()
    )
      .post(`${baseUrl()}/scrape-url`)
      .set(await getAuthHeaders(user.id))
      .send({ url: "https://example.com/page" })
    const fileId = createRes.body.data.id

    const res = await (await request())
      .get(`${baseUrl()}/${fileId}`)
      .set(await getAuthHeaders(user.id))

    expect(res.status).toBe(200)
    expect(res.body.data.id).toBe(fileId)
  })

  it("returns 404 for a non-existent file", async () => {
    const res = await (await request())
      .get(`${baseUrl()}/${crypto.randomUUID()}`)
      .set(await getAuthHeaders(user.id))

    expect(res.status).toBe(404)
  })
})

describe("PUT .../files/:file_id", () => {
  it("updates filename only", async () => {
    const createRes = await (
      await request()
    )
      .post(`${baseUrl()}/scrape-url`)
      .set(await getAuthHeaders(user.id))
      .send({ url: "https://example.com/page" })
    const fileId = createRes.body.data.id

    const res = await (
      await request()
    )
      .put(`${baseUrl()}/${fileId}`)
      .set(await getAuthHeaders(user.id))
      .send({ filename: "renamed.md" })

    expect(res.status).toBe(200)
    expect(res.body.data.filename).toBe("renamed.md")
  })
})

describe("DELETE .../files/:file_id", () => {
  it("soft-deletes the file", async () => {
    const createRes = await (
      await request()
    )
      .post(`${baseUrl()}/scrape-url`)
      .set(await getAuthHeaders(user.id))
      .send({ url: "https://example.com/page" })
    const fileId = createRes.body.data.id

    const res = await (await request())
      .delete(`${baseUrl()}/${fileId}`)
      .set(await getAuthHeaders(user.id))

    expect(res.status).toBe(200)

    const getRes = await (await request())
      .get(`${baseUrl()}/${fileId}`)
      .set(await getAuthHeaders(user.id))
    expect(getRes.status).toBe(404)
  })
})

describe("POST .../files/:file_id/reprocess", () => {
  it("resets a completed file to processing", async () => {
    const createRes = await (
      await request()
    )
      .post(`${baseUrl()}/scrape-url`)
      .set(await getAuthHeaders(user.id))
      .send({ url: "https://example.com/page" })
    const fileId = createRes.body.data.id

    await db("dataset_files").where({ id: fileId }).update({ status: "completed" })

    const res = await (await request())
      .post(`${baseUrl()}/${fileId}/reprocess`)
      .set(await getAuthHeaders(user.id))

    expect(res.status).toBe(200)
    const file = await db("dataset_files").where({ id: fileId }).first()
    expect(file.status).toBe("processing")
  })

  it("returns 400 when file is already in processing state", async () => {
    const createRes = await (
      await request()
    )
      .post(`${baseUrl()}/scrape-url`)
      .set(await getAuthHeaders(user.id))
      .send({ url: "https://example.com/page" })
    const fileId = createRes.body.data.id

    // File is already "processing" from scrape-url
    const res = await (await request())
      .post(`${baseUrl()}/${fileId}/reprocess`)
      .set(await getAuthHeaders(user.id))

    expect(res.status).toBe(400)
  })
})
