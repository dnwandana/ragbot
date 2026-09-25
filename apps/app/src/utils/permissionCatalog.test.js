import { describe, it, expect } from "vitest"
import { PERMISSION_META } from "./permissionCatalog.js"

describe("permissionCatalog", () => {
  it("labels conversation:share", () => {
    expect(PERMISSION_META["conversation:share"]).toEqual({ label: "Share conversations" })
  })

  it("holds the 32 seeded permissions", () => {
    expect(Object.keys(PERMISSION_META)).toHaveLength(32)
  })
})
