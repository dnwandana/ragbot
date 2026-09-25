import { groupThreadMessages } from "./chat-thread-grouping.js"

const UNTITLED = "Untitled conversation"

/**
 * Maps one citation row to the snapshot citation shape.
 * @param {Object} c - Row from the conversation detail `citations` array.
 * @returns {{ n: number, filename: string, cited_text: string, relevance_score: number }}
 */
const toCitation = (c) => ({
  n: c.citation_number,
  filename: c.filename || `Source ${c.citation_number}`,
  cited_text: c.cited_text || "",
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
