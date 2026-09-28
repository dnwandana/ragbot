import { describe, it, expect } from "vitest"
import { parseStatuses } from "../../src/services/dataset-items.js"

describe("parseStatuses", () => {
  it("returns an empty list when no status is given", () => {
    expect(parseStatuses(undefined)).toEqual([])
    expect(parseStatuses("")).toEqual([])
  })

  it("accepts a comma list and removes duplicates", () => {
    expect(parseStatuses("failed,processing,failed")).toEqual(["failed", "processing"])
  })

  it("rejects a value that is not in the fixed list", () => {
    expect(() => parseStatuses("bogus")).toThrow(expect.objectContaining({ status: 400 }))
    expect(() => parseStatuses("failed,'x'")).toThrow(expect.objectContaining({ status: 400 }))
  })
})
