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
import { executeCode, isSandboxEnabled } from "../../src/services/sandbox.js"
import { getObjectBuffer } from "../../src/services/storage.js"

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

// The sandbox itself stays mocked by tests/setup.js; storage is mocked here so the
// execute_code tool never reaches S3.
vi.mock("../../src/services/storage.js", () => ({
  uploadFile: vi.fn(async () => "mock-path"),
  deleteFile: vi.fn(async () => undefined),
  getSignedDownloadUrl: vi.fn(async () => "https://mock-signed-url.example.com/file"),
  getObjectBuffer: vi.fn(async () => Buffer.from("pop\n1\n2\n")),
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

const toolCallStream = (id) => {
  const sseChunks = [
    `data: ${JSON.stringify({
      choices: [
        {
          delta: {
            tool_calls: [
              {
                index: 0,
                ...(id ? { id } : {}),
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

const finalAnswerStream = (content = "Here is the answer [1].") => {
  const sseChunks = [
    `data: ${JSON.stringify({ choices: [{ delta: { content }, finish_reason: null }] })}\n\n`,
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

/**
 * Create a user, a workspace, a dataset with one chunk, and a conversation
 * linked to that dataset, so the loop offers the search tool.
 */
const setupConversationWithDataset = async () => {
  const user = await createTestUser()
  const ws = await createTestWorkspace(user.id)

  const agentsRes = await (await request())
    .get(`/api/workspaces/${ws.id}/agents`)
    .set(await getAuthHeaders(user.id))
  const agentId = agentsRes.body.data.find((a) => a.is_system).id

  const dsRes = await (
    await request()
  )
    .post(`/api/workspaces/${ws.id}/datasets`)
    .set(await getAuthHeaders(user.id))
    .send({ name: "Loop Test" })
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

  const convRes = await (
    await request()
  )
    .post(`/api/workspaces/${ws.id}/conversations`)
    .set(await getAuthHeaders(user.id))
    .send({ agent_id: agentId, dataset_ids: [datasetId] })

  return { user, ws, datasetId, fileId, chunkId, conversation: convRes.body.data }
}

/** POST one chat message in JSON mode. */
const postChatMessage = async ({ user, ws, conversation, content }) =>
  (await request())
    .post(`/api/workspaces/${ws.id}/conversations/${conversation.id}/messages`)
    .set({ ...(await getAuthHeaders(user.id)), Accept: "application/json" })
    .send({ content })

/** Script the OpenRouter mock: one tool call per id, then a final answer. */
const scriptToolCallsThenAnswer = (...ids) => {
  let mock = openrouterService.chatCompletionStream
  for (const id of ids) {
    mock = mock.mockImplementationOnce(async () => toolCallStream(id))
  }
  mock.mockImplementationOnce(async () => finalAnswerStream())
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

  it("auto-titles the conversation with an LLM-generated title on first message", async () => {
    const { user, ws, conversation } = await setupConversation()
    openrouterService.chatCompletion.mockResolvedValueOnce({
      choices: [{ message: { content: '"Capital of France."' } }],
    })

    await (
      await request()
    )
      .post(`/api/workspaces/${ws.id}/conversations/${conversation.id}/messages`)
      .set({ ...(await getAuthHeaders(user.id)), Accept: "application/json" })
      .send({ content: "What is the capital of France?" })

    const convRes = await (await request())
      .get(`/api/workspaces/${ws.id}/conversations/${conversation.id}`)
      .set(await getAuthHeaders(user.id))

    expect(convRes.body.data.title).toBe("Capital of France")
    expect(convRes.body.data.last_message_at).not.toBeNull()

    const titleCall = openrouterService.chatCompletion.mock.calls.at(-1)
    expect(titleCall[0][1].content).toContain("What is the capital of France?")
    expect(titleCall[0][1].content).toContain("This is the AI response based on the documents.")
    expect(titleCall[1].model).toBe("openai/gpt-5.4-nano")
  })

  it("falls back to the first 100 characters of the message when title generation fails", async () => {
    const { user, ws, conversation } = await setupConversation()
    openrouterService.chatCompletion.mockRejectedValueOnce(new Error("OpenRouter down"))
    const content = "x".repeat(150)

    const res = await (
      await request()
    )
      .post(`/api/workspaces/${ws.id}/conversations/${conversation.id}/messages`)
      .set({ ...(await getAuthHeaders(user.id)), Accept: "application/json" })
      .send({ content })

    expect(res.status).toBe(200)

    const convRes = await (await request())
      .get(`/api/workspaces/${ws.id}/conversations/${conversation.id}`)
      .set(await getAuthHeaders(user.id))

    expect(convRes.body.data.title).toBe(content.slice(0, 100))
  })

  it("does not call the title model when the conversation already has a title", async () => {
    const { user, ws, conversation } = await setupConversation()
    await db("conversations").where({ id: conversation.id }).update({ title: "Kept title" })
    openrouterService.chatCompletion.mockClear()

    await (
      await request()
    )
      .post(`/api/workspaces/${ws.id}/conversations/${conversation.id}/messages`)
      .set({ ...(await getAuthHeaders(user.id)), Accept: "application/json" })
      .send({ content: "Second question" })

    const convRes = await (await request())
      .get(`/api/workspaces/${ws.id}/conversations/${conversation.id}`)
      .set(await getAuthHeaders(user.id))

    expect(convRes.body.data.title).toBe("Kept title")
    expect(openrouterService.chatCompletion).not.toHaveBeenCalled()
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

describe("POST .../messages — cited-only citations", () => {
  // (dataset_file_id, chunk_index) is unique, so each seeded chunk takes the next index.
  let nextChunkIndex = 100

  /** Inserts n chunks for the file and returns search rows for them. */
  const seedChunks = async ({ datasetId, fileId }, contents, similarity = 0.8) =>
    Promise.all(
      contents.map(async (content) => {
        const id = crypto.randomUUID()
        const chunk_index = nextChunkIndex++
        await db("dataset_file_chunks").insert({
          id,
          dataset_file_id: fileId,
          content,
          chunk_index,
          created_at: new Date(),
        })
        return {
          chunk_id: id,
          content,
          similarity,
          dataset_id: datasetId,
          file_id: fileId,
          filename: "doc.pdf",
          chunk_index,
        }
      }),
    )

  it("stores only cited rows, with tool numbers, offsets, and a score", async () => {
    const ctx = await setupConversationWithDataset()
    const initial = await seedChunks(
      ctx,
      Array.from({ length: 10 }, (_, i) => `Filler text number ${i + 1}.`),
    )
    initial[1].content = "Intro. Gross margin held at 71% in Q2. Outro."
    await db("dataset_file_chunks")
      .where({ id: initial[1].chunk_id })
      .update({ content: initial[1].content })
    const [tool] = await seedChunks(
      ctx,
      ["Header. APAC revenue increased 12% to $4.1M. Footer."],
      null,
    )
    ragService.searchChunks.mockResolvedValueOnce(initial).mockResolvedValueOnce([tool])
    openrouterService.chatCompletionStream
      .mockImplementationOnce(async () => toolCallStream("call_1"))
      .mockImplementationOnce(async () =>
        finalAnswerStream(
          "Margin held at 71% [2]. APAC revenue grew 12% to $4.1M [11]. Unknown [40].",
        ),
      )

    const res = await postChatMessage({ ...ctx, content: "How did Q2 go?" })
    expect(res.status).toBe(200)

    const rows = await db("conversation_message_citations")
      .where({ message_id: res.body.data.message_id })
      .orderBy("citation_number")
    expect(rows.map((r) => r.citation_number)).toEqual([2, 11])
    expect(rows[1].chunk_id).toBe(tool.chunk_id)
    expect(rows[1].cited_text).toBe(tool.content)
    expect(rows[1].cited_text.slice(rows[1].snippet_start_char, rows[1].snippet_end_char)).toBe(
      "APAC revenue increased 12% to $4.1M.",
    )
    expect(rows[1].relevance_score).toBe(0)
    expect(rows[0].relevance_score).toBeCloseTo(0.8)

    const events = res.body.data.events.filter((e) => e.event === "citation")
    expect(events.map((e) => e.data.citation_number)).toEqual([2, 11])
    expect(events[1].data).toMatchObject({
      snippet_start_char: rows[1].snippet_start_char,
      snippet_end_char: rows[1].snippet_end_char,
    })
  })

  it("stores no rows when the answer cites nothing", async () => {
    const ctx = await setupConversationWithDataset()
    ragService.searchChunks.mockResolvedValue(await seedChunks(ctx, ["Some text."]))
    openrouterService.chatCompletionStream.mockImplementationOnce(async () =>
      finalAnswerStream("No markers here."),
    )
    const res = await postChatMessage({ ...ctx, content: "Hi" })
    const rows = await db("conversation_message_citations").where({
      message_id: res.body.data.message_id,
    })
    expect(rows).toEqual([])
  })

  it("returns the offsets on the conversation detail", async () => {
    const ctx = await setupConversationWithDataset()
    ragService.searchChunks.mockResolvedValue(
      await seedChunks(ctx, ["Intro. Japan grew 13% in April."]),
    )
    openrouterService.chatCompletionStream.mockImplementationOnce(async () =>
      finalAnswerStream("Japan grew 13% [1]."),
    )
    await postChatMessage({ ...ctx, content: "Japan?" })

    const detail = await (await request())
      .get(`/api/workspaces/${ctx.ws.id}/conversations/${ctx.conversation.id}`)
      .set(await getAuthHeaders(ctx.user.id))
    const [c] = detail.body.data.citations
    expect(c.cited_text.slice(c.snippet_start_char, c.snippet_end_char)).toBe(
      "Japan grew 13% in April.",
    )
  })
})

describe("POST .../messages — ReAct loop mechanics", () => {
  it("appends tool turns with real ids instead of rebuilding messages", async () => {
    const { user, ws, conversation, datasetId, fileId, chunkId } =
      await setupConversationWithDataset()

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
    scriptToolCallsThenAnswer("call_1")

    const res = await postChatMessage({ user, ws, conversation, content: "what is our revenue?" })
    expect(res.status).toBe(200)

    const secondCall = openrouterService.chatCompletionStream.mock.calls[1][0]
    const assistantTurn = secondCall.find((m) => m.tool_calls)
    const toolTurn = secondCall.find((m) => m.role === "tool")
    expect(assistantTurn.tool_calls[0].id).toBe("call_1")
    expect(assistantTurn.tool_calls[0].function.name).toBe("search_knowledge_base")
    expect(toolTurn.tool_call_id).toBe("call_1")
  })

  it("numbers a tool search after the initial chunks, and keeps a repeated chunk", async () => {
    const { user, ws, conversation, datasetId, fileId, chunkId } =
      await setupConversationWithDataset()
    const secondId = crypto.randomUUID()
    await db("dataset_file_chunks").insert({
      id: secondId,
      dataset_file_id: fileId,
      content: "Second excerpt.",
      chunk_index: 1,
      created_at: new Date(),
    })
    const row = (chunk_id, content) => ({
      chunk_id,
      content,
      similarity: 0.9,
      dataset_id: datasetId,
      file_id: fileId,
      filename: "doc.pdf",
      chunk_index: 0,
    })
    ragService.searchChunks
      .mockResolvedValueOnce([row(chunkId, "Relevant excerpt about the topic.")])
      .mockResolvedValueOnce([
        row(chunkId, "Relevant excerpt about the topic."),
        row(secondId, "Second excerpt."),
      ])
    scriptToolCallsThenAnswer("call_1")

    const res = await postChatMessage({ user, ws, conversation, content: "what is our revenue?" })
    expect(res.status).toBe(200)

    const [firstMessages] = openrouterService.chatCompletionStream.mock.calls[0]
    expect(firstMessages[0].content).toContain("[1] Relevant excerpt about the topic.")
    const toolTurn = openrouterService.chatCompletionStream.mock.calls[1][0].find(
      (m) => m.role === "tool",
    )
    expect(JSON.parse(toolTurn.content).content).toBe(
      "[1] Relevant excerpt about the topic.\n\n[2] Second excerpt.",
    )
  })

  it("keeps every prior tool turn across two tool calls", async () => {
    const { user, ws, conversation } = await setupConversationWithDataset()

    ragService.searchChunks.mockResolvedValue([])
    scriptToolCallsThenAnswer("call_1", "call_2")

    const res = await postChatMessage({ user, ws, conversation, content: "compare both figures" })
    expect(res.status).toBe(200)

    const thirdCall = openrouterService.chatCompletionStream.mock.calls[2][0]
    expect(thirdCall.filter((m) => m.role === "tool").map((m) => m.tool_call_id)).toEqual([
      "call_1",
      "call_2",
    ])
    expect(thirdCall[0].role).toBe("system")
    expect(thirdCall.some((m) => m.role === "user" && m.content === "compare both figures")).toBe(
      true,
    )
  })

  it("sends no tools on the last iteration", async () => {
    process.env.CHAT_MAX_ITERATIONS = "1"
    try {
      const { user, ws, conversation } = await setupConversationWithDataset()
      ragService.searchChunks.mockResolvedValue([])

      const res = await postChatMessage({ user, ws, conversation, content: "hello" })
      expect(res.status).toBe(200)
      expect(openrouterService.chatCompletionStream.mock.calls[0][1].tools).toBeUndefined()
    } finally {
      delete process.env.CHAT_MAX_ITERATIONS
    }
  })

  it("offers the search tool while iterations remain", async () => {
    const { user, ws, conversation } = await setupConversationWithDataset()
    ragService.searchChunks.mockResolvedValue([])

    const res = await postChatMessage({ user, ws, conversation, content: "hello" })
    expect(res.status).toBe(200)

    const options = openrouterService.chatCompletionStream.mock.calls[0][1]
    expect(options.tools.map((t) => t.function.name)).toEqual(["search_knowledge_base"])
    expect(options.tool_choice).toBe("auto")
  })
})

/** SSE stream for one execute_code tool call with the given arguments. */
const executeCodeStream = (id, args) => {
  const sseChunks = [
    `data: ${JSON.stringify({
      choices: [
        {
          delta: {
            tool_calls: [
              {
                index: 0,
                id,
                function: { name: "execute_code", arguments: JSON.stringify(args) },
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

describe("POST .../messages — execute_code tool", () => {
  /** Profile written by the tabular worker branch, stored at metadata.profile. */
  const profile = {
    format: "csv",
    truncated: false,
    sheets: [
      {
        name: "S1",
        rows: 2,
        columns: [
          {
            name: "pop",
            dtype: "int64",
            non_null: 2,
            unique: 2,
            sample_values: [],
            min: "1",
            max: "2",
          },
        ],
      },
    ],
  }

  /** Create a conversation whose dataset holds one completed tabular file. */
  const setupConversationWithTabularFile = async () => {
    const user = await createTestUser()
    const ws = await createTestWorkspace(user.id)

    const agentsRes = await (await request())
      .get(`/api/workspaces/${ws.id}/agents`)
      .set(await getAuthHeaders(user.id))
    const agentId = agentsRes.body.data.find((a) => a.is_system).id

    const dsRes = await (
      await request()
    )
      .post(`/api/workspaces/${ws.id}/datasets`)
      .set(await getAuthHeaders(user.id))
      .send({ name: "Tabular Test" })
    const datasetId = dsRes.body.data.id

    const fileId = crypto.randomUUID()
    await db("dataset_files").insert({
      id: fileId,
      dataset_id: datasetId,
      workspace_id: ws.id,
      filename: "sales report.csv",
      mime_type: "text/csv",
      file_size_bytes: 20,
      storage_provider: "r2",
      storage_path: `datasets/${datasetId}/${fileId}.csv`,
      status: "completed",
      metadata: JSON.stringify({ source_type: "tabular", profile }),
      created_at: new Date(),
      updated_at: new Date(),
    })

    const convRes = await (
      await request()
    )
      .post(`/api/workspaces/${ws.id}/conversations`)
      .set(await getAuthHeaders(user.id))
      .send({ agent_id: agentId, dataset_ids: [datasetId] })

    return { user, ws, datasetId, fileId, conversation: convRes.body.data }
  }

  beforeEach(() => {
    ragService.searchChunks.mockResolvedValue([])
    vi.mocked(isSandboxEnabled).mockReturnValue(true)
    vi.mocked(executeCode).mockResolvedValue({
      ok: true,
      stdout: "3",
      stderr: "",
      charts: [],
      error: null,
    })
  })

  it("offers execute_code and describes data files in the system prompt", async () => {
    const { user, ws, conversation, fileId } = await setupConversationWithTabularFile()

    const res = await postChatMessage({ user, ws, conversation, content: "sum the pop column" })
    expect(res.status).toBe(200)

    const [messages, options] = openrouterService.chatCompletionStream.mock.calls[0]
    expect(options.tools.map((t) => t.function.name)).toContain("execute_code")

    const system = messages[0].content
    expect(system).toContain("Available data files")
    expect(system).toContain(fileId)
    expect(system).toContain("pop")
  })

  it("persists execution thought and observation with charts", async () => {
    const { user, ws, conversation, fileId } = await setupConversationWithTabularFile()

    vi.mocked(executeCode).mockResolvedValue({
      ok: true,
      stdout: "3",
      stderr: "",
      charts: [{ type: "bar", data: { datasets: [] } }],
      error: null,
      duration_ms: 1900,
    })
    openrouterService.chatCompletionStream
      .mockImplementationOnce(async () =>
        executeCodeStream("call_x", {
          title: "Sum the pop column",
          code: "print(1)",
          file_ids: [fileId],
        }),
      )
      .mockImplementationOnce(async () => finalAnswerStream())

    const res = await postChatMessage({ user, ws, conversation, content: "sum the pop column" })
    expect(res.status).toBe(200)

    const events = res.body.data.events
    const thought = events.find((e) => e.event === "thought")
    expect(thought.data.tool).toBe("execute_code")
    expect(thought.data.code).toBe("print(1)")
    expect(thought.data.file_ids).toEqual([fileId])
    expect(thought.data.title).toBe("Sum the pop column")
    expect(thought.data.filenames).toEqual(["sales report.csv"])

    const observation = events.find((e) => e.event === "observation")
    expect(observation.data.stdout).toBe("3")
    expect(observation.data.charts).toHaveLength(1)
    expect(observation.data.duration_ms).toBe(1900)

    const chart = events.find((e) => e.event === "chart")
    expect(chart.data).toMatchObject({ index: 0, spec: { type: "bar" } })

    const rows = await db("conversation_messages")
      .where({ conversation_id: conversation.id })
      .orderBy("created_at", "asc")
    const observationRow = rows.find((r) => r.step_type === "observation")
    const observationPayload =
      typeof observationRow.content_json === "string"
        ? JSON.parse(observationRow.content_json)
        : observationRow.content_json
    expect(observationPayload.charts).toHaveLength(1)
    expect(observationPayload.stdout).toBe("3")
    expect(chart.data.message_id).toBe(observationRow.id)

    const thoughtRow = rows.find((r) => r.step_type === "thought")
    const thoughtPayload =
      typeof thoughtRow.content_json === "string"
        ? JSON.parse(thoughtRow.content_json)
        : thoughtRow.content_json
    expect(thoughtPayload).toMatchObject({
      tool: "execute_code",
      code: "print(1)",
      title: "Sum the pop column",
      filenames: ["sales report.csv"],
    })
    expect(observationPayload.duration_ms).toBe(1900)

    // The model reads stdout, never the chart specs.
    const toolTurn = openrouterService.chatCompletionStream.mock.calls[1][0].find(
      (m) => m.role === "tool",
    )
    expect(toolTurn.content).not.toContain("datasets")
    expect(getObjectBuffer).toHaveBeenCalledTimes(1)
  })

  it("does not offer execute_code when the sandbox is disabled", async () => {
    vi.mocked(isSandboxEnabled).mockReturnValue(false)
    const { user, ws, conversation } = await setupConversationWithTabularFile()

    const res = await postChatMessage({ user, ws, conversation, content: "hello" })
    expect(res.status).toBe(200)

    const options = openrouterService.chatCompletionStream.mock.calls[0][1]
    expect((options.tools ?? []).map((t) => t.function.name)).not.toContain("execute_code")
    expect(openrouterService.chatCompletionStream.mock.calls[0][0][0].content).not.toContain(
      "Available data files",
    )
  })

  it("keeps the search thought and observation shapes unchanged", async () => {
    const { user, ws, conversation } = await setupConversationWithTabularFile()

    scriptToolCallsThenAnswer("call_1")

    const res = await postChatMessage({ user, ws, conversation, content: "what is the topic?" })
    expect(res.status).toBe(200)

    const thought = res.body.data.events.find((e) => e.event === "thought")
    expect(thought.data.tool_call.name).toBe("search_knowledge_base")

    const observation = res.body.data.events.find((e) => e.event === "observation")
    expect(observation.data.content).toBe("No relevant documents found.")
    expect(observation.data.sources).toEqual([])
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
