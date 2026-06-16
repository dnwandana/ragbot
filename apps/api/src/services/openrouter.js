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
    signal: AbortSignal.timeout(Number(process.env.OPENROUTER_TIMEOUT_MS)),
  })
  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`OpenRouter embeddings error ${res.status}: ${errorText}`)
  }
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
      signal: AbortSignal.timeout(Number(process.env.OPENROUTER_TIMEOUT_MS)),
    })
    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`OpenRouter embeddings error ${res.status}: ${errorText}`)
    }
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
 * @param {number} [options.max_tokens] - Optional cap on response tokens; omitted means uncapped (model/context-window limited)
 * @param {Object[]} [options.tools] - Tool definitions for function calling
 * @param {string|Object} [options.tool_choice] - Tool choice strategy
 * @returns {Promise<Object>} OpenAI-compatible chat completion response object
 * @throws {Error} If the OpenRouter API returns a non-2xx status
 */
export const chatCompletion = async (messages, options = {}) => {
  const {
    model = process.env.DEFAULT_CHAT_MODEL,
    temperature = 0.7,
    max_tokens,
    tools,
    tool_choice,
  } = options
  const body = { model, messages, temperature, stream: false }
  if (max_tokens != null) body.max_tokens = max_tokens
  if (tools) body.tools = tools
  if (tool_choice) body.tool_choice = tool_choice

  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(Number(process.env.OPENROUTER_TIMEOUT_MS)),
  })
  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`OpenRouter chat error ${res.status}: ${errorText}`)
  }
  return res.json()
}

/**
 * Send a streaming chat completion request via OpenRouter and return the raw
 * SSE response body for incremental consumption.
 *
 * @param {Array<{ role: string, content: string }>} messages - Chat messages.
 * @param {Object} [options]
 * @param {string} [options.model] - Chat model ID; defaults to DEFAULT_CHAT_MODEL env var.
 * @param {number} [options.temperature=0.7] - Sampling temperature.
 * @param {number} [options.max_tokens] - Optional cap on response tokens; omitted means uncapped (model/context-window limited).
 * @param {Object[]} [options.tools] - Tool definitions for function calling.
 * @param {string|Object} [options.tool_choice] - Tool choice strategy.
 * @param {AbortSignal} [options.signal] - Optional caller signal; aborting it cancels the upstream fetch (combined with the stream timeout).
 * @returns {Promise<ReadableStream>} The response body stream of OpenRouter SSE chunks.
 * @throws {Error} If the OpenRouter API returns a non-2xx status.
 * @throws {DOMException} `TimeoutError` if no response/data arrives within OPENROUTER_STREAM_TIMEOUT_MS.
 */
export const chatCompletionStream = async (messages, options = {}) => {
  const {
    model = process.env.DEFAULT_CHAT_MODEL,
    temperature = 0.7,
    max_tokens,
    tools,
    tool_choice,
    signal: externalSignal,
  } = options
  const body = { model, messages, temperature, stream: true }
  if (max_tokens != null) body.max_tokens = max_tokens
  if (tools) body.tools = tools
  if (tool_choice) body.tool_choice = tool_choice

  const timeoutSignal = AbortSignal.timeout(Number(process.env.OPENROUTER_STREAM_TIMEOUT_MS))
  const signal = externalSignal ? AbortSignal.any([timeoutSignal, externalSignal]) : timeoutSignal

  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
    signal,
  })
  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`OpenRouter stream error ${res.status}: ${errorText}`)
  }
  return res.body
}
