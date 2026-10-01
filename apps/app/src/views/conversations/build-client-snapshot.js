import { groupThreadMessages } from "./chat-thread-grouping.js"

const UNTITLED = "Untitled conversation"
const LEGACY_EXCERPT_CHARS = 500

/** Removes the Markdown link, emphasis, code, and table syntax from a passage. */
const toPlainText = (s) =>
  s
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\*\*(?=\S)(.+?)(?<=\S)\*\*/g, "$1")
    .replace(/(?<!\w)__(?=\S)(.+?)(?<=\S)__(?!\w)/g, "$1")
    .replace(/\*(?=\S)(.+?)(?<=\S)\*/g, "$1")
    .replace(/(?<!\w)_(?=\S)(.+?)(?<=\S)_(?!\w)/g, "$1")
    .replace(/`/g, "")
    .replace(/\|/g, " ")
    .replace(/\s+/g, " ")
    .trim()

/**
 * Returns the plain text of the cited passage.
 * Keep this rule the same as passageText in apps/api/src/utils/conversation-snapshot.js.
 * Valid offsets are integers with `0 <= start < end <= cited_text.length`. Without
 * valid offsets (for example an old row), returns the first 500 characters of
 * `cited_text` with no other change.
 *
 * @param {Object} citation - A citation row.
 * @param {string} [citation.cited_text] - The full chunk text.
 * @param {number|null} [citation.snippet_start_char] - The start of the passage (UTF-16 index).
 * @param {number|null} [citation.snippet_end_char] - The end of the passage (UTF-16 index, exclusive).
 * @returns {string} The passage as plain text, or the legacy excerpt.
 */
export const passageText = ({ cited_text, snippet_start_char: start, snippet_end_char: end }) => {
  const text = cited_text ?? ""
  const valid =
    Number.isInteger(start) &&
    Number.isInteger(end) &&
    start >= 0 &&
    start < end &&
    end <= text.length
  if (!valid) return text.slice(0, LEGACY_EXCERPT_CHARS)
  return toPlainText(text.slice(start, end))
}

/**
 * Maps one citation row to the snapshot citation shape.
 * @param {Object} c - Row from the conversation detail `citations` array.
 * @returns {{ n: number, filename: string, cited_text: string, relevance_score: number }}
 */
const toCitation = (c) => ({
  n: c.citation_number,
  filename: c.filename || `Source ${c.citation_number}`,
  cited_text: passageText(c),
  relevance_score: c.relevance_score,
})

/**
 * Builds a version 1 snapshot from a private conversation response.
 *
 * The output matches the server snapshot, so `ReadonlyThread` renders the print
 * view and the public share page from the same shape. Model, token, and id
 * fields of the workspace or user never reach the output.
 *
 * @param {Object} conversation - Detail with `title`, `messages`, and `citations`.
 * @param {Object} options - Display names.
 * @param {string} [options.workspaceName] - Workspace name.
 * @param {string} [options.agentName] - Agent name.
 * @returns {Object} Snapshot `{ version, title, workspace_name, agent_name, shared_at, messages }`.
 */
export function buildClientSnapshot(conversation, { workspaceName = "", agentName = "" } = {}) {
  const byMessage = new Map()
  for (const c of conversation.citations || []) {
    if (!byMessage.has(c.message_id)) byMessage.set(c.message_id, [])
    byMessage.get(c.message_id).push(toCitation(c))
  }
  const messages = groupThreadMessages(conversation.messages || []).map((m) => {
    const base = { id: m.id, role: m.role, content: m.content ?? "", created_at: m.created_at }
    if (m.role !== "assistant") return base
    return { ...base, charts: m.charts, citations: byMessage.get(m.id) || [] }
  })
  return {
    version: 1,
    title: conversation.title?.trim() || UNTITLED,
    workspace_name: workspaceName,
    agent_name: agentName,
    shared_at: new Date().toISOString(),
    messages,
  }
}
