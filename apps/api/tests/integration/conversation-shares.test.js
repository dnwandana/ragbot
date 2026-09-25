import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest"
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

vi.mock("../../src/services/email.js", () => ({
  sendVerificationEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  sendInvitationEmail: vi.fn(),
}))

beforeAll(seedPermissions)
beforeEach(cleanAllTables)

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/

/** Creates a conversation for `user` in `ws` and inserts a user turn, a chart observation, and an answer. */
async function seedConversation(user, ws, { withMessages = true, answer = "APAC grew [1]" } = {}) {
  const headers = await getAuthHeaders(user.id)
  const agents = await (await request()).get(`/api/workspaces/${ws.id}/agents`).set(headers)
  const agentId = agents.body.data.find((a) => a.is_system).id
  const res = await (await request())
    .post(`/api/workspaces/${ws.id}/conversations`)
    .set(headers)
    .send({ agent_id: agentId, title: "Q3 revenue" })
  const conversationId = res.body.data.id
  if (withMessages) {
    const base = { conversation_id: conversationId, workspace_id: ws.id, created_by: user.id }
    await db("conversation_messages").insert([
      {
        ...base,
        role: "user",
        step_type: "input",
        content: "Which region grew?",
        created_at: new Date(Date.now() - 3000),
      },
      {
        ...base,
        role: "assistant",
        step_type: "observation",
        content_json: JSON.stringify({ charts: [{ type: "bar", data: {} }] }),
        created_at: new Date(Date.now() - 2000),
      },
      {
        ...base,
        role: "assistant",
        step_type: "final_answer",
        content: answer,
        created_at: new Date(Date.now() - 1000),
      },
    ])
  }
  return {
    conversationId,
    headers,
    path: `/api/workspaces/${ws.id}/conversations/${conversationId}/share`,
  }
}

describe("GET /share", () => {
  it("returns 404 Share not found when no share exists", async () => {
    const user = await createTestUser()
    const ws = await createTestWorkspace(user.id)
    const { path, headers } = await seedConversation(user, ws)
    const res = await (await request()).get(path).set(headers)
    expect(res.status).toBe(404)
    expect(res.body.message).toBe("Share not found")
  })

  it("returns 404 Conversation not found for a member of another workspace", async () => {
    const owner = await createTestUser()
    const ws = await createTestWorkspace(owner.id)
    const { conversationId } = await seedConversation(owner, ws)
    const stranger = await createTestUser()
    const otherWs = await createTestWorkspace(stranger.id)
    const res = await (await request())
      .get(`/api/workspaces/${otherWs.id}/conversations/${conversationId}/share`)
      .set(await getAuthHeaders(stranger.id))
    expect(res.status).toBe(404)
    expect(res.body.message).toBe("Conversation not found")
  })
})

describe("POST /share", () => {
  it("creates a share whose url carries the share id, and an audit row", async () => {
    const user = await createTestUser()
    const ws = await createTestWorkspace(user.id)
    const { path, headers, conversationId } = await seedConversation(user, ws)
    const res = await (await request()).post(path).set(headers)
    expect(res.status).toBe(201)
    expect(res.body.data.url).toMatch(new RegExp(`^${process.env.APP_URL}/chat/${UUID_RE.source}$`))
    expect(res.body.data.snapshot).toBeUndefined()
    expect(res.body.data.token).toBeUndefined()
    const row = await db("conversation_shares").where({ conversation_id: conversationId }).first()
    expect(res.body.data.url).toBe(`${process.env.APP_URL}/chat/${row.id}`)
    expect(row.snapshot.version).toBe(1)
    expect(row.snapshot.messages).toHaveLength(2)
    expect(row.snapshot.messages[1].charts).toHaveLength(1)
    const audit = await db("audit_logs")
      .where({ entity_type: "conversation_share", action: "shared" })
      .first()
    expect(audit.entity_id).toBe(row.id)
    expect(audit.changes.conversation_id).toBe(conversationId)
  })

  it("returns 409 with the existing share on a second create", async () => {
    const user = await createTestUser()
    const ws = await createTestWorkspace(user.id)
    const { path, headers } = await seedConversation(user, ws)
    const first = await (await request()).post(path).set(headers)
    const second = await (await request()).post(path).set(headers)
    expect(second.status).toBe(409)
    expect(second.body.data.url).toBe(first.body.data.url)
  })

  it("returns 400 when the conversation has no messages", async () => {
    const user = await createTestUser()
    const ws = await createTestWorkspace(user.id)
    const { path, headers } = await seedConversation(user, ws, { withMessages: false })
    const res = await (await request()).post(path).set(headers)
    expect(res.status).toBe(400)
    expect(res.body.message).toBe("Conversation has no messages to share")
  })

  it("returns 413 when the snapshot is over 1 MB", async () => {
    const user = await createTestUser()
    const ws = await createTestWorkspace(user.id)
    const { path, headers } = await seedConversation(user, ws, {
      answer: "x".repeat(1024 * 1024 + 1),
    })
    const res = await (await request()).post(path).set(headers)
    expect(res.status).toBe(413)
    expect(res.body.message).toBe("Conversation is too large to share")
  })

  it("returns 403 for a viewer and 200 GET for the owner afterwards", async () => {
    const owner = await createTestUser()
    const ws = await createTestWorkspace(owner.id)
    const { path, headers, conversationId } = await seedConversation(owner, ws)
    const viewer = await createTestUser()
    await addWorkspaceMember(ws.id, viewer.id, ws.roles.viewer)
    const viewerRes = await (await request())
      .post(`/api/workspaces/${ws.id}/conversations/${conversationId}/share`)
      .set(await getAuthHeaders(viewer.id))
    expect(viewerRes.status).toBe(403)
    await (await request()).post(path).set(headers)
    const got = await (await request()).get(path).set(headers)
    expect(got.status).toBe(200)
    expect(got.body.data.url).toContain("/chat/")
    expect(got.body.data.snapshot).toBeUndefined()
  })
})

describe("PUT /share", () => {
  it("rebuilds the snapshot, keeps the url, writes an updated audit row", async () => {
    const user = await createTestUser()
    const ws = await createTestWorkspace(user.id)
    const { path, headers, conversationId } = await seedConversation(user, ws)
    const created = await (await request()).post(path).set(headers)
    await db("conversation_messages").insert({
      conversation_id: conversationId,
      workspace_id: ws.id,
      role: "user",
      step_type: "input",
      content: "And EMEA?",
      created_by: user.id,
    })
    const before = await db("conversation_shares")
      .where({ conversation_id: conversationId })
      .first()
    expect(before.snapshot.messages).toHaveLength(2)

    const res = await (await request()).put(path).set(headers)
    expect(res.status).toBe(200)
    expect(res.body.data.url).toBe(created.body.data.url)
    const after = await db("conversation_shares").where({ conversation_id: conversationId }).first()
    expect(after.snapshot.messages).toHaveLength(3)
    const audit = await db("audit_logs")
      .where({ entity_type: "conversation_share", action: "updated" })
      .first()
    expect(audit.entity_id).toBe(after.id)
  })

  it("returns 404 when no share exists", async () => {
    const user = await createTestUser()
    const ws = await createTestWorkspace(user.id)
    const { path, headers } = await seedConversation(user, ws)
    const res = await (await request()).put(path).set(headers)
    expect(res.status).toBe(404)
    expect(res.body.message).toBe("Share not found")
  })
})

describe("DELETE /share", () => {
  it("deletes the row, writes an unshared audit row, then 404 on repeat", async () => {
    const user = await createTestUser()
    const ws = await createTestWorkspace(user.id)
    const { path, headers, conversationId } = await seedConversation(user, ws)
    await (await request()).post(path).set(headers)
    const res = await (await request()).delete(path).set(headers)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ message: "Share link revoked", data: null })
    expect(
      await db("conversation_shares").where({ conversation_id: conversationId }).first(),
    ).toBeUndefined()
    const audit = await db("audit_logs")
      .where({ entity_type: "conversation_share", action: "unshared" })
      .first()
    expect(audit.changes.conversation_id).toBe(conversationId)
    expect((await (await request()).delete(path).set(headers)).status).toBe(404)
  })

  it("returns 403 for a viewer", async () => {
    const owner = await createTestUser()
    const ws = await createTestWorkspace(owner.id)
    const { path, headers } = await seedConversation(owner, ws)
    await (await request()).post(path).set(headers)
    const viewer = await createTestUser()
    await addWorkspaceMember(ws.id, viewer.id, ws.roles.viewer)
    const res = await (await request()).delete(path).set(await getAuthHeaders(viewer.id))
    expect(res.status).toBe(403)
  })
})

/** Returns the share id part of a share url. */
const idOf = (url) => url.split("/chat/")[1]

describe("GET /api/share/:id (public)", () => {
  it("returns the snapshot without auth and hides every id", async () => {
    const user = await createTestUser()
    const ws = await createTestWorkspace(user.id)
    const { path, headers, conversationId } = await seedConversation(user, ws)
    const created = await (await request()).post(path).set(headers)
    const res = await (await request()).get(`/api/share/${idOf(created.body.data.url)}`)
    expect(res.status).toBe(200)
    expect(res.headers["cache-control"]).toBe("private, no-store")
    expect(Object.keys(res.body.data).toSorted()).toEqual(["created_at", "snapshot", "updated_at"])
    expect(res.body.data.snapshot.title).toBe("Q3 revenue")
    const body = JSON.stringify(res.body)
    expect(body).not.toContain(conversationId)
    expect(body).not.toContain(ws.id)
    expect(body).not.toContain(user.id)
  })

  it("returns 404 Share link not found for an unknown id and after revoke", async () => {
    const user = await createTestUser()
    const ws = await createTestWorkspace(user.id)
    const { path, headers } = await seedConversation(user, ws)
    const created = await (await request()).post(path).set(headers)
    const id = idOf(created.body.data.url)
    const unknown = await (await request()).get("/api/share/11111111-2222-4333-8444-555555555555")
    expect(unknown.status).toBe(404)
    expect(unknown.body.message).toBe("Share link not found")
    await (await request()).delete(path).set(headers)
    const revoked = await (await request()).get(`/api/share/${id}`)
    expect(revoked.status).toBe(404)
    expect(revoked.body.message).toBe("Share link not found")
  })

  it("returns 404, not 500, when the id is not a uuid", async () => {
    const res = await (await request()).get("/api/share/not-a-uuid")
    expect(res.status).toBe(404)
    expect(res.body.message).toBe("Share link not found")
  })
})
