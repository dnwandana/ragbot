import { describe, it, expect } from "vitest"
import {
  AGENT_TEMPLATES,
  DEFAULT_AGENT_NAME,
  DEFAULT_AGENT_PROMPT,
  nameForTemplate,
  descriptionForTemplate,
} from "@/views/onboarding/agentTemplates.js"

describe("AGENT_TEMPLATES catalog", () => {
  it("has six templates with blank first", () => {
    expect(AGENT_TEMPLATES).toHaveLength(6)
    expect(AGENT_TEMPLATES[0].key).toBe("blank")
    expect(AGENT_TEMPLATES.map((t) => t.key)).toEqual([
      "blank",
      "support",
      "research",
      "policy",
      "onboarding",
      "docs",
    ])
  })

  it("gives every non-blank template a name, desc, and grounded prompt", () => {
    for (const tpl of AGENT_TEMPLATES.slice(1)) {
      expect(tpl.name).toBeTruthy()
      expect(tpl.desc).toBeTruthy()
      // Every prompt must teach grounding: cite/citing the sources.
      expect(tpl.prompt).toMatch(/cit/i)
    }
  })

  it("keeps the blank template empty", () => {
    expect(AGENT_TEMPLATES[0].name).toBe("")
    expect(AGENT_TEMPLATES[0].prompt).toBe("")
  })

  it("exports support-template defaults for form seeding", () => {
    const support = AGENT_TEMPLATES.find((t) => t.key === "support")
    expect(DEFAULT_AGENT_NAME).toBe("Support Sidekick")
    expect(DEFAULT_AGENT_NAME).toBe(support.name)
    expect(DEFAULT_AGENT_PROMPT).toBe(support.prompt)
  })
})

describe("nameForTemplate", () => {
  const research = AGENT_TEMPLATES.find((t) => t.key === "research")
  const blank = AGENT_TEMPLATES.find((t) => t.key === "blank")

  it("fills the template name when the field is empty", () => {
    expect(nameForTemplate("", research)).toBe("Research Scout")
    expect(nameForTemplate("   ", research)).toBe("Research Scout")
  })

  it("swaps the name when the field holds another template's default", () => {
    expect(nameForTemplate("Support Sidekick", research)).toBe("Research Scout")
  })

  it("preserves a user-typed name", () => {
    expect(nameForTemplate("Ada", research)).toBe("Ada")
  })

  it("never fills from the blank template", () => {
    expect(nameForTemplate("", blank)).toBe("")
    expect(nameForTemplate("Support Sidekick", blank)).toBe("Support Sidekick")
  })
})

describe("descriptionForTemplate", () => {
  it("returns the catalog desc for a known template", () => {
    expect(descriptionForTemplate("support")).toBe("Answer customer questions from your docs")
    expect(descriptionForTemplate("research")).toBe("Synthesise findings across documents")
  })

  it("returns an empty string for the blank template", () => {
    expect(descriptionForTemplate("blank")).toBe("")
  })

  it("returns an empty string for an unknown key", () => {
    expect(descriptionForTemplate("nope")).toBe("")
  })
})
