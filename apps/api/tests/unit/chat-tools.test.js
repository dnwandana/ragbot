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
const { createCitationRegistry } = await import("../../src/services/citation-registry.js")

let context

describe("chat tools registry", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    context = {
      workspaceId: "w1",
      datasetIds: ["d1"],
      conversation: { id: "c1" },
      citationRegistry: createCitationRegistry(),
    }
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

  it("continues the numbers after the chunks in the system prompt", async () => {
    context.citationRegistry.register(
      Array.from({ length: 10 }, (_, i) => ({ chunk_id: `s${i}`, content: "x" })),
    )
    const { observation, extra } = await executeTool(
      "search_knowledge_base",
      { query: "q" },
      context,
    )
    expect(observation.content).toBe("[11] Revenue grew 12%.")
    expect(extra.chunks[0].n).toBe(11)
  })

  it("keeps the number of a chunk that the model saw before", async () => {
    context.citationRegistry.register([{ chunk_id: "x" }, { chunk_id: "ch1" }])
    const { observation } = await executeTool("search_knowledge_base", { query: "q" }, context)
    expect(observation.content).toBe("[2] Revenue grew 12%.")
  })

  it("sends the full chunk text, separated by a blank line", async () => {
    const long = "A".repeat(600)
    vi.mocked(searchChunks).mockResolvedValue([
      { chunk_id: "c1", content: long, similarity: 0.9 },
      { chunk_id: "c2", content: "Short.", similarity: 0.8 },
    ])
    const { observation } = await executeTool("search_knowledge_base", { query: "q" }, context)
    expect(observation.content).toBe(`[1] ${long}\n\n[2] Short.`)
  })

  it("returns an error observation for an unknown tool", async () => {
    const { observation } = await executeTool("nope", {}, context)
    expect(observation.error).toContain("unknown tool")
  })
})
