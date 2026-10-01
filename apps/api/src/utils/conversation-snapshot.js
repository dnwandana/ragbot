export const SNAPSHOT_VERSION = 1
export const MAX_SNAPSHOT_BYTES = 1024 * 1024
export const UNTITLED = "Untitled conversation"
const VISIBLE_STEPS = new Set(["input", "final_answer"])
const LEGACY_EXCERPT_CHARS = 500

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
      cited_text: passageText(c),
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
      for (const c of m.citations) lines.push(`- **[${c.n}] ${c.filename}** — "${c.cited_text}"`)
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
