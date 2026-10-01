/**
 * Registry of tools the chat ReAct loop can offer to the model.
 *
 * Each tool declares availability per request context, so the loop
 * builds the tools array with getAvailableTools(context) and dispatches
 * calls through executeTool() without knowing tool internals.
 */

import * as openrouterService from "./openrouter.js"
import * as ragService from "./rag.js"
import { executeCode, isSandboxEnabled } from "./sandbox.js"
import { getObjectBuffer } from "./storage.js"

const registry = new Map()

/**
 * Registers one tool in the registry.
 *
 * @param {Object} tool - The tool to register.
 * @param {Object} tool.definition - OpenAI-style tool definition.
 * @param {(context: Object) => boolean} tool.isAvailable - Availability test for a request context.
 * @param {(args: Object, context: Object) => Promise<Object>} tool.execute - The tool handler.
 * @returns {void}
 */
export const registerTool = (tool) => {
  registry.set(tool.definition.function.name, tool)
}

/**
 * Returns the tool definitions available for this request context.
 *
 * @param {Object} context - The request context (`workspaceId`, `datasetIds`, `conversation`, …).
 * @returns {Object[]} OpenAI-style tool definitions.
 */
export const getAvailableTools = (context) =>
  [...registry.values()].filter((tool) => tool.isAvailable(context)).map((tool) => tool.definition)

/**
 * Executes a named tool. Unknown names return an error observation.
 *
 * @param {string} name - The tool name from the model's tool call.
 * @param {Object} args - Parsed tool-call arguments.
 * @param {Object} context - The same context given to getAvailableTools.
 * @returns {Promise<{ observation: Object, extra?: Object }>} The observation for the model plus side-channel data.
 */
export const executeTool = async (name, args, context) => {
  const tool = registry.get(name)
  if (!tool) {
    return { observation: { error: `unknown tool: ${name}` } }
  }
  return tool.execute(args, context)
}

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
 * Runs a vector search over the conversation's datasets.
 *
 * Falls back to the user message when the model sends no query, so a
 * malformed tool call still returns context instead of an error.
 *
 * The citation registry of the turn numbers the chunks, so the numbers continue
 * after the excerpts in the system prompt. A chunk that the model saw before
 * keeps its number.
 *
 * @param {Object} args - Tool-call arguments (`query`).
 * @param {Object} context - The request context (`datasetIds`, `userContent`, `citationRegistry`).
 * @returns {Promise<{ observation: Object, extra: Object }>} Excerpt text plus the numbered chunk rows for citations.
 */
const executeSearch = async (args, context) => {
  const query = args?.query || context.userContent || ""

  const embedding = await openrouterService.embedText(query, process.env.DEFAULT_EMBEDDINGS_MODEL)

  const chunks = context.citationRegistry.register(
    await ragService.searchChunks({
      embedding,
      datasetIds: context.datasetIds,
      matchCount: 10,
      threshold: 0.0,
    }),
  )

  const content = chunks.length
    ? chunks.map((c) => `[${c.n}] ${c.content}`).join("\n\n")
    : "No relevant documents found."

  return { observation: { content }, extra: { chunks } }
}

registerTool({
  definition: SEARCH_TOOL,
  isAvailable: (context) => context.datasetIds.length > 0,
  execute: executeSearch,
})

/** OpenRouter tool definition exposing the Python sandbox as a callable tool. */
const EXECUTE_CODE_TOOL = {
  type: "function",
  function: {
    name: "execute_code",
    description:
      "Runs Python against the listed data files in a sandbox with no internet. " +
      "Files are in the working directory under their sanitized names. " +
      "The only libraries installed are pandas, numpy, duckdb, pyarrow and openpyxl. " +
      "There is no matplotlib, seaborn or any other plotting library, and no pip. " +
      "An import of anything else fails with ModuleNotFoundError. " +
      "To draw a chart, call show_chart(spec) with a Chart.js spec — this is the only way " +
      "to produce one, and it renders in the user's browser (max 5 per run). " +
      'The spec shape is {"type": "bar", "data": {"labels": [...], ' +
      '"datasets": [{"label": "...", "data": [...]}]}}. ' +
      "Print anything you want to read back.",
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description:
            "A short label for this step, shown to the user above the code. " +
            'For example: "Sum fulfilled revenue by month".',
        },
        code: { type: "string", description: "Python source to execute." },
        file_ids: {
          type: "array",
          items: { type: "string" },
          description: "Ids of the data files the code reads.",
        },
      },
      required: ["title", "code", "file_ids"],
    },
  },
}

/** Names the sandbox writes into the workdir itself, so an upload must not use them. */
const SANDBOX_RESERVED_NAMES = new Set(["charts.json", "__user_code__.py", "stdout", "stderr"])

/**
 * Converts a stored filename into a name the sandbox accepts.
 *
 * The sandbox only accepts `^[A-Za-z0-9._-]+$` names that do not start with
 * a dot and that are not one of its reserved names, so the chat loop shows
 * the same sanitized name to the model.
 *
 * @param {string} name - The stored filename.
 * @returns {string} The sandbox-safe filename.
 */
export const sanitizeFileName = (name) => {
  const safe = name.replaceAll(/[^A-Za-z0-9._-]/g, "_")
  if (safe.startsWith(".")) return `_${safe.slice(1)}`
  return SANDBOX_RESERVED_NAMES.has(safe) ? `_${safe}` : safe
}

/**
 * Runs model-written Python against the conversation's tabular files.
 *
 * Validates the requested ids against the context's tabular files, so the
 * model can never reach a file outside its own conversation. Every failure
 * returns an observation instead of throwing.
 *
 * @param {Object} args - Tool-call arguments (`title`, `code`, `file_ids`).
 * @param {Object} context - The request context (`tabularFiles`).
 * @returns {Promise<{ observation: Object, extra?: Object }>} Sandbox output plus the charts as extra.
 */
const executeCodeTool = async (args, context) => {
  const byId = new Map((context.tabularFiles ?? []).map((file) => [file.id, file]))
  const requestedIds = args?.file_ids ?? []
  const unknown = requestedIds.filter((id) => !byId.has(id))
  if (unknown.length > 0) {
    return { observation: { error: `unknown file id(s): ${unknown.join(", ")}` } }
  }

  let files
  try {
    files = await Promise.all(
      requestedIds.map(async (id) => {
        const file = byId.get(id)
        return {
          name: sanitizeFileName(file.filename),
          content: await getObjectBuffer(file.storage_path),
        }
      }),
    )
  } catch (error) {
    return { observation: { error: `could not download data file: ${error.message}` } }
  }

  const result = await executeCode({ code: args?.code ?? "", files })

  return {
    observation: {
      stdout: result.stdout,
      stderr: result.stderr,
      error: result.error,
      duration_ms: result.duration_ms,
    },
    extra: { charts: result.charts ?? [] },
  }
}

registerTool({
  definition: EXECUTE_CODE_TOOL,
  isAvailable: (context) => isSandboxEnabled() && (context.tabularFiles?.length ?? 0) > 0,
  execute: executeCodeTool,
})
