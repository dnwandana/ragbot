import { describe, it, expect } from "vitest"
import {
  MODEL_CATALOG,
  MODEL_RECOMMENDATIONS,
  DEFAULT_MODEL_CONFIG,
  findModel,
  selectableModels,
} from "@/constants/models"

describe("MODEL_CATALOG", () => {
  it("contains exactly the five offered models in display order", () => {
    expect(MODEL_CATALOG.map((m) => m.value)).toEqual([
      "openai/gpt-5.4",
      "openai/gpt-5.4-mini",
      "openai/gpt-5.4-nano",
      "openai/gpt-4.1",
      "openai/gpt-4o",
    ])
  })

  it("marks exactly one model as Recommended", () => {
    expect(MODEL_CATALOG.filter((m) => m.badge === "Recommended")).toHaveLength(1)
  })
})

describe("findModel", () => {
  it("returns the catalog entry for a known value", () => {
    expect(findModel("openai/gpt-4o").label).toBe("GPT-4o")
  })

  it("returns undefined for an unknown value", () => {
    expect(findModel("anthropic/claude-sonnet-4-6")).toBeUndefined()
  })
})

describe("selectableModels", () => {
  it("returns the catalog as-is for a known saved model", () => {
    expect(selectableModels("openai/gpt-4.1")).toEqual(MODEL_CATALOG)
  })

  it("returns the catalog as-is when no saved model is given", () => {
    expect(selectableModels()).toEqual(MODEL_CATALOG)
  })

  it("appends a 'No longer offered' entry for an unknown saved model", () => {
    const options = selectableModels("anthropic/claude-sonnet-4-6")
    expect(options).toHaveLength(MODEL_CATALOG.length + 1)
    expect(options.at(-1)).toMatchObject({
      value: "anthropic/claude-sonnet-4-6",
      label: "anthropic/claude-sonnet-4-6",
      badge: "No longer offered",
    })
  })
})

describe("MODEL_RECOMMENDATIONS", () => {
  it("covers the three guide answers in display order", () => {
    expect(MODEL_RECOMMENDATIONS.map((r) => r.key)).toEqual(["everyday", "difficult", "volume"])
  })

  it("only recommends models that exist in the catalog", () => {
    for (const rec of MODEL_RECOMMENDATIONS) {
      expect(findModel(rec.model)).toBeDefined()
    }
  })

  it("never recommends the Classic models", () => {
    for (const rec of MODEL_RECOMMENDATIONS) {
      expect(findModel(rec.model).badge).not.toBe("Classic")
    }
  })
})

describe("DEFAULT_MODEL_CONFIG", () => {
  it("uses a model that exists in the catalog", () => {
    expect(findModel(DEFAULT_MODEL_CONFIG.model)).toBeDefined()
  })
})
