import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../../src/services/openrouter.js", () => ({
  embedText: vi.fn(),
}))

vi.mock("../../src/services/rag.js", () => ({
  searchChunks: vi.fn(),
}))

const { embedText } = await import("../../src/services/openrouter.js")
const { searchChunks } = await import("../../src/services/rag.js")
const { executeTool, getAvailableTools } = await import("../../src/services/chat-tools.js")

const context = { workspaceId: "w1", datasetIds: ["d1"], conversation: { id: "c1" } }

describe("chat tools registry", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(embedText).mockResolvedValue([0.1, 0.2])
    vi.mocked(searchChunks).mockResolvedValue([
      { chunk_id: "ch1", content: "Revenue grew 12%.", similarity: "0.9" },
    ])
  })

  it("offers the search tool when datasets are linked", () => {
    const tools = getAvailableTools(context)
    expect(tools.map((t) => t.function.name)).toContain("search_knowledge_base")
  })

  it("offers no search tool without datasets", () => {
    const tools = getAvailableTools({ ...context, datasetIds: [] })
    expect(tools.map((t) => t.function.name)).not.toContain("search_knowledge_base")
  })

  it("executes search and returns chunks as extra", async () => {
    const { observation, extra } = await executeTool(
      "search_knowledge_base",
      { query: "revenue" },
      context,
    )
    expect(embedText).toHaveBeenCalledWith("revenue", expect.anything())
    expect(searchChunks).toHaveBeenCalledWith(
      expect.objectContaining({ datasetIds: ["d1"], matchCount: 10, threshold: 0.0 }),
    )
    expect(observation.content).toBe("[1] Revenue grew 12%.")
    expect(extra.chunks).toHaveLength(1)
  })

  it("reports when the search finds nothing", async () => {
    vi.mocked(searchChunks).mockResolvedValue([])
    const { observation, extra } = await executeTool(
      "search_knowledge_base",
      { query: "revenue" },
      context,
    )
    expect(observation.content).toBe("No relevant documents found.")
    expect(extra.chunks).toEqual([])
  })

  it("falls back to the user message when the query argument is missing", async () => {
    await executeTool("search_knowledge_base", {}, { ...context, userContent: "what is revenue?" })
    expect(embedText).toHaveBeenCalledWith("what is revenue?", expect.anything())
  })

  it("returns an error observation for an unknown tool", async () => {
    const { observation } = await executeTool("nope", {}, context)
    expect(observation.error).toContain("unknown tool")
  })
})
