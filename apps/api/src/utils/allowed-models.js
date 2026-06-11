/**
 * Model identifiers accepted for an agent's model_config.model.
 *
 * Manual sync points — update together with this list:
 * - apps/app/src/constants/models.js (MODEL_CATALOG, DEFAULT_MODEL_CONFIG)
 * - apps/api/openapi.json (model_config.model enum)
 * - apps/api/database/migrations/20260518050332_agents.js (column default)
 */
export const ALLOWED_MODELS = [
  "openai/gpt-5.4",
  "openai/gpt-5.4-mini",
  "openai/gpt-5.4-nano",
  "openai/gpt-4.1",
  "openai/gpt-4o",
]

/** Default chat model — single source for the DEFAULT_CHAT_MODEL env default and test fixtures. */
export const DEFAULT_MODEL = "openai/gpt-5.4-mini"
