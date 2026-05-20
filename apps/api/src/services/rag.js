import db from "../config/database.js"

/**
 * Run a cosine-similarity vector search over the given datasets via the
 * `search_chunks()` Postgres function.
 *
 * @param {Object} params
 * @param {number[]} params.embedding - Query embedding vector.
 * @param {string[]} params.datasetIds - Dataset UUIDs to search within.
 * @param {number} [params.matchCount=10] - Maximum number of chunks to return.
 * @param {number} [params.threshold=0.0] - Minimum similarity score (0–1).
 * @returns {Promise<Object[]>} Matching chunk rows, or `[]` when no datasets are linked.
 */
export const searchChunks = async ({ embedding, datasetIds, matchCount = 10, threshold = 0.0 }) => {
  if (!datasetIds.length) return []
  const vectorLiteral = `[${embedding.join(",")}]`
  const arrayLiteral = `{${datasetIds.join(",")}}`
  const result = await db.raw("SELECT * FROM search_chunks(?::vector, ?::uuid[], ?, ?)", [
    vectorLiteral,
    arrayLiteral,
    matchCount,
    threshold,
  ])
  return result.rows
}

/**
 * Build the RAG system prompt by appending retrieved excerpts as a citable
 * context block. Returns the agent prompt unchanged when there are no chunks.
 *
 * @param {string} agentSystemPrompt - The agent's base system prompt.
 * @param {Object[]} chunks - Retrieved chunk rows (each with a `content` field).
 * @returns {string} The composed system message.
 */
export const buildSystemMessage = (agentSystemPrompt, chunks) => {
  if (!chunks.length) return agentSystemPrompt

  const contextBlock = chunks.map((c, i) => `[${i + 1}] ${c.content}`).join("\n\n")

  return `${agentSystemPrompt}

<context>
Use the following retrieved document excerpts to answer the user's question. Cite sources using [N] notation where N matches the excerpt number.

${contextBlock}
</context>`
}
