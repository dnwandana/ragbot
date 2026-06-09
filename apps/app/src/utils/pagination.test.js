import { describe, it, expect } from "vitest"
import { totalItems } from "@/utils/pagination"

describe("totalItems", () => {
  it("returns total_items when present", () => {
    expect(totalItems({ total_items: 42 }, 5)).toBe(42)
  })

  it("ignores a stray `total` field and uses the fallback (the drift that caused the bug)", () => {
    expect(totalItems({ total: 42 }, 5)).toBe(5)
  })

  it("falls back when pagination is null or undefined", () => {
    expect(totalItems(null, 7)).toBe(7)
    expect(totalItems(undefined, 7)).toBe(7)
  })

  it("falls back when total_items is missing", () => {
    expect(totalItems({}, 3)).toBe(3)
  })

  it("defaults the fallback to 0", () => {
    expect(totalItems(null)).toBe(0)
    expect(totalItems({})).toBe(0)
  })

  it("returns 0 when total_items is 0 (does not treat 0 as absent)", () => {
    expect(totalItems({ total_items: 0 }, 9)).toBe(0)
  })
})
