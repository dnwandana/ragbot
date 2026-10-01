import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../../src/utils/logger.js", () => ({
  default: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}))
vi.mock("../../src/services/passage-matcher.js", async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, findPassage: vi.fn(actual.findPassage) }
})

const { default: logger } = await import("../../src/utils/logger.js")
const { findPassage } = await import("../../src/services/passage-matcher.js")
const { createCitationRegistry } = await import("../../src/services/citation-registry.js")
const { buildCitationRows, toRelevanceScore } = await import("../../src/services/citation-rows.js")

const chunks = [
  { chunk_id: "c1", content: "Gross margin held at 71%.", similarity: "0.92" },
  {
    chunk_id: "c2",
    content: "Intro. APAC revenue increased 12% to $4.1M. Outro.",
    similarity: 0.8,
  },
  { chunk_id: "c3", content: "Japan grew 13%.", similarity: undefined },
]
const build = (answer, list = chunks) => {
  const registry = createCitationRegistry()
  registry.register(list)
  return buildCitationRows({ answer, registry, messageId: "m1", workspaceId: "w1" })
}

beforeEach(() => vi.clearAllMocks())

describe("buildCitationRows", () => {
  it("stores only the cited numbers, one row each, sorted", () => {
    const rows = build("APAC grew 12% to $4.1M [2]. Japan grew 13% [3][2].")
    expect(rows.map((r) => r.citation_number)).toEqual([2, 3])
    expect(rows.map((r) => r.chunk_id)).toEqual(["c2", "c3"])
  })

  it("stores no row for a number that is not in the registry", () => {
    expect(build("Something [9].")).toEqual([])
  })

  it("stores no rows for an answer without markers", () => {
    expect(build("No sources here.")).toEqual([])
  })

  it("stores the full chunk and the passage offsets", () => {
    const [row] = build("APAC revenue grew 12% to $4.1M [2].")
    expect(row.cited_text).toBe(chunks[1].content)
    expect(row.cited_text.slice(row.snippet_start_char, row.snippet_end_char)).toBe(
      "APAC revenue increased 12% to $4.1M.",
    )
    expect(row).toMatchObject({ message_id: "m1", workspace_id: "w1" })
    expect(row.created_at).toBeInstanceOf(Date)
  })

  it("stores null offsets when no passage matches", () => {
    const [row] = build("Unrelated words only [1].")
    expect(row.snippet_start_char).toBeNull()
    expect(row.snippet_end_char).toBeNull()
  })

  it("logs a warning and stores null offsets when the matcher throws", () => {
    vi.mocked(findPassage).mockImplementationOnce(() => {
      throw new Error("boom")
    })
    const rows = build("Gross margin held at 71% [1]. Japan grew 13% [3].")
    expect(rows[0]).toMatchObject({
      citation_number: 1,
      snippet_start_char: null,
      snippet_end_char: null,
    })
    expect(rows[1].snippet_start_char).not.toBeNull()
    expect(logger.warn).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ message_id: "m1", citation_number: 1, error: "boom" }),
    )
  })

  it("stores an empty cited_text when the chunk has no content", () => {
    const [row] = build("See [1].", [{ chunk_id: "c9", similarity: 0.5 }])
    expect(row.cited_text).toBe("")
    expect(row.snippet_start_char).toBeNull()
  })

  // Review Focus: a partial unique index allows one null chunk_id for each message.
  it("keeps only the first cited chunk without a chunk_id", () => {
    const rows = build("A [1]. B [2].", [{ content: "A." }, { content: "B." }])
    expect(rows.map((r) => r.citation_number)).toEqual([1])
  })
})

describe("toRelevanceScore", () => {
  it.each([
    ["0.92", 0.92],
    [0.5, 0.5],
    [1.4, 1],
    [-0.2, 0],
    [undefined, 0],
    [null, 0],
    ["abc", 0],
  ])("maps %s to %s", (input, expected) => {
    expect(toRelevanceScore(input)).toBe(expected)
  })
})
