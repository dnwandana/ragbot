/** Model catalog for the agent form — the UI's single source of truth. */
export const MODEL_CATALOG = [
  {
    value: "openai/gpt-5.4",
    label: "GPT-5.4",
    description: "Smartest — gives the best answers to hard questions",
    badge: "Recommended",
  },
  {
    value: "openai/gpt-5.4-mini",
    label: "GPT-5.4 Mini",
    description: "Great answers at a lower cost",
    badge: "Balanced",
  },
  {
    value: "openai/gpt-5.4-nano",
    label: "GPT-5.4 Nano",
    description: "Fastest and cheapest — great for simple questions",
    badge: "Fastest",
  },
  {
    value: "openai/gpt-4.1",
    label: "GPT-4.1",
    description: "Earlier model — steady and dependable",
    badge: "Classic",
  },
  {
    value: "openai/gpt-4o",
    label: "GPT-4o",
    description: "Earlier model — quick and capable",
    badge: "Classic",
  },
]

/** "Help me choose" guide chips, each mapping a usage answer to a recommended model. */
export const MODEL_RECOMMENDATIONS = [
  {
    key: "everyday",
    label: "Everyday questions",
    model: "openai/gpt-5.4-mini",
    reason: "Great answers at a lower cost",
  },
  {
    key: "difficult",
    label: "Difficult questions",
    model: "openai/gpt-5.4",
    reason: "The smartest choice when answers really matter",
  },
  {
    key: "volume",
    label: "Lots of questions, low cost",
    model: "openai/gpt-5.4-nano",
    reason: "Fastest and cheapest",
  },
]

/**
 * Default model_config for newly created agents (agent form and onboarding).
 *
 * Manual sync points — update together with the catalog:
 * - apps/api/src/utils/allowed-models.js (ALLOWED_MODELS, DEFAULT_MODEL)
 * - apps/api/openapi.json (model_config.model enum)
 */
export const DEFAULT_MODEL_CONFIG = Object.freeze({
  model: "openai/gpt-5.4-mini",
  temperature: 0.7,
  top_p: 1,
})

/**
 * Looks up a catalog entry by model value.
 * @param {string} value - Model identifier (e.g. "openai/gpt-5.4").
 * @returns {Object|undefined} Catalog entry, or undefined when not offered.
 */
export function findModel(value) {
  return MODEL_CATALOG.find((m) => m.value === value)
}

/**
 * Builds the options for the model select, appending a "No longer offered"
 * entry when the agent's saved model is not in the catalog.
 * @param {string} [savedModel] - The agent's currently saved model value.
 * @returns {Object[]} Options to render in the model select.
 */
export function selectableModels(savedModel) {
  if (!savedModel || findModel(savedModel)) return MODEL_CATALOG
  return [
    ...MODEL_CATALOG,
    { value: savedModel, label: savedModel, description: "", badge: "No longer offered" },
  ]
}
