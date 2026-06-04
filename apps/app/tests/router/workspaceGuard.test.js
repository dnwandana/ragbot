import { describe, it, expect } from "vitest"
import { shouldFetchWorkspace } from "@/router/workspaceGuard"

describe("shouldFetchWorkspace", () => {
  it("returns true when entering a workspace with none loaded", () => {
    expect(shouldFetchWorkspace(null, "ws-1")).toBe(true)
  })

  it("returns true when switching to a different workspace", () => {
    expect(shouldFetchWorkspace("ws-1", "ws-2")).toBe(true)
  })

  it("returns false when navigating within the same workspace", () => {
    expect(shouldFetchWorkspace("ws-1", "ws-1")).toBe(false)
  })

  it("returns false on a non-workspace route (no target id)", () => {
    expect(shouldFetchWorkspace("ws-1", undefined)).toBe(false)
  })

  it("returns false when neither id is present", () => {
    expect(shouldFetchWorkspace(null, null)).toBe(false)
  })

  it("returns false for an empty-string target id", () => {
    expect(shouldFetchWorkspace("ws-1", "")).toBe(false)
  })

  it("returns true when current id is undefined and a target is present", () => {
    expect(shouldFetchWorkspace(undefined, "ws-1")).toBe(true)
  })
})
