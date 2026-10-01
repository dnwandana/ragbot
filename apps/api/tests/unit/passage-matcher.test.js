import { describe, expect, it } from "vitest"
import {
  answerClaims,
  chunkUnits,
  findPassage,
  parseCitationMarkers,
  tokenize,
} from "../../src/services/passage-matcher.js"

const nums = (text) => parseCitationMarkers(text).map((m) => m.n)

describe("parseCitationMarkers", () => {
  it("finds single markers in order, with the offset of the bracket", () => {
    const text = "Revenue grew [6]. Japan led [1]."
    expect(parseCitationMarkers(text)).toEqual([
      { n: 6, index: text.indexOf("[6]") },
      { n: 1, index: text.indexOf("[1]") },
    ])
  })

  it("finds adjacent markers", () => {
    expect(nums("Both agree [1][3].")).toEqual([1, 3])
  })

  it("ignores a list of numbers in one bracket", () => {
    expect(nums("Both agree [1, 3].")).toEqual([])
  })

  it("ignores a link", () => {
    expect(nums("See [1](https://example.com).")).toEqual([])
  })

  it("ignores a marker followed by a bracket with a non-digit", () => {
    expect(nums("See [1][a] here.")).toEqual([])
  })

  it("ignores markers in inline code and in fenced code", () => {
    const text = "Use `arr[1]` here [2].\n\n```py\nx = rows[3]\n```\n\nDone [4]."
    expect(nums(text)).toEqual([2, 4])
  })
})

describe("tokenize", () => {
  it("normalizes numbers and gives them weight 3", () => {
    const t = tokenize("$4.1M, 12%, 2,050, +13.2%, -3.0% and $4.10M")
    expect([...t.keys()]).toEqual(["4.1m", "12", "2050", "13.2", "3"])
    expect(t.get("4.1m")).toBe(3)
  })

  it("matches 12.0 and 12", () => {
    expect([...tokenize("12.0%").keys()]).toEqual(["12"])
  })

  it("lower-cases words, gives them weight 1, and removes stop words", () => {
    const t = tokenize("The APAC revenue increased in the quarter")
    expect([...t.entries()]).toEqual([
      ["apac", 1],
      ["revenue", 1],
      ["increased", 1],
      ["quarter", 1],
    ])
  })

  it("keeps a mixed letter and digit token as a word", () => {
    expect([...tokenize("Q2 and 3rd").entries()]).toEqual([
      ["q2", 1],
      ["3rd", 1],
    ])
  })

  it("ignores Markdown syntax and a sentence dot after a number", () => {
    expect([...tokenize("**12%** to $4.1M.").keys()]).toEqual(["12", "4.1m"])
  })

  it("keeps letters outside ASCII", () => {
    expect([...tokenize("Zürich grew").keys()]).toEqual(["zürich", "grew"])
  })
})

const texts = (text) => chunkUnits(text).map(({ start, end }) => text.slice(start, end))

describe("chunkUnits", () => {
  it("splits a paragraph into sentences, and keeps the dot in $4.1M", () => {
    expect(
      texts("APAC revenue increased **12%** quarter over quarter to $4.1M. APAC margin improved."),
    ).toEqual([
      "APAC revenue increased **12%** quarter over quarter to $4.1M.",
      "APAC margin improved.",
    ])
  })

  it("makes one unit of a list item, without the prefix", () => {
    expect(
      texts("- Gross margin held at **71%**.\n1. The board reviewed the report. It agreed."),
    ).toEqual(["Gross margin held at **71%**.", "The board reviewed the report. It agreed."])
  })

  it("makes one unit of a table row, and skips the separator row and headings", () => {
    const md = "## APAC revenue\n\n| Country | Q2 |\n| --- | --- |\n| Japan | 2.32M |"
    expect(texts(md)).toEqual(["| Country | Q2 |", "| Japan | 2.32M |"])
  })

  it("excludes outer white space from the offsets", () => {
    expect(texts("   Indented sentence.  ")).toEqual(["Indented sentence."])
  })

  // Review Focus: a chunk with CRLF line ends.
  it("never includes a carriage return in a unit", () => {
    expect(texts("First line.\r\nSecond line.\r\n- Item\r\n")).toEqual([
      "First line.",
      "Second line.",
      "Item",
    ])
  })

  it("returns no units for an empty text", () => {
    expect(chunkUnits("")).toEqual([])
  })
})

describe("answerClaims", () => {
  const answer =
    "APAC revenue grew **12%** quarter over quarter in Q2, to $4.1M [6]. " +
    "Japan drove most of the increase [1], with 61% of the APAC gain [12]. " +
    "Two enterprise contracts that started in April explain the Japan growth [12]."

  it("returns the sentence of each marker, without markers and Markdown", () => {
    expect(answerClaims(answer, 6)).toEqual([
      "APAC revenue grew 12% quarter over quarter in Q2, to $4.1M.",
    ])
    expect(answerClaims(answer, 12)).toEqual([
      "Japan drove most of the increase, with 61% of the APAC gain.",
      "Two enterprise contracts that started in April explain the Japan growth.",
    ])
  })

  it("uses a list item and a table row as the claim", () => {
    expect(answerClaims("- Gross margin held at 71% [2]", 2)).toEqual(["Gross margin held at 71%"])
    expect(answerClaims("| Japan | 61% [3] |", 3)).toEqual(["Japan 61%"])
  })

  it("uses the sentence before a marker that stands after the full stop", () => {
    expect(answerClaims("Growth was 12%. [3]", 3)).toEqual(["Growth was 12%."])
  })

  it("changes a link to its text", () => {
    expect(answerClaims("See [the report](https://x.io) for 12% [1].", 1)).toEqual([
      "See the report for 12%.",
    ])
  })

  it("returns no claims for a number that the answer does not cite", () => {
    expect(answerClaims(answer, 4)).toEqual([])
  })
})

const regional = [
  "## 2. Regional performance",
  "",
  "All values are in USD and unaudited. Regional results were mixed across the quarter.",
  "",
  "| Region | Q1 revenue | Q2 revenue | Change |",
  "| --- | --- | --- | --- |",
  "| APAC | $3.66M | $4.10M | +12.0% |",
  "| EMEA | $5.20M | $5.20M | 0.0% |",
  "",
  "APAC revenue increased **12%** quarter over quarter to $4.1M. APAC margin improved by two points.",
].join("\n")

const apacSheet = [
  "## APAC revenue by country (Q2)",
  "",
  "| Country | Q1 | Q2 | Change | Share of increase |",
  "| --- | --- | --- | --- | --- |",
  "| Japan | 2.05M | 2.32M | +13.2% | 61% |",
  "| Korea | 0.71M | 0.80M | +12.7% | 20% |",
  "",
  "*Note:* Japan contributed 61% of the APAC increase, mainly from two enterprise contracts that started in April. Values come from the finance export of 3 July.",
].join("\n")

const answer =
  "APAC revenue grew **12%** quarter over quarter in Q2, to $4.1M [6]. " +
  "Japan drove most of the increase [1], with 61% of the APAC gain [12]. " +
  "Two enterprise contracts that started in April explain the Japan growth [12]."

const passage = (a, n, chunk) => {
  const r = findPassage({ answer: a, n, chunkText: chunk })
  return r && chunk.slice(r.start, r.end)
}

describe("findPassage", () => {
  it("prefers the sentence over a table row with fewer shared tokens", () => {
    expect(passage(answer, 6, regional)).toBe(
      "APAC revenue increased **12%** quarter over quarter to $4.1M.",
    )
  })

  it("keeps the best valid match across repeated markers", () => {
    expect(passage(answer, 12, apacSheet)).toBe(
      "*Note:* Japan contributed 61% of the APAC increase, mainly from two enterprise contracts that started in April.",
    )
  })

  it("picks the shorter unit on a tie", () => {
    const chunk = "Japan grew 12%. Japan grew 12% in the busy second quarter of the year."
    expect(passage("Japan grew 12% [1].", 1, chunk)).toBe("Japan grew 12%.")
  })

  it("rejects a score below 0.3", () => {
    expect(
      findPassage({
        answer: "alpha beta gamma delta epsilon zeta eta theta [1].",
        n: 1,
        chunkText: "Alpha beta.",
      }),
    ).toBeNull()
  })

  it("rejects a match with one shared word and no shared number", () => {
    expect(
      findPassage({ answer: "Revenue grew [1].", n: 1, chunkText: "Revenue fell." }),
    ).toBeNull()
  })

  it("returns null when the answer does not cite n, or the chunk is empty", () => {
    expect(findPassage({ answer, n: 4, chunkText: regional })).toBeNull()
    expect(findPassage({ answer, n: 6, chunkText: "" })).toBeNull()
  })

  it("always returns end > start", () => {
    const r = findPassage({ answer, n: 6, chunkText: regional })
    expect(r.end).toBeGreaterThan(r.start)
  })

  // Review Focus: a non-BMP character before the passage.
  it("returns UTF-16 offsets that slice the unit after an emoji", () => {
    const chunk = "Intro 😀 text here. Japan grew 12% in April."
    const r = findPassage({ answer: "Japan grew 12% [1].", n: 1, chunkText: chunk })
    expect(r.start).toBe(chunk.indexOf("Japan"))
    expect(chunk.slice(r.start, r.end)).toBe("Japan grew 12% in April.")
  })
})
