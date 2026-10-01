import { describe, expect, it } from "vitest"
import { buildSystemMessage } from "../../src/services/rag.js"

describe("buildSystemMessage", () => {
  it("writes the registry numbers, separated by a blank line", () => {
    const out = buildSystemMessage("You help.", [
      { n: 1, content: "Alpha." },
      { n: 2, content: "Beta." },
    ])
    expect(out).toContain("[1] Alpha.\n\n[2] Beta.")
  })

  it("tells the model to cite one number in each bracket, also for tool results", () => {
    const out = buildSystemMessage("You help.", [{ n: 1, content: "Alpha." }])
    expect(out).toContain(
      "Cite sources with [N], where N is the excerpt number. This also applies to excerpts from search_knowledge_base results. Use one number in each bracket. For two sources, write [1][3].",
    )
  })

  it("returns the agent prompt unchanged when there are no chunks", () => {
    expect(buildSystemMessage("You help.", [])).toBe("You help.")
  })
})
