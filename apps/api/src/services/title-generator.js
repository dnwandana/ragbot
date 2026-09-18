import { chatCompletion } from "./openrouter.js"
import logger from "../utils/logger.js"

/** Characters of each side of the exchange that the prompt keeps. */
const MAX_INPUT_CHARS = 2000
/** Longest title that the conversation row stores from this service. */
const MAX_TITLE_CHARS = 100

const SYSTEM_PROMPT =
  "You write short titles for chat conversations. " +
  "Reply with one title of at most eight words in the language of the user. " +
  "Do not use quotes, markdown, or a trailing period. Reply with the title only."

/**
 * Cleans a raw model reply into a single-line title.
 *
 * @param {string} raw - Model output.
 * @returns {string} The cleaned title, possibly empty.
 */
const cleanTitle = (raw) => {
  let title = raw.replace(/\s+/g, " ").trim()
  title = title.replace(/^["'“”‘’`]+|["'“”‘’`]+$/g, "").trim()
  title = title.replace(/\.+$/, "").trim()
  return title.slice(0, MAX_TITLE_CHARS)
}

/**
 * Generates a conversation title from the first exchange via an OpenRouter chat completion.
 *
 * Returns null on any error or on an empty reply so the caller can fall back to
 * a placeholder title without failing the chat request.
 *
 * @param {string} userContent - First user message.
 * @param {string} assistantContent - Assistant reply to that message.
 * @param {string} [model] - Chat model ID; defaults to the UTILITY_MODEL env var, the cheap model for short tasks.
 * @returns {Promise<string|null>} A title of at most 100 characters, or null.
 */
export const generateTitle = async (
  userContent,
  assistantContent,
  model = process.env.UTILITY_MODEL,
) => {
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content:
        `User message:\n${String(userContent ?? "").slice(0, MAX_INPUT_CHARS)}\n\n` +
        `Assistant reply:\n${String(assistantContent ?? "").slice(0, MAX_INPUT_CHARS)}`,
    },
  ]

  try {
    const result = await chatCompletion(messages, { model, temperature: 0.2, max_tokens: 32 })
    const title = cleanTitle(result?.choices?.[0]?.message?.content ?? "")
    return title || null
  } catch (error) {
    logger.warn("Title generation failed", { error: error.message })
    return null
  }
}
