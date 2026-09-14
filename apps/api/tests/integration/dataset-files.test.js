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
import * as llamaindexService from "../../src/services/llamaindex.js"
import * as datasetFileModel from "../../src/models/dataset-files.js"
import { isSandboxEnabled } from "../../src/services/sandbox.js"

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
vi.mock("node:dns/promises", () => ({
  lookup: vi.fn().mockResolvedValue([{ address: "93.184.216.34", family: 4 }]),
}))

let user, ws, dsId

beforeAll(async () => {
  await seedPermissions()
})
beforeEach(async () => {
  vi.clearAllMocks()
  vi.mocked(isSandboxEnabled).mockReturnValue(false)
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

  it("returns 400 for a disallowed file extension", async () => {
    const res = await (
      await request()
    )
      .post(`${baseUrl()}/upload`)
      .set(await getAuthHeaders(user.id))
      .attach("file", Buffer.from("MZ..."), "malware.exe")

    expect(res.status).toBe(400)
  })

  const uploadTestFile = async (filename, content) =>
    (await request())
      .post(`${baseUrl()}/upload`)
      .set(await getAuthHeaders(user.id))
      .attach("file", Buffer.from(content), filename)

  describe("tabular uploads", () => {
    beforeEach(() => {
      vi.mocked(isSandboxEnabled).mockReturnValue(true)
    })

    it("accepts a .tsv upload", async () => {
      const res = await uploadTestFile("data.tsv", "a\tb\n1\t2")
      expect(res.status).toBe(201)
    })

    it("accepts a .json upload and marks it tabular", async () => {
      const res = await uploadTestFile("data.json", '[{"a":1}]')
      expect(res.status).toBe(201)
      const metadata = res.body.data.metadata
      expect(metadata.source_type).toBe("tabular")
      expect(metadata.llamaindex_job_id).toBeUndefined()
    })

    it("marks a .csv upload tabular and skips the parse job", async () => {
      const res = await uploadTestFile("data.csv", "a,b\n1,2")
      expect(res.status).toBe(201)
      expect(res.body.data.metadata.source_type).toBe("tabular")
      expect(llamaindexService.submitParseJob).not.toHaveBeenCalled()
    })

    it("still routes a .pdf through LlamaIndex", async () => {
      const res = await uploadTestFile("doc.pdf", "%PDF-1.4 fake")
      expect(res.status).toBe(201)
      expect(res.body.data.metadata.source_type).toBeUndefined()
      expect(llamaindexService.submitParseJob).toHaveBeenCalled()
    })
  })

  describe("tabular uploads with the sandbox disabled", () => {
    beforeEach(() => {
      vi.mocked(isSandboxEnabled).mockReturnValue(false)
    })

    it("routes a .csv upload through LlamaIndex", async () => {
      const res = await uploadTestFile("data.csv", "a,b\n1,2")
      expect(res.status).toBe(201)
      expect(res.body.data.metadata.source_type).toBeUndefined()
      expect(res.body.data.metadata.llamaindex_job_id).toBe("mock-job-id")
      expect(llamaindexService.submitParseJob).toHaveBeenCalled()
    })

    it("rejects a .tsv upload with 400", async () => {
      const res = await uploadTestFile("data.tsv", "a\tb\n1\t2")
      expect(res.status).toBe(400)
      expect(llamaindexService.submitParseJob).not.toHaveBeenCalled()
    })

    it("rejects a .json upload with 400", async () => {
      const res = await uploadTestFile("data.json", '[{"a":1}]')
      expect(res.status).toBe(400)
    })
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
    expect(res.body.data.filename).toBe("example-com-page.md")
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

  it("returns 400 for a cloud-metadata / link-local URL", async () => {
    const res = await (
      await request()
    )
      .post(`${baseUrl()}/scrape-url`)
      .set(await getAuthHeaders(user.id))
      .send({ url: "http://169.254.169.254/latest/meta-data" })

    expect(res.status).toBe(400)
  })

  it("returns 400 for a localhost URL", async () => {
    const res = await (
      await request()
    )
      .post(`${baseUrl()}/scrape-url`)
      .set(await getAuthHeaders(user.id))
      .send({ url: "http://localhost:3000/admin" })

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

  it("re-enqueues a tabular file on the file-processing queue", async () => {
    vi.mocked(isSandboxEnabled).mockReturnValue(true)
    const createRes = await (
      await request()
    )
      .post(`${baseUrl()}/upload`)
      .set(await getAuthHeaders(user.id))
      .attach("file", Buffer.from("a,b\n1,2"), "cities.csv")
    const fileId = createRes.body.data.id

    await db("dataset_files").where({ id: fileId }).update({ status: "completed" })
    vi.mocked(addProcessingJob).mockClear()

    const res = await (await request())
      .post(`${baseUrl()}/${fileId}/reprocess`)
      .set(await getAuthHeaders(user.id))

    expect(res.status).toBe(200)
    expect(addProcessingJob).toHaveBeenCalledWith({ datasetFileId: fileId, datasetId: dsId })
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

describe("GET .../files/:file_id/questions", () => {
  it("returns the file's exploration questions", async () => {
    const createRes = await (
      await request()
    )
      .post(`${baseUrl()}/scrape-url`)
      .set(await getAuthHeaders(user.id))
      .send({ url: "https://example.com/page" })
    const fileId = createRes.body.data.id

    await db("dataset_file_questions").insert([
      {
        id: crypto.randomUUID(),
        dataset_file_id: fileId,
        question: "What is this about?",
        created_at: new Date(),
      },
      {
        id: crypto.randomUUID(),
        dataset_file_id: fileId,
        question: "How does it work?",
        created_at: new Date(),
      },
    ])

    const res = await (await request())
      .get(`${baseUrl()}/${fileId}/questions`)
      .set(await getAuthHeaders(user.id))

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(2)
    expect(res.body.data.map((q) => q.question)).toContain("What is this about?")
  })

  it("returns 404 for a non-existent file", async () => {
    const res = await (await request())
      .get(`${baseUrl()}/${crypto.randomUUID()}/questions`)
      .set(await getAuthHeaders(user.id))
    expect(res.status).toBe(404)
  })
})

describe("GET .../files/:file_id/chunks", () => {
  it("returns paginated chunks without embeddings", async () => {
    const createRes = await (
      await request()
    )
      .post(`${baseUrl()}/scrape-url`)
      .set(await getAuthHeaders(user.id))
      .send({ url: "https://example.com/page" })
    const fileId = createRes.body.data.id

    for (let i = 0; i < 3; i++) {
      await db("dataset_file_chunks").insert({
        id: crypto.randomUUID(),
        dataset_file_id: fileId,
        content: `chunk ${i}`,
        chunk_index: i,
        created_at: new Date(),
      })
    }

    const res = await (await request())
      .get(`${baseUrl()}/${fileId}/chunks?limit=2&sort_order=asc`)
      .set(await getAuthHeaders(user.id))

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(2)
    expect(res.body.data[0].chunk_index).toBe(0)
    expect(res.body.data[0]).not.toHaveProperty("embedding")
    expect(res.body.pagination.total_items).toBe(3)
  })

  it("returns 404 for a non-existent file", async () => {
    const res = await (await request())
      .get(`${baseUrl()}/${crypto.randomUUID()}/chunks`)
      .set(await getAuthHeaders(user.id))
    expect(res.status).toBe(404)
  })

  it("defaults to ascending chunk_index when sort_order is omitted", async () => {
    const createRes = await (
      await request()
    )
      .post(`${baseUrl()}/scrape-url`)
      .set(await getAuthHeaders(user.id))
      .send({ url: "https://example.com/page" })
    const fileId = createRes.body.data.id

    for (let i = 0; i < 3; i++) {
      await db("dataset_file_chunks").insert({
        id: crypto.randomUUID(),
        dataset_file_id: fileId,
        content: `chunk ${i}`,
        chunk_index: i,
        created_at: new Date(),
      })
    }

    const res = await (await request())
      .get(`${baseUrl()}/${fileId}/chunks`)
      .set(await getAuthHeaders(user.id))

    expect(res.status).toBe(200)
    expect(res.body.data[0].chunk_index).toBe(0)
  })

  it("honours explicit sort_order=desc", async () => {
    const createRes = await (
      await request()
    )
      .post(`${baseUrl()}/scrape-url`)
      .set(await getAuthHeaders(user.id))
      .send({ url: "https://example.com/page" })
    const fileId = createRes.body.data.id

    for (let i = 0; i < 3; i++) {
      await db("dataset_file_chunks").insert({
        id: crypto.randomUUID(),
        dataset_file_id: fileId,
        content: `chunk ${i}`,
        chunk_index: i,
        created_at: new Date(),
      })
    }

    const res = await (await request())
      .get(`${baseUrl()}/${fileId}/chunks?sort_order=desc`)
      .set(await getAuthHeaders(user.id))

    expect(res.status).toBe(200)
    expect(res.body.data[0].chunk_index).toBe(2)
  })
})

describe("cross-tenant isolation on file reads", () => {
  it("returns 404 when the file belongs to another workspace", async () => {
    const otherUser = await createTestUser()
    const otherWs = await createTestWorkspace(otherUser.id)
    const otherDsId = crypto.randomUUID()
    await db("datasets").insert({
      id: otherDsId,
      workspace_id: otherWs.id,
      name: "Other DS",
      embedding_model: "text-embedding-3-small",
      chunk_size: 1024,
      chunk_overlap: 128,
      settings: JSON.stringify({}),
      created_at: new Date(),
      updated_at: new Date(),
    })
    const otherFileId = crypto.randomUUID()
    await db("dataset_files").insert({
      id: otherFileId,
      dataset_id: otherDsId,
      workspace_id: otherWs.id,
      filename: "other.md",
      status: "completed",
      chunk_count: 0,
      metadata: JSON.stringify({}),
      created_at: new Date(),
      updated_at: new Date(),
    })

    const inserted = await db("dataset_files").where({ id: otherFileId }).first()
    expect(inserted).toBeDefined()

    const questionsRes = await (await request())
      .get(`${baseUrl()}/${otherFileId}/questions`)
      .set(await getAuthHeaders(user.id))
    expect(questionsRes.status).toBe(404)

    const chunksRes = await (await request())
      .get(`${baseUrl()}/${otherFileId}/chunks`)
      .set(await getAuthHeaders(user.id))
    expect(chunksRes.status).toBe(404)
  })
})

describe("question deletion cascades", () => {
  it("deletes the file's questions when the file is deleted", async () => {
    const createRes = await (
      await request()
    )
      .post(`${baseUrl()}/scrape-url`)
      .set(await getAuthHeaders(user.id))
      .send({ url: "https://example.com/page" })
    const fileId = createRes.body.data.id
    await db("dataset_file_questions").insert({
      id: crypto.randomUUID(),
      dataset_file_id: fileId,
      question: "Q?",
      created_at: new Date(),
    })

    await (await request()).delete(`${baseUrl()}/${fileId}`).set(await getAuthHeaders(user.id))

    expect(await db("dataset_file_questions").where({ dataset_file_id: fileId })).toHaveLength(0)
  })

  it("deletes questions when the parent dataset is deleted", async () => {
    const createRes = await (
      await request()
    )
      .post(`${baseUrl()}/scrape-url`)
      .set(await getAuthHeaders(user.id))
      .send({ url: "https://example.com/page" })
    const fileId = createRes.body.data.id
    await db("dataset_file_questions").insert({
      id: crypto.randomUUID(),
      dataset_file_id: fileId,
      question: "Q?",
      created_at: new Date(),
    })

    await (await request())
      .delete(`/api/workspaces/${ws.id}/datasets/${dsId}`)
      .set(await getAuthHeaders(user.id))

    expect(await db("dataset_file_questions").where({ dataset_file_id: fileId })).toHaveLength(0)
  })
})

describe("findCompletedTabularByDatasetIds", () => {
  /** Inserts one dataset_files row with the given overrides. */
  const insertFile = async (overrides) => {
    const id = crypto.randomUUID()
    await db("dataset_files").insert({
      id,
      dataset_id: dsId,
      workspace_id: ws.id,
      filename: "data.csv",
      mime_type: "text/csv",
      file_size_bytes: 10,
      storage_provider: "r2",
      storage_path: `datasets/${dsId}/${id}.csv`,
      status: "completed",
      metadata: JSON.stringify({ source_type: "tabular" }),
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides,
    })
    return id
  }

  it("finds only completed tabular files in the workspace", async () => {
    const tabularId = await insertFile({})
    await insertFile({ filename: "doc.pdf", metadata: JSON.stringify({}) })
    await insertFile({ status: "pending" })

    // A completed tabular file in another workspace must stay invisible.
    const otherUser = await createTestUser()
    const otherWs = await createTestWorkspace(otherUser.id)
    const otherDsRes = await (
      await request()
    )
      .post(`/api/workspaces/${otherWs.id}/datasets`)
      .set(await getAuthHeaders(otherUser.id))
      .send({ name: "Other Dataset" })
    const otherDsId = otherDsRes.body.data.id
    const otherFileId = crypto.randomUUID()
    await db("dataset_files").insert({
      id: otherFileId,
      dataset_id: otherDsId,
      workspace_id: otherWs.id,
      filename: "other.csv",
      mime_type: "text/csv",
      file_size_bytes: 10,
      storage_provider: "r2",
      storage_path: `datasets/${otherDsId}/${otherFileId}.csv`,
      status: "completed",
      metadata: JSON.stringify({ source_type: "tabular" }),
      created_at: new Date(),
      updated_at: new Date(),
    })

    const rows = await datasetFileModel.findCompletedTabularByDatasetIds([dsId, otherDsId], ws.id)

    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe(tabularId)
    const metadata =
      typeof rows[0].metadata === "string" ? JSON.parse(rows[0].metadata) : rows[0].metadata
    expect(metadata.source_type).toBe("tabular")
  })

  it("ignores soft-deleted files", async () => {
    await insertFile({ deleted_at: new Date() })

    const rows = await datasetFileModel.findCompletedTabularByDatasetIds([dsId], ws.id)

    expect(rows).toEqual([])
  })
})
