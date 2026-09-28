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
import * as datasetFileModel from "../../src/models/dataset-files.js"
import * as folderModel from "../../src/models/dataset-folders.js"
import * as storageService from "../../src/services/storage.js"
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

const mk = (name, parentId = null) =>
  folderModel.create({ datasetId: dsId, workspaceId: ws.id, parentId, name })
const upload = async (folderId) =>
  (await request())
    .post(`${baseUrl()}/upload`)
    .set(await getAuthHeaders(user.id))
    .field("folder_id", folderId)
    .attach("file", Buffer.from("x"), "in-folder.txt")
const newFile = (filename, status) =>
  datasetFileModel.create({
    dataset_id: dsId,
    workspace_id: ws.id,
    filename,
    mime_type: "text/markdown",
    file_size_bytes: 1,
    status,
  })

describe("file folder fields", () => {
  it("uploads into a folder and returns the path on GET", async () => {
    const a = await mk("A")
    const b = await mk("B", a.id)
    const res = await upload(b.id)
    expect(res.status).toBe(201)
    expect(res.body.data.folder_id).toBe(b.id)
    const got = await (await request())
      .get(`${baseUrl()}/${res.body.data.id}`)
      .set(await getAuthHeaders(user.id))
    expect(got.body.data.path).toEqual([
      { id: a.id, name: "A" },
      { id: b.id, name: "B" },
    ])
  })

  it("returns an empty path for a file at the root", async () => {
    const [f] = await newFile("root.md", "completed")
    const got = await (await request())
      .get(`${baseUrl()}/${f.id}`)
      .set(await getAuthHeaders(user.id))
    expect(got.status).toBe(200)
    expect(got.body.data.folder_id).toBeNull()
    expect(got.body.data.path).toEqual([])
  })

  it("returns 404 before the storage upload for a missing folder", async () => {
    const res = await upload(crypto.randomUUID())
    expect(res.status).toBe(404)
    expect(storageService.uploadFile).not.toHaveBeenCalled()
  })

  it("returns 400 for a folder_id that is not a UUID", async () => {
    const res = await upload("nope")
    expect(res.status).toBe(400)
    expect(storageService.uploadFile).not.toHaveBeenCalled()
  })

  it("returns 404 and leaves no orphan when a delete removes the folder during the upload", async () => {
    const a = await mk("A")
    vi.mocked(storageService.uploadFile).mockImplementationOnce(async (key) => {
      await db("dataset_folders").where({ id: a.id }).update({ deleted_at: new Date() })
      return key
    })
    const res = await upload(a.id)
    expect(res.status).toBe(404)
    expect(await db("dataset_files").where({ filename: "in-folder.txt" })).toHaveLength(0)
    expect(storageService.deleteFile).toHaveBeenCalledWith(
      vi.mocked(storageService.uploadFile).mock.calls[0][0],
    )
  })

  it("makes lockForInsert wait for an open folder delete and then find no folder", async () => {
    const a = await mk("A")
    const del = await db.transaction()
    await del("dataset_folders").where({ id: a.id }).update({ deleted_at: new Date() })
    const pending = db.transaction((trx) =>
      folderModel.lockForInsert({ id: a.id, datasetId: dsId }, trx),
    )
    await new Promise((r) => setTimeout(r, 200))
    await del.commit()
    expect(await pending).toBeUndefined()
  })

  it("scrapes into a folder and rejects a bad folder_id", async () => {
    const a = await mk("A")
    const post = async (body) =>
      (await request())
        .post(`${baseUrl()}/scrape-url`)
        .set(await getAuthHeaders(user.id))
        .send(body)
    const ok = await post({ url: "https://example.com/page", folder_id: a.id })
    expect(ok.status).toBe(201)
    expect(ok.body.data.folder_id).toBe(a.id)
    expect((await post({ url: "https://example.com/page", folder_id: "nope" })).status).toBe(400)
    expect(
      (await post({ url: "https://example.com/page", folder_id: crypto.randomUUID() })).status,
    ).toBe(404)
  })

  it("adds a YouTube video into a folder", async () => {
    const a = await mk("A")
    const res = await (
      await request()
    )
      .post(`${baseUrl()}/youtube`)
      .set(await getAuthHeaders(user.id))
      .send({ url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", folder_id: a.id })
    expect(res.status).toBe(201)
    expect(res.body.data.folder_id).toBe(a.id)
  })

  it("returns the status of active files only", async () => {
    const [f1] = await newFile("a.md", "queued")
    const [f2] = await newFile("b.md", "failed")
    await db("dataset_files").where({ id: f2.id }).update({ deleted_at: new Date() })
    const post = async (ids) =>
      (await request())
        .post(`${baseUrl()}/status`)
        .set(await getAuthHeaders(user.id))
        .send({ ids })
    const res = await post([f1.id, f2.id])
    expect(res.status).toBe(200)
    expect(res.body.data).toEqual([
      { id: f1.id, status: "queued", chunk_count: 0, error_message: null },
    ])
    expect((await post(Array.from({ length: 101 }, () => crypto.randomUUID()))).status).toBe(400)
    expect((await post([])).status).toBe(400)
  })
})
