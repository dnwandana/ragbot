export const SNAPSHOT_VERSION = 1
export const MAX_SNAPSHOT_BYTES = 1024 * 1024
export const UNTITLED = "Untitled conversation"
const VISIBLE_STEPS = new Set(["input", "final_answer"])

/** Parses content_json, which arrives as an object or as a JSON string. */
const parseJson = (value) => {
  if (value == null) return null
  if (typeof value === "object") return value
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

const toIso = (value) => new Date(value).toISOString()

/**
 * Builds the frozen public copy of a conversation.
 * Only visible rows go in. Charts move from observation rows to the next final answer.
 * @returns {Object} Snapshot document, version 1.
 */
export const buildSnapshot = ({
  conversation,
  workspace,
  agent,
  messages,
  citations,
  sharedAt = new Date(),
}) => {
  const byMessage = new Map()
  for (const c of citations) {
    if (!byMessage.has(c.message_id)) byMessage.set(c.message_id, [])
    byMessage.get(c.message_id).push({
      n: c.citation_number,
      filename: c.filename || `Source ${c.citation_number}`,
      cited_text: c.cited_text || "",
      relevance_score: c.relevance_score,
    })
  }
  const ordered = messages.toSorted((a, b) => new Date(a.created_at) - new Date(b.created_at))
  const out = []
  let pendingCharts = []
  for (const m of ordered) {
    if (m.step_type === "observation") {
      const charts = parseJson(m.content_json)?.charts
      if (Array.isArray(charts)) pendingCharts.push(...charts)
      continue
    }
    if (!VISIBLE_STEPS.has(m.step_type)) continue
    const entry = {
      id: m.id,
      role: m.role,
      content: m.content ?? "",
      created_at: toIso(m.created_at),
    }
    if (m.step_type === "final_answer") {
      entry.charts = pendingCharts
      entry.citations = (byMessage.get(m.id) || []).toSorted((a, b) => a.n - b.n)
      pendingCharts = []
    }
    out.push(entry)
  }
  return {
    version: SNAPSHOT_VERSION,
    title: conversation.title?.trim() || UNTITLED,
    workspace_name: workspace.name,
    agent_name: agent.name,
    shared_at: toIso(sharedAt),
    messages: out,
  }
}

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  })

/** Renders a snapshot as a Markdown document. Body text is copied as-is. */
export const renderMarkdown = (snapshot) => {
  const lines = [
    `# ${snapshot.title}`,
    "",
    `Shared from ${snapshot.workspace_name} · Agent: ${snapshot.agent_name} · ${formatDate(snapshot.shared_at)}`,
    "",
  ]
  for (const m of snapshot.messages) {
    lines.push(`## ${m.role === "user" ? "You" : snapshot.agent_name}`, "", m.content, "")
    for (const chart of m.charts ?? []) {
      lines.push("```json", JSON.stringify(chart, null, 2), "```", "")
    }
    if (m.citations?.length) {
      lines.push("### Sources", "")
      for (const c of m.citations) lines.push(`${c.n}. **${c.filename}** — "${c.cited_text}"`)
      lines.push("")
    }
  }
  return lines.join("\n")
}

/** Returns a safe download filename for a conversation title. */
export const titleToFilename = (title) => {
  const slug = String(title ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 200)
  return `${slug || "conversation"}.md`
}
