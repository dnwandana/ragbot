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

/** Creates a titled conversation with one user turn and one answer. */
async function seedExport(user, ws, { withMessages = true } = {}) {
  const headers = await getAuthHeaders(user.id)
  const agents = await (await request()).get(`/api/workspaces/${ws.id}/agents`).set(headers)
  const agentId = agents.body.data.find((a) => a.is_system).id
  const res = await (await request())
    .post(`/api/workspaces/${ws.id}/conversations`)
    .set(headers)
    .send({ agent_id: agentId, title: "Q3 Revenue: by region!" })
  const conversationId = res.body.data.id
  if (withMessages) {
    const base = { conversation_id: conversationId, workspace_id: ws.id, created_by: user.id }
    await db("conversation_messages").insert([
      {
        ...base,
        role: "user",
        step_type: "input",
        content: "Which region grew?",
        created_at: new Date(Date.now() - 2000),
      },
      {
        ...base,
        role: "assistant",
        step_type: "final_answer",
        content: "APAC grew fastest",
        created_at: new Date(Date.now() - 1000),
      },
    ])
  }
  return { headers, path: `/api/workspaces/${ws.id}/conversations/${conversationId}/export` }
}

describe("GET /export", () => {
  it("returns a Markdown attachment named from the title", async () => {
    const user = await createTestUser()
    const ws = await createTestWorkspace(user.id)
    const { path, headers } = await seedExport(user, ws)
    const res = await (await request()).get(`${path}?format=markdown`).set(headers)
    expect(res.status).toBe(200)
    expect(res.headers["content-type"]).toMatch(/^text\/markdown/)
    expect(res.headers["content-disposition"]).toBe(
      'attachment; filename="q3-revenue-by-region.md"',
    )
    expect(res.text).toContain("# Q3 Revenue: by region!")
    expect(res.text).toContain("## You\n\nWhich region grew?")
    expect(res.text).toContain("APAC grew fastest")
  })

  it("returns 400 for a missing or unknown format", async () => {
    const user = await createTestUser()
    const ws = await createTestWorkspace(user.id)
    const { path, headers } = await seedExport(user, ws)
    expect((await (await request()).get(path).set(headers)).status).toBe(400)
    const res = await (await request()).get(`${path}?format=pdf`).set(headers)
    expect(res.status).toBe(400)
    expect(res.body.message).toContain("format")
  })

  it("returns 400 when the conversation has no messages", async () => {
    const user = await createTestUser()
    const ws = await createTestWorkspace(user.id)
    const { path, headers } = await seedExport(user, ws, { withMessages: false })
    const res = await (await request()).get(`${path}?format=markdown`).set(headers)
    expect(res.status).toBe(400)
    expect(res.body.message).toBe("Conversation has no messages to share")
  })

  it("returns 404 for a conversation of another member", async () => {
    const owner = await createTestUser()
    const ws = await createTestWorkspace(owner.id)
    const { path } = await seedExport(owner, ws)
    const stranger = await createTestUser()
    await addWorkspaceMember(ws.id, stranger.id, ws.roles.editor)
    const res = await (await request())
      .get(`${path}?format=markdown`)
      .set(await getAuthHeaders(stranger.id))
    expect(res.status).toBe(404)
  })
  it("writes only the cited passage for each source", async () => {
    const user = await createTestUser()
    const ws = await createTestWorkspace(user.id)
    const { path, headers } = await seedExport(user, ws)
    const answer = await db("conversation_messages").where({ step_type: "final_answer" }).first()
    const text = "Intro text.\n\n| APAC | $4.10M | +12.0% |"
    const row = "| APAC | $4.10M | +12.0% |"
    await db("conversation_message_citations").insert({
      message_id: answer.id,
      workspace_id: ws.id,
      chunk_id: null,
      citation_number: 6,
      relevance_score: 0.8,
      cited_text: text,
      snippet_start_char: text.indexOf(row),
      snippet_end_char: text.indexOf(row) + row.length,
      created_at: new Date(),
    })

    const res = await (await request()).get(`${path}?format=markdown`).set(headers)
    expect(res.status).toBe(200)
    expect(res.text).toContain('- **[6] Source 6** — "APAC $4.10M +12.0%"')
    expect(res.text).not.toContain("Intro text.")
  })
})
