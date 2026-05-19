const BASE = "https://openrouter.ai/api/v1"

const headers = () => ({
  Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
  "Content-Type": "application/json",
})

/**
 * Generate a single text embedding vector via OpenRouter.
 *
 * @param {string} text - The input text to embed
 * @param {string} [model] - Embedding model ID; defaults to DEFAULT_EMBEDDINGS_MODEL env var
 * @returns {Promise<number[]>} Embedding vector
 * @throws {Error} If the OpenRouter API returns a non-2xx status
 */
export const embedText = async (text, model = process.env.DEFAULT_EMBEDDINGS_MODEL) => {
  const res = await fetch(`${BASE}/embeddings`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ model, input: text }),
  })
  if (!res.ok) throw new Error(`OpenRouter embeddings error: ${res.status}`)
  const json = await res.json()
  return json.data[0].embedding
}

/**
 * Generate embedding vectors for multiple texts via OpenRouter, batched in groups of 100.
 *
 * @param {string[]} texts - Array of input strings to embed
 * @param {string} [model] - Embedding model ID; defaults to DEFAULT_EMBEDDINGS_MODEL env var
 * @returns {Promise<number[][]>} Array of embedding vectors in the same order as input
 * @throws {Error} If any OpenRouter API batch call returns a non-2xx status
 */
export const embedBatch = async (texts, model = process.env.DEFAULT_EMBEDDINGS_MODEL) => {
  const BATCH = 100
  const results = []
  for (let i = 0; i < texts.length; i += BATCH) {
    const res = await fetch(`${BASE}/embeddings`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ model, input: texts.slice(i, i + BATCH) }),
    })
    if (!res.ok) throw new Error(`OpenRouter embeddings error: ${res.status}`)
    const json = await res.json()
    results.push(...json.data.map((d) => d.embedding))
  }
  return results
}

/**
 * Send a non-streaming chat completion request via OpenRouter.
 *
 * @param {Array<{ role: string, content: string }>} messages - Chat messages
 * @param {Object} [options]
 * @param {string} [options.model] - Chat model ID; defaults to DEFAULT_CHAT_MODEL env var
 * @param {number} [options.temperature=0.7] - Sampling temperature
 * @param {number} [options.max_tokens=4096] - Maximum tokens in the response
 * @param {Object[]} [options.tools] - Tool definitions for function calling
 * @param {string|Object} [options.tool_choice] - Tool choice strategy
 * @returns {Promise<Object>} OpenAI-compatible chat completion response object
 * @throws {Error} If the OpenRouter API returns a non-2xx status
 */
export const chatCompletion = async (messages, options = {}) => {
  const {
    model = process.env.DEFAULT_CHAT_MODEL,
    temperature = 0.7,
    max_tokens = 4096,
    tools,
    tool_choice,
  } = options
  const body = { model, messages, temperature, max_tokens, stream: false }
  if (tools) body.tools = tools
  if (tool_choice) body.tool_choice = tool_choice

  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`OpenRouter chat error: ${res.status}`)
  return res.json()
}
