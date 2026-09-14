import { describe, expect, it } from "vitest"
import { renderProfileMarkdown } from "../../src/services/tabular/profile-markdown.js"

const profile = {
  format: "csv",
  truncated: false,
  sheets: [
    {
      name: "Sheet1",
      rows: 2,
      columns: [
        {
          name: "city",
          dtype: "object",
          non_null: 2,
          unique: 2,
          sample_values: ["Oslo", "Bergen"],
          min: null,
          max: null,
        },
        {
          name: "pop",
          dtype: "int64",
          non_null: 2,
          unique: 2,
          sample_values: ["700000", "290000"],
          min: "290000",
          max: "700000",
        },
      ],
    },
  ],
}

describe("renderProfileMarkdown", () => {
  it("names the file and format", () => {
    const md = renderProfileMarkdown(profile, "cities.csv")
    expect(md).toContain("cities.csv")
    expect(md).toContain("csv")
  })

  it("renders one heading per sheet with the row count", () => {
    const md = renderProfileMarkdown(profile, "cities.csv")
    expect(md).toContain("## Sheet: Sheet1")
    expect(md).toContain("2 rows")
  })

  it("renders one table row per column with range and samples", () => {
    const md = renderProfileMarkdown(profile, "cities.csv")
    expect(md).toContain("| city | object |")
    expect(md).toContain("290000 – 700000")
    expect(md).toContain("Oslo, Bergen")
  })

  it("notes truncation", () => {
    const md = renderProfileMarkdown({ ...profile, truncated: true }, "x.csv")
    expect(md).toContain("truncated")
  })

  it("escapes pipe characters in values", () => {
    const withPipe = structuredClone(profile)
    withPipe.sheets[0].columns[0].sample_values = ["a|b"]
    expect(renderProfileMarkdown(withPipe, "x.csv")).toContain("a\\|b")
  })
})
