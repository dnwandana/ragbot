import crypto from "node:crypto"
import joi from "joi"
import HttpError from "../utils/http-error.js"
import apiResponse from "../utils/response.js"
import { HTTP_STATUS_CODE } from "../utils/constant.js"
import * as conversationModel from "../models/conversations.js"
import * as conversationDatasetModel from "../models/conversation-datasets.js"
import * as messageModel from "../models/conversation-messages.js"
import * as citationModel from "../models/conversation-message-citations.js"
import * as agentModel from "../models/agents.js"
import * as openrouterService from "../services/openrouter.js"
import * as ragService from "../services/rag.js"

/** Validates the chat message request body. */
const messageSchema = joi
  .object({ content: joi.string().min(1).max(100000).required() })
  .options({ stripUnknown: true })

/** OpenRouter tool definition exposing the vector store as a callable search tool. */
const SEARCH_TOOL = {
  type: "function",
  function: {
    name: "search_knowledge_base",
    description:
      "Search the knowledge base for relevant document excerpts. Use this when you need to find specific information.",
    parameters: {
      type: "object",
      properties: { query: { type: "string", description: "The search query" } },
      required: ["query"],
    },
  },
}

/**
 * Consume an OpenRouter SSE ReadableStream, forwarding text deltas to `onToken`
 * and accumulating any streamed tool call.
 *
 * @param {ReadableStream} stream - The OpenRouter response body stream.
 * @param {(token: string) => void} onToken - Called with each text delta as it arrives.
 * @returns {Promise<{ finishReason: string|null, usage: Object|null, toolCall: { name: string, arguments: string }|null }>}
 */
async function consumeStream(stream, onToken) {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  let accumulatedToolCall = null
  let finishReason = null
  let usage = null

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop()

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue
      const raw = line.slice(6).trim()
      if (raw === "[DONE]") break
      try {
        const chunk = JSON.parse(raw)
        if (chunk.usage) usage = chunk.usage
        const choice = chunk.choices?.[0]
        if (!choice) continue
        if (choice.finish_reason) finishReason = choice.finish_reason

        const delta = choice.delta || {}

        if (delta.content) {
          onToken(delta.content)
        }

        if (delta.tool_calls?.length) {
          const tc = delta.tool_calls[0]
          if (tc.index === 0 && !accumulatedToolCall) {
            accumulatedToolCall = { name: "", arguments: "" }
          }
          if (tc.function?.name) accumulatedToolCall.name += tc.function.name
          if (tc.function?.arguments) accumulatedToolCall.arguments += tc.function.arguments
        }
      } catch (e) {
        if (raw && raw !== "[DONE]") {
          console.error(`SSE parse error: ${e.message}, raw: ${raw.slice(0, 100)}`)
        }
      }
    }
  }

  return { finishReason, usage, toolCall: accumulatedToolCall }
}

/**
 * Run the server-side ReAct loop: embed the query, search the vector store,
 * stream the model response, execute `search_knowledge_base` tool calls, then
 * persist the final answer plus citations. Model-agnostic about transport —
 * emits structured events via `sendEvent` for both SSE and JSON modes.
 *
 * @param {Object} params
 * @param {Object} params.conversation - The conversation row.
 * @param {Object} params.agent - The agent row (system prompt + model config).
 * @param {string} params.userMessageId - ID of the already-stored user message (excluded from history).
 * @param {string} params.userContent - The user's message text.
 * @param {string[]} params.datasetIds - Dataset UUIDs linked to the conversation.
 * @param {(event: string, data: Object) => void} params.sendEvent - Event sink (SSE write or array push).
 * @returns {Promise<{ messageId: string, usage: Object|null, latencyMs: number }>}
 */
async function runReActLoop({
  conversation,
  agent,
  userMessageId,
  userContent,
  datasetIds,
  sendEvent,
}) {
  const startTime = Date.now()

  // 1. Embed the user query
  const queryEmbedding = await openrouterService.embedText(
    userContent,
    process.env.DEFAULT_EMBEDDINGS_MODEL,
  )

  // 2. Initial RAG search
  let chunks = await ragService.searchChunks({
    embedding: queryEmbedding,
    datasetIds,
    matchCount: 10,
    threshold: 0.0,
  })

  // 3. Build conversation history (only visible messages)
  const history = await messageModel.findVisibleByConversationId(conversation.id)
  const historyMessages = history
    .filter((m) => m.id !== userMessageId) // exclude the just-stored user message
    .map((m) => ({ role: m.role, content: m.content }))

  const systemContent = ragService.buildSystemMessage(agent.system_prompt, chunks)

  let openRouterMessages = [
    { role: "system", content: systemContent },
    ...historyMessages,
    { role: "user", content: userContent },
  ]

  let finalContent = ""
  let finalUsage = null
  const modelConfig =
    typeof agent.model_config === "string" ? JSON.parse(agent.model_config) : agent.model_config

  const MAX_ITERATIONS = 3
  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    const isLastIteration = iteration === MAX_ITERATIONS - 1
    const useTools = !isLastIteration && datasetIds.length
    const streamBody = await openrouterService.chatCompletionStream(openRouterMessages, {
      ...modelConfig,
      tools: useTools ? [SEARCH_TOOL] : undefined,
      tool_choice: useTools ? "auto" : undefined,
    })

    let iterTokens = ""

    const { finishReason, usage, toolCall } = await consumeStream(streamBody, (token) => {
      iterTokens += token
      sendEvent("token", { content: token })
    })

    if (usage) finalUsage = usage

    if (finishReason === "tool_calls" && toolCall) {
      // Store thought message
      await messageModel.create({
        id: crypto.randomUUID(),
        conversation_id: conversation.id,
        workspace_id: conversation.workspace_id,
        role: "assistant",
        step_type: "thought",
        content: null,
        content_json: JSON.stringify({ tool_call: toolCall }),
        created_at: new Date(),
      })

      sendEvent("thought", { content: `Searching: ${toolCall.arguments}`, tool_call: toolCall })

      // Execute tool
      let searchQuery = userContent
      try {
        const args = JSON.parse(toolCall.arguments)
        searchQuery = args.query || userContent
      } catch {}

      const refineEmbedding = await openrouterService.embedText(
        searchQuery,
        process.env.DEFAULT_EMBEDDINGS_MODEL,
      )
      chunks = await ragService.searchChunks({
        embedding: refineEmbedding,
        datasetIds,
        matchCount: 10,
        threshold: 0.0,
      })

      const observationContent = chunks.length
        ? chunks.map((c, i) => `[${i + 1}] ${c.content.slice(0, 200)}`).join("\n")
        : "No relevant documents found."

      // Store observation message
      await messageModel.create({
        id: crypto.randomUUID(),
        conversation_id: conversation.id,
        workspace_id: conversation.workspace_id,
        role: "tool",
        step_type: "observation",
        content: observationContent,
        content_json: null,
        created_at: new Date(),
      })

      sendEvent("observation", {
        content: observationContent,
        sources: chunks.map((c) => c.chunk_id),
      })

      // Feed result back into the model
      openRouterMessages = [
        { role: "system", content: ragService.buildSystemMessage(agent.system_prompt, chunks) },
        ...historyMessages,
        { role: "user", content: userContent },
        {
          role: "assistant",
          content: null,
          tool_calls: [{ id: "call_0", type: "function", function: toolCall }],
        },
        { role: "tool", tool_call_id: "call_0", content: observationContent },
      ]
      continue
    }

    // Final answer
    finalContent = iterTokens
    break
  }

  const latencyMs = Date.now() - startTime

  // Store final answer message + citations
  const finalMessageId = crypto.randomUUID()
  await messageModel.create({
    id: finalMessageId,
    conversation_id: conversation.id,
    workspace_id: conversation.workspace_id,
    role: "assistant",
    step_type: "final_answer",
    content: finalContent,
    content_json: null,
    prompt_tokens: finalUsage?.prompt_tokens ?? null,
    completion_tokens: finalUsage?.completion_tokens ?? null,
    total_tokens: finalUsage?.total_tokens ?? null,
    latency_ms: latencyMs,
    created_at: new Date(),
  })

  // Store citations for top chunks (bulkInsert is a no-op on an empty array)
  const citations = chunks.slice(0, 5).map((chunk, i) => ({
    id: crypto.randomUUID(),
    message_id: finalMessageId,
    workspace_id: conversation.workspace_id,
    chunk_id: chunk.chunk_id || null,
    citation_number: i + 1,
    relevance_score: chunk.similarity ? parseFloat(chunk.similarity) : null,
    cited_text: chunk.content?.slice(0, 500) || "",
    created_at: new Date(),
  }))

  await citationModel.bulkInsert(citations)
  citations.forEach((c) =>
    sendEvent("citation", {
      citation_number: c.citation_number,
      chunk_id: c.chunk_id,
      relevance_score: c.relevance_score,
      cited_text: c.cited_text,
    }),
  )

  // Update conversation title (auto-title on first message) and last_message_at
  const updates = { last_message_at: new Date(), updated_at: new Date() }
  if (!conversation.title) {
    updates.title = userContent.slice(0, 100)
  }
  await conversationModel.update(conversation.id, updates)

  return { messageId: finalMessageId, usage: finalUsage, latencyMs }
}

/**
 * POST /api/workspaces/:workspace_id/conversations/:conversation_id/messages — Send a chat message.
 *
 * Validates and stores the user message, then runs the ReAct loop. When the
 * request sets `Accept: text/event-stream`, streams `token`/`thought`/
 * `observation`/`citation`/`done` events as SSE; otherwise (tests) returns the
 * collected events as JSON.
 *
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 * @returns {Promise<void>}
 */
export const sendMessage = async (req, res, next) => {
  try {
    const { error, value } = messageSchema.validate(req.body)
    if (error) throw new HttpError(HTTP_STATUS_CODE.BAD_REQUEST, error.details[0].message)

    const conversation = await conversationModel.findOne({
      id: req.params.conversation_id,
      workspace_id: req.workspace.id,
      user_id: req.user.id,
    })
    if (!conversation) throw new HttpError(HTTP_STATUS_CODE.NOT_FOUND, "Conversation not found")

    const agent = await agentModel.findOne({
      id: conversation.agent_id,
      workspace_id: req.workspace.id,
    })
    if (!agent) throw new HttpError(HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR, "Agent not found")

    const datasetIds = await conversationDatasetModel.findDatasetIds(conversation.id)

    // Store user message
    const userMessageId = crypto.randomUUID()
    await messageModel.create({
      id: userMessageId,
      conversation_id: conversation.id,
      workspace_id: conversation.workspace_id,
      role: "user",
      step_type: "input",
      content: value.content,
      content_json: null,
      created_at: new Date(),
    })

    const isStreaming = req.headers.accept?.includes("text/event-stream")

    if (isStreaming) {
      res.setHeader("Content-Type", "text/event-stream")
      res.setHeader("Cache-Control", "no-cache")
      res.setHeader("Connection", "keep-alive")
      res.setHeader("X-Accel-Buffering", "no") // disable nginx buffering
      res.flushHeaders()

      const sendEvent = (event, data) => {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        if (typeof res.flush === "function") res.flush()
      }

      try {
        const { messageId, usage, latencyMs } = await runReActLoop({
          conversation,
          agent,
          userMessageId,
          userContent: value.content,
          datasetIds,
          sendEvent,
        })

        sendEvent("done", { message_id: messageId, usage, latency_ms: latencyMs })
      } catch (err) {
        res.write(`event: error\ndata: ${JSON.stringify({ message: err.message })}\n\n`)
      }

      return res.end()
    }

    // Non-streaming mode (for tests)
    const events = []
    const sendEvent = (event, data) => events.push({ event, data })

    const { messageId, usage, latencyMs } = await runReActLoop({
      conversation,
      agent,
      userMessageId,
      userContent: value.content,
      datasetIds,
      sendEvent,
    })

    return res.json(
      apiResponse({
        message: "OK",
        data: { message_id: messageId, events, usage, latency_ms: latencyMs },
      }),
    )
  } catch (error) {
    return next(error)
  }
}
