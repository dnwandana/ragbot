/**
 * HTTP client for the sandbox executor container.
 *
 * Failures never throw. Every failure maps to an executeCode result so the
 * chat loop can hand the model a structured observation.
 */

/** Extra time added to the fetch abort timeout so the sandbox's own timeout fires first. */
const ABORT_GRACE_MS = 5000

/** Default execution timeout that mirrors the SANDBOX_TIMEOUT_MS env default. */
const DEFAULT_TIMEOUT_MS = 30000

/**
 * Builds a failed execution result.
 *
 * @param {string} error - The error code: "busy" or "unavailable".
 * @param {string} stderr - The message to show the model as an observation.
 * @returns {{ok: boolean, stdout: string, stderr: string, charts: Array, error: string}} The result.
 */
const failure = (error, stderr) => ({
  ok: false,
  stdout: "",
  stderr,
  charts: [],
  error,
})

/**
 * Adds the elapsed wall time to a result.
 *
 * The sandbox reports no timing of its own, so the client measures it. The UI
 * shows this value, and a reloaded conversation reads it back from the
 * persisted observation.
 *
 * @param {Object} result - The execution result.
 * @param {number} startedAt - The `performance.now()` value taken before the request.
 * @returns {Object} The same result with a `duration_ms` field.
 */
const withDuration = (result, startedAt) => ({
  ...result,
  duration_ms: Math.round(performance.now() - startedAt),
})

/**
 * Returns true when the sandbox integration is enabled.
 *
 * @returns {boolean} The SANDBOX_ENABLED flag.
 */
export const isSandboxEnabled = () => process.env.SANDBOX_ENABLED === "true"

/**
 * Executes Python code in the sandbox with the given input files.
 *
 * Never throws for a sandbox-side or network failure. A 429 maps to
 * error "busy"; a refused connection, a timeout, or any non-2xx status maps
 * to error "unavailable".
 *
 * @param {object} params - The execution request.
 * @param {string} params.code - The Python source to run.
 * @param {Array<{name: string, content: Buffer}>} [params.files] - Input files.
 * @param {number} [params.timeoutMs] - Override for SANDBOX_TIMEOUT_MS.
 * @returns {Promise<{ok: boolean, stdout: string, stderr: string, charts: Array, error: (string|null), duration_ms: number}>} The sandbox result.
 */
export const executeCode = async ({ code, files = [], timeoutMs }) => {
  const timeout = timeoutMs ?? Number(process.env.SANDBOX_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS)
  const startedAt = performance.now()

  let response
  try {
    response = await fetch(`${process.env.SANDBOX_URL}/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SANDBOX_API_TOKEN}`,
      },
      body: JSON.stringify({
        code,
        files: files.map((file) => ({
          name: file.name,
          content_b64: file.content.toString("base64"),
        })),
        timeout_ms: timeout,
      }),
      signal: AbortSignal.timeout(timeout + ABORT_GRACE_MS),
    })
  } catch {
    return withDuration(failure("unavailable", "sandbox is unavailable"), startedAt)
  }

  if (response.status === 429) {
    return withDuration(failure("busy", "sandbox is busy, try again"), startedAt)
  }

  if (!response.ok) {
    return withDuration(failure("unavailable", `sandbox returned ${response.status}`), startedAt)
  }

  try {
    return withDuration(await response.json(), startedAt)
  } catch {
    return withDuration(
      failure("unavailable", "sandbox returned an unreadable response"),
      startedAt,
    )
  }
}
