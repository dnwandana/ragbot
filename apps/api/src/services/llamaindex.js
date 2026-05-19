const BASE = "https://api.cloud.llamaindex.ai/api/v2/parse"

const headers = () => ({ Authorization: `Bearer ${process.env.LLAMAINDEX_API_KEY}` })

/**
 * Submit a file to LlamaIndex Cloud for async parsing (v2) and return the job ID.
 *
 * Sends a multipart request with the file and a JSON config object specifying the
 * parsing tier and version. Processing is asynchronous; results are delivered via
 * webhook callback or polled via getMarkdown.
 *
 * @param {Buffer} buffer - File content as a Buffer
 * @param {string} filename - Original filename (used for format detection)
 * @param {string} mimeType - MIME type of the file
 * @returns {Promise<string>} LlamaIndex job ID to store in metadata for later retrieval
 * @throws {Error} If the upload request returns a non-2xx status
 */
export const submitParseJob = async (buffer, filename, mimeType) => {
  const form = new FormData()
  const blob = new Blob([buffer], { type: mimeType })
  form.append("file", blob, filename)
  form.append(
    "config",
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
  if (!res.ok) throw new Error(`LlamaIndex upload error: ${res.status}`)
  const json = await res.json()
  return json.id
}

/**
 * Fetch the parsed markdown result for a completed LlamaIndex v2 job.
 *
 * Uses the v2 GET endpoint with the expand query parameter to retrieve the
 * markdown field from the job result object.
 *
 * @param {string} jobId - LlamaIndex job ID returned by submitParseJob
 * @returns {Promise<string>} Parsed markdown content
 * @throws {Error} If the result request returns a non-2xx status
 */
export const getMarkdown = async (jobId) => {
  const res = await fetch(`${BASE}/${jobId}?expand=markdown`, {
    headers: headers(),
  })
  if (!res.ok) throw new Error(`LlamaIndex result error: ${res.status}`)
  const json = await res.json()
  return json.markdown
}
