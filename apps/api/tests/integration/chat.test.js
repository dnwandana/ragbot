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
import * as openrouterService from "../../src/services/openrouter.js"
import * as ragService from "../../src/services/rag.js"

// Mock external services
vi.mock("../../src/services/email.js", () => ({
  sendVerificationEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  sendInvitationEmail: vi.fn(),
}))

vi.mock("../../src/services/openrouter.js", () => ({
  embedText: vi.fn().mockResolvedValue(Array.from({ length: 1536 }, () => 0.1)),
  embedBatch: vi.fn().mockResolvedValue([Array.from({ length: 1536 }, () => 0.1)]),
  chatCompletion: vi.fn().mockResolvedValue({
    choices: [{ message: { content: '["What is this document about?"]' } }],
  }),
  chatCompletionStream: vi.fn().mockImplementation(async () => {
    // Return a ReadableStream that emits a simple SSE response
    const content = "This is the AI response based on the documents."
    const sseChunks = [
      `data: ${JSON.stringify({ choices: [{ delta: { content }, finish_reason: null }] })}\n\n`,
      `data: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: "stop" }], usage: { prompt_tokens: 100, completion_tokens: 20, total_tokens: 120 } })}\n\n`,
      "data: [DONE]\n\n",
    ]
    let i = 0
    return new ReadableStream({
      pull(controller) {
        if (i < sseChunks.length) {
          controller.enqueue(new TextEncoder().encode(sseChunks[i++]))
        } else {
          controller.close()
        }
      },
    })
  }),
}))

vi.mock("../../src/services/rag.js", async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    searchChunks: vi.fn().mockResolvedValue([]),
  }
})

beforeAll(async () => {
  await seedPermissions()
})
beforeEach(async () => {
  await cleanAllTables()
  vi.clearAllMocks()
})

const setupConversation = async () => {
  const user = await createTestUser()
  const ws = await createTestWorkspace(user.id)

  const agentsRes = await (await request())
    .get(`/api/workspaces/${ws.id}/agents`)
    .set(await getAuthHeaders(user.id))
  const agentId = agentsRes.body.data.find((a) => a.is_system).id

  const convRes = await (
    await request()
  )
    .post(`/api/workspaces/${ws.id}/conversations`)
    .set(await getAuthHeaders(user.id))
    .send({ agent_id: agentId })

  return { user, ws, conversation: convRes.body.data }
}

const toolCallStream = () => {
  const sseChunks = [
    `data: ${JSON.stringify({
      choices: [
        {
          delta: {
            tool_calls: [
              {
                index: 0,
                function: { name: "search_knowledge_base", arguments: '{"query":"topic"}' },
              },
            ],
          },
          finish_reason: null,
        },
      ],
    })}\n\n`,
    `data: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: "tool_calls" }] })}\n\n`,
    "data: [DONE]\n\n",
  ]
  let i = 0
  return new ReadableStream({
    pull(controller) {
      if (i < sseChunks.length) controller.enqueue(new TextEncoder().encode(sseChunks[i++]))
      else controller.close()
    },
  })
}

const finalAnswerStream = () => {
  const sseChunks = [
    `data: ${JSON.stringify({ choices: [{ delta: { content: "Here is the answer [1]." }, finish_reason: null }] })}\n\n`,
    `data: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: "stop" }], usage: { prompt_tokens: 50, completion_tokens: 10, total_tokens: 60 } })}\n\n`,
    "data: [DONE]\n\n",
  ]
  let i = 0
  return new ReadableStream({
    pull(controller) {
      if (i < sseChunks.length) controller.enqueue(new TextEncoder().encode(sseChunks[i++]))
      else controller.close()
    },
  })
}

describe("POST /api/workspaces/:id/conversations/:conv_id/messages (non-streaming)", () => {
  it("stores user + assistant messages and returns events", async () => {
    const { user, ws, conversation } = await setupConversation()

    const res = await (
      await request()
    )
      .post(`/api/workspaces/${ws.id}/conversations/${conversation.id}/messages`)
      .set({ ...(await getAuthHeaders(user.id)), Accept: "application/json" })
      .send({ content: "What can you tell me about this?" })

    expect(res.status).toBe(200)
    expect(res.body.data.message_id).toBeDefined()
    expect(res.body.data.events.some((e) => e.event === "token")).toBe(true)
    expect(res.body.data.events.some((e) => e.event === "done")).toBe(false) // done is only for SSE mode
  })

  it("auto-titles the conversation on first message", async () => {
    const { user, ws, conversation } = await setupConversation()

    await (
      await request()
    )
      .post(`/api/workspaces/${ws.id}/conversations/${conversation.id}/messages`)
      .set({ ...(await getAuthHeaders(user.id)), Accept: "application/json" })
      .send({ content: "What is the capital of France?" })

    const convRes = await (await request())
      .get(`/api/workspaces/${ws.id}/conversations/${conversation.id}`)
      .set(await getAuthHeaders(user.id))

    expect(convRes.body.data.title).toBe("What is the capital of France?")
    expect(convRes.body.data.last_message_at).not.toBeNull()
  })

  it("stores user message and assistant message in DB", async () => {
    const { user, ws, conversation } = await setupConversation()

    await (
      await request()
    )
      .post(`/api/workspaces/${ws.id}/conversations/${conversation.id}/messages`)
      .set({ ...(await getAuthHeaders(user.id)), Accept: "application/json" })
      .send({ content: "Hello" })

    const convDetail = await (await request())
      .get(`/api/workspaces/${ws.id}/conversations/${conversation.id}`)
      .set(await getAuthHeaders(user.id))

    const messages = convDetail.body.data.messages
    expect(messages.some((m) => m.role === "user" && m.step_type === "input")).toBe(true)
    expect(messages.some((m) => m.role === "assistant" && m.step_type === "final_answer")).toBe(
      true,
    )
  })

  it("returns 400 for empty message content", async () => {
    const { user, ws, conversation } = await setupConversation()

    const res = await (
      await request()
    )
      .post(`/api/workspaces/${ws.id}/conversations/${conversation.id}/messages`)
      .set({ ...(await getAuthHeaders(user.id)), Accept: "application/json" })
      .send({ content: "" })

    expect(res.status).toBe(400)
  })

  it("returns 404 for unknown conversation", async () => {
    const { user, ws } = await setupConversation()

    const res = await (
      await request()
    )
      .post(`/api/workspaces/${ws.id}/conversations/${crypto.randomUUID()}/messages`)
      .set({ ...(await getAuthHeaders(user.id)), Accept: "application/json" })
      .send({ content: "Hello" })

    expect(res.status).toBe(404)
  })
})

describe("POST .../messages — ReAct tool-call + citation linkage", () => {
  it("links the stored citation to its source chunk_id", async () => {
    const user = await createTestUser()
    const ws = await createTestWorkspace(user.id)

    const agentsRes = await (await request())
      .get(`/api/workspaces/${ws.id}/agents`)
      .set(await getAuthHeaders(user.id))
    const agentId = agentsRes.body.data.find((a) => a.is_system).id

    // Create a dataset, file, and chunk so the citation FK resolves
    const dsRes = await (
      await request()
    )
      .post(`/api/workspaces/${ws.id}/datasets`)
      .set(await getAuthHeaders(user.id))
      .send({ name: "Citation Test" })
    const datasetId = dsRes.body.data.id

    const fileId = crypto.randomUUID()
    await db("dataset_files").insert({
      id: fileId,
      dataset_id: datasetId,
      workspace_id: ws.id,
      filename: "doc.pdf",
      mime_type: "application/pdf",
      file_size_bytes: 100,
      storage_provider: "r2",
      storage_path: "doc/file.pdf",
      status: "completed",
      metadata: JSON.stringify({}),
      created_at: new Date(),
      updated_at: new Date(),
    })

    const chunkId = crypto.randomUUID()
    await db("dataset_file_chunks").insert({
      id: chunkId,
      dataset_file_id: fileId,
      content: "Relevant excerpt about the topic.",
      chunk_index: 0,
      created_at: new Date(),
    })

    // Conversation linked to the dataset so the tool path is enabled
    const convRes = await (
      await request()
    )
      .post(`/api/workspaces/${ws.id}/conversations`)
      .set(await getAuthHeaders(user.id))
      .send({ agent_id: agentId, dataset_ids: [datasetId] })
    const conversation = convRes.body.data

    // searchChunks returns a row shaped like search_chunks() output
    ragService.searchChunks.mockResolvedValue([
      {
        chunk_id: chunkId,
        content: "Relevant excerpt about the topic.",
        similarity: 0.92,
        dataset_id: datasetId,
        file_id: fileId,
        filename: "doc.pdf",
        chunk_index: 0,
      },
    ])

    // First completion: a tool call. Second: the final answer.
    openrouterService.chatCompletionStream
      .mockImplementationOnce(async () => toolCallStream())
      .mockImplementationOnce(async () => finalAnswerStream())

    const res = await (
      await request()
    )
      .post(`/api/workspaces/${ws.id}/conversations/${conversation.id}/messages`)
      .set({ ...(await getAuthHeaders(user.id)), Accept: "application/json" })
      .send({ content: "Tell me about the topic" })

    expect(res.status).toBe(200)
    expect(res.body.data.events.some((e) => e.event === "thought")).toBe(true)
    expect(res.body.data.events.some((e) => e.event === "observation")).toBe(true)

    const citations = await db("conversation_message_citations").where({
      message_id: res.body.data.message_id,
    })
    expect(citations).toHaveLength(1)
    expect(citations[0].chunk_id).toBe(chunkId)
  })
})

describe("POST .../messages (SSE streaming)", () => {
  it("streams valid SSE frames including token and done events", async () => {
    // Reset to default mock (clearAllMocks does not reset mockResolvedValue
    // overrides from earlier tests)
    ragService.searchChunks.mockResolvedValue([])

    const { user, ws, conversation } = await setupConversation()

    const res = await (
      await request()
    )
      .post(`/api/workspaces/${ws.id}/conversations/${conversation.id}/messages`)
      .set({ ...(await getAuthHeaders(user.id)), Accept: "text/event-stream" })
      .send({ content: "Stream me a reply" })

    expect(res.status).toBe(200)
    expect(res.headers["content-type"]).toContain("text/event-stream")
    expect(res.text).toContain("event: token")
    expect(res.text).toContain("event: done")
  })
})
