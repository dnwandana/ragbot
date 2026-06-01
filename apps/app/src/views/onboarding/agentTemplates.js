/** @type {{ key: string, label: string, desc: string, prompt: string }[]} */
export const AGENT_TEMPLATES = [
  {
    key: "blank",
    label: "Blank",
    desc: "Start from scratch",
    prompt: "",
  },
  {
    key: "support",
    label: "Support assistant",
    desc: "Answer customer questions from your docs",
    prompt:
      "You are a support assistant. Answer questions using only the indexed sources. Cite the document and page for every claim. If the answer isn't in the sources, say so plainly and suggest who to contact.",
  },
  {
    key: "research",
    label: "Research analyst",
    desc: "Synthesise findings across documents",
    prompt:
      "You are a research analyst. Read across all sources, compare claims, and summarise what they agree and disagree on. Always cite passages. Flag gaps where the corpus is silent rather than guessing.",
  },
  {
    key: "policy",
    label: "Policy Q&A",
    desc: "Answer policy questions precisely",
    prompt:
      "You answer questions about company policy. Quote the exact clause and cite its section. Be precise about effective dates and exceptions. Never infer policy that isn't written in the sources.",
  },
]

/** Default prompt used to seed formData on shell mount (support template). */
export const DEFAULT_AGENT_PROMPT = AGENT_TEMPLATES.find((t) => t.key === "support")?.prompt ?? ""
