const BASE = "https://api.cloud.llamaindex.ai/api/v2/parse"

const headers = () => ({ Authorization: `Bearer ${process.env.LLAMAINDEX_API_KEY}` })

/**
 * Submit a file to LlamaIndex Cloud for async parsing (v2) and return the job ID.
 *
 * Sends a multipart request with the file and a JSON configuration object specifying
 * the parsing tier and version. Processing is asynchronous; use pollForMarkdown to
 * wait for completion and retrieve the parsed content.
 *
 * @param {Buffer} buffer - File content as a Buffer
 * @param {string} filename - Original filename (used for format detection)
 * @param {string} mimeType - MIME type of the file
 * @returns {Promise<string>} LlamaIndex job ID to store in metadata for later retrieval
 * @throws {Error} If the upload request returns a non-2xx status; message includes the response body
 */
export const submitParseJob = async (buffer, filename, mimeType) => {
  const form = new FormData()
  const blob = new Blob([buffer], { type: mimeType })
  form.append("file", blob, filename)
  form.append(
    "configuration",
    JSON.stringify({
      tier: process.env.LLAMAINDEX_PARSE_TIER ?? "cost_effective",
      version: "latest",
    }),
  )

  const res = await fetch(`${BASE}/upload`, {
    method: "POST",
    headers: headers(),
    body: form,
  })
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`LlamaIndex upload error: ${res.status}: ${body}`)
  }
  const json = await res.json()
  return json.id
}

/**
 * Poll a LlamaIndex v2 parse job until it reaches COMPLETED status and return the markdown.
 *
 * Calls GET /api/v2/parse/{jobId}?expand=markdown on a fixed interval until the job
 * status is COMPLETED, ERROR, or FAILED, or the timeout is exceeded. Concatenates
 * all page markdown with blank-line separators.
 *
 * @param {string} jobId - LlamaIndex job ID returned by submitParseJob
 * @param {Object} [options]
 * @param {number} [options.intervalMs=5000] - Milliseconds to wait between polls
 * @param {number} [options.timeoutMs=600000] - Maximum milliseconds to wait before throwing
 * @returns {Promise<string>} Concatenated markdown across all pages, or "" if no pages
 * @throws {Error} If the job reaches ERROR/FAILED status, a request returns non-2xx, or timeoutMs is exceeded
 */
export const pollForMarkdown = async (jobId, { intervalMs = 5000, timeoutMs = 600000 } = {}) => {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const res = await fetch(`${BASE}/${jobId}?expand=markdown`, { headers: headers() })
    if (!res.ok) throw new Error(`LlamaIndex result error: ${res.status}`)
    const json = await res.json()
    const status = json.job?.status
    if (status === "COMPLETED") {
      const pages = json.markdown?.pages ?? []
      return pages.map((p) => p.markdown ?? "").join("\n\n")
    }
    if (status === "ERROR" || status === "FAILED") {
      throw new Error(`LlamaIndex job ${jobId} failed (status: ${status})`)
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
  throw new Error(`LlamaIndex job ${jobId} timed out after ${timeoutMs / 1000}s`)
}
