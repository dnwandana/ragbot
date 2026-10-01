import crypto from "node:crypto"
import logger from "../utils/logger.js"
import { findPassage, parseCitationMarkers } from "./passage-matcher.js"

/**
 * Converts a search similarity to a relevance score for storage.
 * The column is NOT NULL, so a missing or invalid value becomes 0.
 *
 * @param {unknown} similarity - The similarity from a search row (a number or a numeric string).
 * @returns {number} A value from 0 to 1.
 */
export const toRelevanceScore = (similarity) => {
  // Number(null) is 0 and Number(undefined) is NaN, so both become 0.
  const value = Number(similarity)
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

/**
 * Returns the passage offsets for one citation. A matcher error changes only
 * this citation: the API logs a warning and stores null offsets.
 *
 * @param {Object} params
 * @param {string} params.answer - The final answer text.
 * @param {number} params.n - The citation number.
 * @param {string} params.citedText - The full chunk text.
 * @param {string} params.messageId - The final answer message UUID, for the log.
 * @returns {{ start: number, end: number } | null} The passage offsets, or null.
 */
const safeFindPassage = ({ answer, n, citedText, messageId }) => {
  try {
    return findPassage({ answer, n, chunkText: citedText })
  } catch (e) {
    logger.warn("Passage match failed. The citation is stored without offsets.", {
      message_id: messageId,
      citation_number: n,
      error: e.message,
    })
    return null
  }
}

/**
 * Builds the `conversation_message_citations` rows for the numbers that the
 * answer cites. A number that the registry does not know gets no row.
 * `citation_number` is the number from the answer. It is never renumbered.
 *
 * @param {Object} params
 * @param {string} params.answer - The final answer text.
 * @param {{ get: (n: number) => Object | undefined }} params.registry - The citation registry of the turn.
 * @param {string} params.messageId - The final answer message UUID.
 * @param {string} params.workspaceId - The workspace UUID.
 * @returns {Object[]} The rows, sorted by `citation_number`.
 */
export const buildCitationRows = ({ answer, registry, messageId, workspaceId }) => {
  const numbers = [...new Set(parseCitationMarkers(answer).map((m) => m.n))].toSorted(
    (a, b) => a - b,
  )
  const rows = []
  let hasNullChunk = false

  for (const n of numbers) {
    const chunk = registry.get(n)
    if (!chunk) continue

    const chunkId = chunk.chunk_id ?? null
    // The partial unique index allows one null chunk_id for each message, so keep only the first.
    if (chunkId === null) {
      if (hasNullChunk) continue
      hasNullChunk = true
    }

    const citedText = chunk.content ?? ""
    const passage = safeFindPassage({ answer, n, citedText, messageId })

    rows.push({
      id: crypto.randomUUID(),
      message_id: messageId,
      workspace_id: workspaceId,
      chunk_id: chunkId,
      citation_number: n,
      relevance_score: toRelevanceScore(chunk.similarity),
      cited_text: citedText,
      snippet_start_char: passage?.start ?? null,
      snippet_end_char: passage?.end ?? null,
      created_at: new Date(),
    })
  }

  return rows
}
