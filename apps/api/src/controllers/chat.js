import crypto from "node:crypto"
import joi from "joi"
import HttpError from "../utils/http-error.js"
import apiResponse from "../utils/response.js"
import { HTTP_STATUS_CODE } from "../utils/constant.js"
import logger from "../utils/logger.js"
import * as conversationModel from "../models/conversations.js"
import * as conversationDatasetModel from "../models/conversation-datasets.js"
import * as messageModel from "../models/conversation-messages.js"
import * as citationModel from "../models/conversation-message-citations.js"
import * as agentModel from "../models/agents.js"
import * as datasetFileModel from "../models/dataset-files.js"
import * as openrouterService from "../services/openrouter.js"
import * as ragService from "../services/rag.js"
import { executeTool, getAvailableTools, sanitizeFileName } from "../services/chat-tools.js"
import { createCitationRegistry } from "../services/citation-registry.js"
import { buildCitationRows } from "../services/citation-rows.js"
import { isSandboxEnabled } from "../services/sandbox.js"
import { generateTitle } from "../services/title-generator.js"

/** Validates the chat message request body. */
const messageSchema = joi
  .object({ content: joi.string().min(1).max(100000).required() })
  .options({ stripUnknown: true })

/** Fallback tool-call id used when the provider streams no id. */
const FALLBACK_TOOL_CALL_ID = "call_0"

/**
 * Describe one tabular file for the system prompt: its id, the name it gets
 * inside the sandbox, and the sheets and columns of its stored profile.
 *
 * @param {Object} file - A dataset_files row with a `metadata.profile` object.
 * @returns {string} One prompt line for the file.
 */
const describeDataFile = (file) => {
  const metadata =
    typeof file.metadata === "string" ? JSON.parse(file.metadata) : (file.metadata ?? {})
  const sheets = (metadata.profile?.sheets ?? [])
    .map((sheet) => {
      const columns = (sheet.columns ?? []).map((column) => column.name).join(", ")
      return `${sheet.name} (${sheet.rows} rows: ${columns})`
    })
    .join("; ")
  return `- id: ${file.id} — ${file.filename} — saved in the sandbox as ${sanitizeFileName(
    file.filename,
  )} — ${sheets}`
}

/**
 * Build the "Available data files" section appended to the system prompt.
 *
 * @param {Object[]} tabularFiles - Completed tabular files linked to the conversation.
 * @returns {string} The prompt section, or an empty string when there are no files.
 */
const buildDataFilesSection = (tabularFiles) =>
  tabularFiles.length === 0
    ? ""
    : `\n\nAvailable data files (use execute_code with these ids):\n${tabularFiles
        .map(describeDataFile)
        .join("\n")}`

/**
 * Consume an OpenRouter SSE ReadableStream, forwarding text deltas to `onToken`
 * and accumulating any streamed tool call.
 *
 * @param {ReadableStream} stream - The OpenRouter response body stream.
 * @param {(token: string) => void} onToken - Called with each text delta as it arrives.
 * @param {AbortSignal} [signal] - Optional abort signal that stops the read loop when aborted.
 * @returns {Promise<{ finishReason: string|null, usage: Object|null, toolCall: { name: string, arguments: string }|null, toolCallId: string|null }>}
 */
export async function consumeStream(stream, onToken, signal) {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  let accumulatedToolCall = null
  let toolCallId = null
  let finishReason = null
  let usage = null

  try {
    while (true) {
      if (signal?.aborted) break
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
            if (tc.id) toolCallId = tc.id
            if (tc.function?.name) accumulatedToolCall.name += tc.function.name
            if (tc.function?.arguments) accumulatedToolCall.arguments += tc.function.arguments
          }
        } catch (e) {
          if (raw && raw !== "[DONE]") {
            logger.warn("SSE parse error", { error: e.message, raw: raw.slice(0, 100) })
          }
        }
      }
    }
  } finally {
    reader.cancel().catch(() => {})
  }

  return { finishReason, usage, toolCall: accumulatedToolCall, toolCallId }
}

/**
 * Run the server-side ReAct loop: embed the query, search the vector store,
 * stream the model response, dispatch tool calls through the tool registry,
 * then persist the final answer plus citations. The message array is
 * append-only, so every iteration sees all earlier tool calls and results.
 * Model-agnostic about transport — emits structured events via `sendEvent`
 * for both SSE and JSON modes.
 *
 * @param {Object} params
 * @param {Object} params.conversation - The conversation row.
 * @param {Object} params.agent - The agent row (system prompt + model config).
 * @param {string} params.userMessageId - ID of the already-stored user message (excluded from history).
 * @param {string} params.userContent - The user's message text.
 * @param {string[]} params.datasetIds - Dataset UUIDs linked to the conversation.
 * @param {(event: string, data: Object) => void} params.sendEvent - Event sink (SSE write or array push).
 * @param {AbortSignal} [params.signal] - Optional abort signal; when aborted, stops the loop and throws before persisting.
 * @returns {Promise<{ messageId: string, usage: Object|null, latencyMs: number }>}
 */
async function runReActLoop({
  conversation,
  agent,
  userMessageId,
  userContent,
  datasetIds,
  sendEvent,
  signal,
}) {
  const startTime = Date.now()

  // 1. Embed the user query
  const queryEmbedding = await openrouterService.embedText(
    userContent,
    process.env.DEFAULT_EMBEDDINGS_MODEL,
  )

  // One number space for the turn, so a tool search never reuses a number.
  const citationRegistry = createCitationRegistry()

  // 2. Initial RAG search
  const initialChunks = citationRegistry.register(
    await ragService.searchChunks({
      embedding: queryEmbedding,
      datasetIds,
      matchCount: 10,
      threshold: 0.0,
    }),
  )

  // 3. Build conversation history (only visible messages)
  const history = await messageModel.findVisibleByConversationId(conversation.id)
  const historyMessages = history
    .filter((m) => m.id !== userMessageId) // exclude the just-stored user message
    .map((m) => ({ role: m.role, content: m.content }))

  // Tabular files the model may analyse with execute_code. Loaded only when the
  // sandbox is on, so a disabled sandbox costs no query and advertises no files.
  const tabularFiles =
    isSandboxEnabled() && datasetIds.length > 0
      ? await datasetFileModel.findCompletedTabularByDatasetIds(
          datasetIds,
          conversation.workspace_id,
        )
      : []

  const systemContent =
    ragService.buildSystemMessage(agent.system_prompt, initialChunks) +
    buildDataFilesSection(tabularFiles)

  // One append-only message array for the whole run: every tool turn is pushed
  // onto it, so the model keeps seeing all earlier tool calls and observations.
  const openRouterMessages = [
    { role: "system", content: systemContent },
    ...historyMessages,
    { role: "user", content: userContent },
  ]

  // Shared context every tool receives.
  const toolContext = {
    workspaceId: conversation.workspace_id,
    datasetIds,
    conversation,
    userContent,
    tabularFiles,
    citationRegistry,
  }

  let finalContent = ""
  let finalUsage = null
  const modelConfig =
    typeof agent.model_config === "string" ? JSON.parse(agent.model_config) : agent.model_config

  // Read per call, not at module load, so a request can vary the budget.
  const MAX_ITERATIONS = Number(process.env.CHAT_MAX_ITERATIONS ?? 10)
  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    if (signal?.aborted) throw new Error("client disconnected")
    const isLastIteration = iteration === MAX_ITERATIONS - 1
    // The last iteration gets no tools, which forces the model to answer.
    const tools = isLastIteration ? [] : getAvailableTools(toolContext)
    const useTools = tools.length > 0
    const streamBody = await openrouterService.chatCompletionStream(openRouterMessages, {
      ...modelConfig,
      tools: useTools ? tools : undefined,
      tool_choice: useTools ? "auto" : undefined,
      signal,
    })

    let iterTokens = ""

    const { finishReason, usage, toolCall, toolCallId } = await consumeStream(
      streamBody,
      (token) => {
        iterTokens += token
        sendEvent("token", { content: token })
      },
      signal,
    )

    if (signal?.aborted) throw new Error("client disconnected")

    if (usage) finalUsage = usage

    if (finishReason === "tool_calls" && toolCall) {
      let args = {}
      try {
        args = JSON.parse(toolCall.arguments) || {}
      } catch {}

      const isExecute = toolCall.name === "execute_code"

      // An execution step shows the code it ran; a search step keeps its old shape.
      // The filenames are resolved here, so a reloaded thread needs no extra lookup.
      const fileIds = args.file_ids ?? []
      const thoughtPayload = isExecute
        ? {
            tool: "execute_code",
            title: args.title ?? "",
            code: args.code ?? "",
            file_ids: fileIds,
            filenames: fileIds
              .map((id) => tabularFiles.find((file) => file.id === id)?.filename)
              .filter(Boolean),
          }
        : { tool_call: toolCall }

      // Store thought message
      await messageModel.create({
        id: crypto.randomUUID(),
        conversation_id: conversation.id,
        workspace_id: conversation.workspace_id,
        role: "assistant",
        step_type: "thought",
        content: null,
        content_json: JSON.stringify(thoughtPayload),
        created_at: new Date(),
      })

      sendEvent(
        "thought",
        isExecute
          ? thoughtPayload
          : { content: `Searching: ${toolCall.arguments}`, tool_call: toolCall },
      )

      const { observation, extra } = await executeTool(toolCall.name, args, toolContext)

      const observationContent = observation?.content ?? JSON.stringify(observation)

      // Charts ride alongside the observation for the UI; the model never sees them.
      const charts = isExecute ? (extra?.charts ?? []) : []
      const observationPayload = isExecute ? { ...observation, charts } : observation

      // Store observation message
      const observationId = crypto.randomUUID()
      await messageModel.create({
        id: observationId,
        conversation_id: conversation.id,
        workspace_id: conversation.workspace_id,
        role: "tool",
        step_type: "observation",
        content: observationContent,
        content_json: JSON.stringify(observationPayload),
        created_at: new Date(),
      })

      sendEvent("observation", {
        ...(isExecute ? observationPayload : { content: observationContent }),
        sources: (extra?.chunks ?? []).map((c) => c.chunk_id),
      })

      charts.forEach((spec, index) =>
        sendEvent("chart", { message_id: observationId, index, spec }),
      )

      // Append the tool turn so the next iteration sees this call and its result.
      const callId = toolCallId ?? FALLBACK_TOOL_CALL_ID
      openRouterMessages.push({
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: callId,
            type: "function",
            function: { name: toolCall.name, arguments: toolCall.arguments },
          },
        ],
      })
      openRouterMessages.push({
        role: "tool",
        tool_call_id: callId,
        content: JSON.stringify(observation),
      })
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

  // Store a citation only for a number that the answer cites and the registry knows.
  const citations = buildCitationRows({
    answer: finalContent,
    registry: citationRegistry,
    messageId: finalMessageId,
    workspaceId: conversation.workspace_id,
  })

  await citationModel.bulkInsert(citations)
  citations.forEach((c) =>
    sendEvent("citation", {
      citation_number: c.citation_number,
      chunk_id: c.chunk_id,
      relevance_score: c.relevance_score,
      cited_text: c.cited_text,
      snippet_start_char: c.snippet_start_char,
      snippet_end_char: c.snippet_end_char,
    }),
  )

  // Update conversation title (auto-title on first message) and last_message_at.
  // The LLM title is best-effort: fall back to the message prefix when it fails.
  const updates = { last_message_at: new Date(), updated_at: new Date() }
  if (!conversation.title) {
    const title = await generateTitle(userContent, finalContent)
    updates.title = title ?? userContent.slice(0, 100)
  }
  await conversationModel.update(conversation.id, updates)

  return { messageId: finalMessageId, usage: finalUsage, latencyMs }
}

/**
 * POST /api/workspaces/:workspace_id/conversations/:conversation_id/messages — Send a chat message.
 *
 * Validates and stores the user message, then runs the ReAct loop. When the
 * request sets `Accept: text/event-stream`, streams `token`/`thought`/
 * `observation`/`chart`/`citation`/`done` events as SSE; otherwise (tests)
 * returns the collected events as JSON.
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

      const controller = new AbortController()
      req.on("close", () => controller.abort())

      const sendEvent = (event, data) => {
        if (res.writableEnded) return
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
          signal: controller.signal,
        })

        sendEvent("done", { message_id: messageId, usage, latency_ms: latencyMs })
      } catch (err) {
        if (controller.signal.aborted) {
          logger.info("Chat stream aborted by client disconnect", {
            requestId: req.id,
            conversationId: conversation.id,
          })
        } else {
          logger.error("Chat stream failed", {
            requestId: req.id,
            conversationId: conversation.id,
            error: err.stack,
          })
          sendEvent("error", { message: err.message })
        }
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
