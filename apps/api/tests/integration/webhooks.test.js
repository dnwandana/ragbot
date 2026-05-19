import { expect, beforeEach, afterAll, vi } from "vitest"
import db from "../../src/config/database.js"
import { request, cleanAllTables, createTestUser, createTestWorkspace } from "../helpers.js"

vi.mock("../../src/services/email.js", () => ({
  sendVerificationEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  sendInvitationEmail: vi.fn(),
}))

const WEBHOOK_SECRET = "test-webhook-secret-min-16-ch"
process.env.LLAMAINDEX_WEBHOOK_SECRET = WEBHOOK_SECRET

let jobId
let fileId
let datasetId
let workspaceId

beforeEach(async () => {
  await cleanAllTables()

  const user = await createTestUser()
  const workspace = await createTestWorkspace(user.id)
  workspaceId = workspace.id

  datasetId = crypto.randomUUID()
  await db("datasets").insert({
    id: datasetId,
    workspace_id: workspaceId,
    name: "Test Dataset",
    created_at: new Date(),
    updated_at: new Date(),
  })

  jobId = crypto.randomUUID()
  fileId = crypto.randomUUID()
  await db("dataset_files").insert({
    id: fileId,
    dataset_id: datasetId,
    workspace_id: workspaceId,
    filename: "document.pdf",
    mime_type: "application/pdf",
    file_size_bytes: 1024,
    storage_path: `test/${fileId}.pdf`,
    status: "processing",
    metadata: { llamaindex_job_id: jobId },
    created_at: new Date(),
    updated_at: new Date(),
  })
})

afterAll(cleanAllTables)

describe("POST /api/webhooks/llamaindex/callback", () => {
  it("returns 200 and enqueues a job on parse.success", async () => {
    const res = await (
      await request()
    )
      .post("/api/webhooks/llamaindex/callback")
      .set("X-Webhook-Secret", WEBHOOK_SECRET)
      .send({
        event_type: "parse.success",
        event_id: crypto.randomUUID(),
        data: { id: jobId, job_id: jobId },
      })

    expect(res.status).toBe(200)
    expect(res.body.message).toBe("OK")
    expect(res.body.data).toBeNull()
  })

  it("returns 200 and marks the file failed on parse.error", async () => {
    const res = await (
      await request()
    )
      .post("/api/webhooks/llamaindex/callback")
      .set("X-Webhook-Secret", WEBHOOK_SECRET)
      .send({
        event_type: "parse.error",
        event_id: crypto.randomUUID(),
        data: { id: jobId, job_id: jobId },
      })

    expect(res.status).toBe(200)

    const file = await db("dataset_files").where({ id: fileId }).first()
    expect(file.status).toBe("failed")
    expect(file.error_message).toBe("LlamaIndex parsing failed")
  })

  it("returns 200 silently when job ID is not found in DB", async () => {
    const res = await (
      await request()
    )
      .post("/api/webhooks/llamaindex/callback")
      .set("X-Webhook-Secret", WEBHOOK_SECRET)
      .send({
        event_type: "parse.success",
        event_id: crypto.randomUUID(),
        data: { id: crypto.randomUUID(), job_id: crypto.randomUUID() },
      })

    expect(res.status).toBe(200)
  })

  it("returns 200 and takes no action for an unrecognised event_type", async () => {
    const res = await (
      await request()
    )
      .post("/api/webhooks/llamaindex/callback")
      .set("X-Webhook-Secret", WEBHOOK_SECRET)
      .send({
        event_type: "parse.running",
        event_id: crypto.randomUUID(),
        data: { id: jobId, job_id: jobId },
      })

    expect(res.status).toBe(200)

    // File status must remain unchanged
    const file = await db("dataset_files").where({ id: fileId }).first()
    expect(file.status).toBe("processing")
  })

  it("returns 400 when job ID is missing from the payload", async () => {
    const res = await (await request())
      .post("/api/webhooks/llamaindex/callback")
      .set("X-Webhook-Secret", WEBHOOK_SECRET)
      .send({
        event_type: "parse.success",
        event_id: crypto.randomUUID(),
        data: {},
      })

    expect(res.status).toBe(400)
  })

  it("returns 401 when X-Webhook-Secret header is missing", async () => {
    const res = await (await request()).post("/api/webhooks/llamaindex/callback").send({
      event_type: "parse.success",
      event_id: crypto.randomUUID(),
      data: { id: jobId, job_id: jobId },
    })

    expect(res.status).toBe(401)
  })

  it("returns 401 when X-Webhook-Secret header has wrong value", async () => {
    const res = await (
      await request()
    )
      .post("/api/webhooks/llamaindex/callback")
      .set("X-Webhook-Secret", "wrong-secret-value")
      .send({
        event_type: "parse.success",
        event_id: crypto.randomUUID(),
        data: { id: jobId, job_id: jobId },
      })

    expect(res.status).toBe(401)
  })
})
