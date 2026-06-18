// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest"
import { ONBOARDING_KEY, clearOnboardingData } from "./storage.js"

describe("clearOnboardingData", () => {
  beforeEach(() => localStorage.clear())

  it("exposes the stable onboarding storage key", () => {
    expect(ONBOARDING_KEY).toBe("ragbot-onboarding-v1")
  })

  it("removes the onboarding wizard state from localStorage", () => {
    localStorage.setItem(ONBOARDING_KEY, JSON.stringify({ createdWorkspaceId: "ws1" }))
    clearOnboardingData()
    expect(localStorage.getItem(ONBOARDING_KEY)).toBeNull()
  })

  it("is a no-op when nothing is stored", () => {
    expect(() => clearOnboardingData()).not.toThrow()
    expect(localStorage.getItem(ONBOARDING_KEY)).toBeNull()
  })
})
