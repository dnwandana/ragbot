import { ALLOWED_MODELS, DEFAULT_MODEL } from "../../src/utils/allowed-models.js"

describe("ALLOWED_MODELS", () => {
  it("pins the exact contract list", () => {
    expect(ALLOWED_MODELS).toEqual(["openai/gpt-5.4", "openai/gpt-5.4-mini", "openai/gpt-5.4-nano"])
  })
})

describe("DEFAULT_MODEL", () => {
  it("is an allowlisted model", () => {
    expect(ALLOWED_MODELS).toContain(DEFAULT_MODEL)
  })
})
