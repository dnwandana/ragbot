/** @type {{ key: string, label: string, name: string, desc: string, prompt: string }[]} */
export const AGENT_TEMPLATES = [
  {
    key: "blank",
    label: "Blank",
    name: "",
    desc: "Start from scratch",
    prompt: "",
  },
  {
    key: "support",
    label: "Support",
    name: "Support Sidekick",
    desc: "Answer customer questions from your docs",
    prompt:
      "You are a friendly support assistant. Answer from the indexed sources only, citing the document for every claim. Keep answers short and actionable. If the answer isn't in the sources, say so plainly and suggest who to contact — never guess or invent details.",
  },
  {
    key: "research",
    label: "Research",
    name: "Research Scout",
    desc: "Synthesise findings across documents",
    prompt:
      "You are a careful research analyst. Read across all indexed sources, compare what they say, and summarise where they agree and disagree — always citing the passages you draw on. Highlight gaps where the corpus is silent instead of guessing, and keep your synthesis structured and easy to scan.",
  },
  {
    key: "policy",
    label: "Policy Q&A",
    name: "Policy Pro",
    desc: "Precise answers from policy docs",
    prompt:
      "You answer questions about company policy with precision. Quote the exact clause and cite its section for every answer. Be explicit about effective dates, exceptions, and who a policy applies to. If the written policy doesn't cover a question, say so clearly — never infer rules that aren't in the sources.",
  },
  {
    key: "onboarding",
    label: "Onboarding buddy",
    name: "Onboarding Buddy",
    desc: "Help new teammates find their way",
    prompt:
      "You are a warm onboarding buddy for new teammates. Answer questions about how the team works using only the indexed sources, citing where each answer comes from. Be encouraging and jargon-free, and point to related topics they might want next. If something isn't documented, say so and suggest who to ask.",
  },
  {
    key: "docs",
    label: "Docs expert",
    name: "Docs Expert",
    desc: "Explain product and technical docs",
    prompt:
      "You are a technical documentation expert. Answer using only the indexed docs, citing the exact document for every claim. Prefer step-by-step instructions and minimal working examples. Match the reader's technical level, and when the docs don't cover something, say so plainly rather than improvising.",
  },
]

/** Default agent name used to seed formData on shell mount (support template). */
export const DEFAULT_AGENT_NAME = AGENT_TEMPLATES.find((t) => t.key === "support")?.name ?? ""

/** Default prompt used to seed formData on shell mount (support template). */
export const DEFAULT_AGENT_PROMPT = AGENT_TEMPLATES.find((t) => t.key === "support")?.prompt ?? ""

/**
 * Look up the catalog description for a picked template.
 * Returns an empty string for the blank template or an unknown key,
 * so callers can pass it straight to the API (the server stores "" as null).
 * The blank template's catalog desc is tile copy, never an agent description.
 * @param {string} templateKey - The picked template's key
 * @returns {string} The template's desc, or "" when there is none to send
 */
export function descriptionForTemplate(templateKey) {
  if (templateKey === "blank") return ""
  return AGENT_TEMPLATES.find((t) => t.key === templateKey)?.desc ?? ""
}

/**
 * Resolve the agent name after picking a template, preserving user-typed names.
 * Fills the template's default name only when the field is empty or still holds
 * another template's default; the blank template never changes the name.
 * @param {string} currentName - Current value of the agent name field
 * @param {{ key: string, name: string }} tpl - The picked template
 * @returns {string} The value the agent name field should hold
 */
export function nameForTemplate(currentName, tpl) {
  if (tpl.key === "blank") return currentName
  const trimmed = currentName.trim()
  const isDefault = !trimmed || AGENT_TEMPLATES.some((t) => t.name && t.name === trimmed)
  return isDefault ? tpl.name : currentName
}
