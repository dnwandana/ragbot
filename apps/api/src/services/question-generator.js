import { chatCompletion } from "./openrouter.js"
import logger from "../utils/logger.js"

/**
 * Generate a list of exploration questions for a document via OpenRouter chat completion.
 *
 * Truncates input to 8000 characters before sending to stay within model context limits.
 * Returns an empty array on any error so pipeline failures don't block file processing.
 *
 * @param {string} content - Document content to generate questions about
 * @param {string} [model] - Chat model ID; defaults to DEFAULT_CHAT_MODEL env var
 * @returns {Promise<string[]>} Array of 5–10 question strings, or [] on failure
 */
export const generateQuestions = async (content, model = process.env.DEFAULT_CHAT_MODEL) => {
  const truncated = content.slice(0, 8000)
  const messages = [
    {
      role: "system",
      content:
        "You generate exploration questions about documents. Return ONLY a JSON array of 5-10 question strings. No markdown, no explanation, just the JSON array.",
    },
    {
      role: "user",
      content: `Generate exploration questions for this document:\n\n${truncated}`,
    },
  ]

  try {
    const result = await chatCompletion(messages, { model, temperature: 0.7, max_tokens: 512 })
    const text = result.choices[0].message.content.trim()
    const parsed = JSON.parse(text)
    return Array.isArray(parsed) ? parsed.slice(0, 10) : []
  } catch (error) {
    logger.warn("Question generation failed", {
      contentLength: content.length,
      error: error.message,
    })
    return []
  }
}
