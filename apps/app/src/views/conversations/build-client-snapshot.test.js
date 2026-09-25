import { describe, it, expect } from "vitest"
import { buildClientSnapshot } from "./build-client-snapshot.js"

const chart = { type: "bar", data: { labels: ["APAC"], datasets: [{ data: [3] }] } }
const conversation = {
  id: "c1",
  title: "Q3 revenue",
  workspace_id: "w1",
  user_id: "u1",
  messages: [
    {
      id: "m1",
      role: "user",
      step_type: "input",
      content: "Which region grew?",
      created_at: "2026-09-18T10:00:01.000Z",
    },
    {
      id: "m2",
      role: "assistant",
      step_type: "thought",
      content: null,
      content_json: { tool: "execute_code", code: "print(1)" },
      created_at: "2026-09-18T10:00:02.000Z",
    },
    {
      id: "m3",
      role: "assistant",
      step_type: "observation",
      content: null,
      content_json: { stdout: "1", charts: [chart] },
      created_at: "2026-09-18T10:00:03.000Z",
    },
    {
      id: "m4",
      role: "assistant",
      step_type: "final_answer",
      content: "APAC grew fastest [1]",
      model: "gpt",
      total_tokens: 9,
      created_at: "2026-09-18T10:00:04.000Z",
    },
  ],
  citations: [
    {
      message_id: "m4",
      citation_number: 1,
      relevance_score: 0.91,
      cited_text: "region, revenue",
      filename: "sales.csv",
    },
    {
      message_id: "m4",
      citation_number: 2,
      relevance_score: 0.5,
      cited_text: "old",
      filename: null,
    },
  ],
}
const opts = { workspaceName: "Acme", agentName: "Sales analyst" }

describe("buildClientSnapshot", () => {
  it("builds the version 1 shape with only user and final_answer messages", () => {
    const snap = buildClientSnapshot(conversation, opts)
    expect(snap.version).toBe(1)
    expect(snap.title).toBe("Q3 revenue")
    expect(snap.workspace_name).toBe("Acme")
    expect(snap.agent_name).toBe("Sales analyst")
    expect(typeof snap.shared_at).toBe("string")
    expect(snap.messages.map((m) => m.id)).toEqual(["m1", "m4"])
    expect(snap.messages[0]).toEqual({
      id: "m1",
      role: "user",
      content: "Which region grew?",
      created_at: "2026-09-18T10:00:01.000Z",
    })
  })

  it("lifts charts and maps citations onto the assistant message", () => {
    const [, answer] = buildClientSnapshot(conversation, opts).messages
    expect(answer.charts).toEqual([chart])
    expect(answer.citations).toEqual([
      { n: 1, filename: "sales.csv", cited_text: "region, revenue", relevance_score: 0.91 },
      { n: 2, filename: "Source 2", cited_text: "old", relevance_score: 0.5 },
    ])
  })

  it("never leaks model, tokens, code, or ids of the user or workspace", () => {
    const json = JSON.stringify(buildClientSnapshot(conversation, opts))
    for (const bad of ["gpt", "total_tokens", "u1", "w1", "print(1)", "stdout"]) {
      expect(json).not.toContain(bad)
    }
  })

  it("falls back to Untitled conversation and empty names", () => {
    const snap = buildClientSnapshot({ ...conversation, title: "  " }, {})
    expect(snap.title).toBe("Untitled conversation")
    expect(snap.workspace_name).toBe("")
    expect(snap.agent_name).toBe("")
  })
})
