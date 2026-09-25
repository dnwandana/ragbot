import { describe, it, expect } from "vitest"
import {
  buildSnapshot,
  renderMarkdown,
  titleToFilename,
  MAX_SNAPSHOT_BYTES,
} from "../../src/utils/conversation-snapshot.js"

export const at = (s) => new Date(`2026-09-18T10:00:${s}.000Z`)
export const chart = { type: "bar", data: { labels: ["APAC"], datasets: [{ data: [3] }] } }
export const messages = [
  {
    id: "m1",
    role: "user",
    step_type: "input",
    content: "Which region grew?",
    created_at: at("01"),
  },
  {
    id: "m2",
    role: "assistant",
    step_type: "thought",
    content: null,
    content_json: { tool: "execute_code", code: "print(1)" },
    created_at: at("02"),
  },
  {
    id: "m3",
    role: "assistant",
    step_type: "observation",
    content: null,
    content_json: { stdout: "1", charts: [chart] },
    created_at: at("03"),
  },
  {
    id: "m4",
    role: "assistant",
    step_type: "final_answer",
    content: "APAC grew fastest [1]",
    model: "gpt",
    total_tokens: 9,
    created_at: at("04"),
  },
]
export const citations = [
  {
    message_id: "m4",
    citation_number: 1,
    relevance_score: 0.91,
    cited_text: "region, revenue",
    filename: "sales.csv",
  },
  { message_id: "m4", citation_number: 2, relevance_score: 0.5, cited_text: "old", filename: null },
]
export const input = {
  conversation: { id: "c1", title: "Q3 revenue", workspace_id: "w1", user_id: "u1" },
  workspace: { id: "w1", name: "Acme" },
  agent: { id: "a1", name: "Sales analyst" },
  messages,
  citations,
  sharedAt: at("10"),
}

describe("buildSnapshot", () => {
  it("keeps only input and final_answer rows in created_at order", () => {
    const snap = buildSnapshot({ ...input, messages: messages.toReversed() })
    expect(snap.messages.map((m) => m.id)).toEqual(["m1", "m4"])
    expect(snap.version).toBe(1)
    expect(snap.shared_at).toBe("2026-09-18T10:00:10.000Z")
    expect(MAX_SNAPSHOT_BYTES).toBe(1024 * 1024)
  })

  it("lifts observation charts onto the next final_answer", () => {
    const snap = buildSnapshot(input)
    expect(snap.messages[1].charts).toEqual([chart])
    expect(snap.messages[0].charts).toBeUndefined()
  })

  it("attaches citations by message_id with a Source fallback name", () => {
    const [, answer] = buildSnapshot(input).messages
    expect(answer.citations).toEqual([
      { n: 1, filename: "sales.csv", cited_text: "region, revenue", relevance_score: 0.91 },
      { n: 2, filename: "Source 2", cited_text: "old", relevance_score: 0.5 },
    ])
  })

  it("never leaks model, tokens, ids of user or workspace", () => {
    const json = JSON.stringify(buildSnapshot(input))
    for (const bad of ["gpt", "total_tokens", "u1", "w1", "print(1)", "stdout"]) {
      expect(json).not.toContain(bad)
    }
  })

  it("falls back to Untitled conversation", () => {
    const snap = buildSnapshot({ ...input, conversation: { ...input.conversation, title: "  " } })
    expect(snap.title).toBe("Untitled conversation")
  })
})

describe("renderMarkdown", () => {
  it("renders title, meta line, both turns, a chart block and a Sources list", () => {
    const md = renderMarkdown(buildSnapshot(input))
    expect(md).toContain("# Q3 revenue")
    expect(md).toContain("Shared from Acme · Agent: Sales analyst · 18 September 2026")
    expect(md).toContain("## You\n\nWhich region grew?")
    expect(md).toContain("## Sales analyst\n\nAPAC grew fastest [1]")
    expect(md).toContain("```json\n" + JSON.stringify(chart, null, 2) + "\n```")
    expect(md).toContain('### Sources\n\n1. **sales.csv** — "region, revenue"')
  })

  it("omits the Sources heading when an answer has no citations", () => {
    const md = renderMarkdown(buildSnapshot({ ...input, citations: [] }))
    expect(md).not.toContain("### Sources")
  })
})

describe("titleToFilename", () => {
  it("slugs the title and falls back to conversation", () => {
    expect(titleToFilename("Q3 Revenue: by region!")).toBe("q3-revenue-by-region.md")
    expect(titleToFilename("")).toBe("conversation.md")
    expect(titleToFilename(null)).toBe("conversation.md")
  })

  it("caps the slug at 200 characters", () => {
    expect(titleToFilename("a".repeat(300))).toBe("a".repeat(200) + ".md")
  })
})
