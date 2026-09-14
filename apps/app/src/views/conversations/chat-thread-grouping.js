/**
 * Parses a `content_json` value that the API returns as a JSONB object or as a
 * JSON string.
 *
 * @param {Object|string|null} value - The raw `content_json` value.
 * @returns {Object|null} The parsed object, or `null` when the value is empty or invalid.
 */
const parseJson = (value) => {
  if (value == null) return null
  if (typeof value === "object") return value
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

/**
 * Groups a hydrated message thread for display.
 *
 * Pairs each `execute_code` thought row with the observation row that follows
 * it, then attaches those pairs — and their chart specs — to the next
 * `final_answer` message. Thought and observation rows are dropped from the
 * result, so the returned list holds only the messages the thread renders.
 * Search thoughts never become execution steps.
 *
 * @param {Array<Object>} messages - Hydrated rows ordered by `created_at` ascending.
 * @returns {Array<Object>} Display messages, each with `steps` and `charts` arrays.
 */
export const groupThreadMessages = (messages) => {
  const grouped = []
  let pendingSteps = []
  let pendingThought = null
  for (const message of messages) {
    const payload = parseJson(message.content_json)
    if (message.step_type === "thought") {
      pendingThought = payload?.tool === "execute_code" ? payload : null
    } else if (message.step_type === "observation") {
      if (pendingThought) {
        const { charts = [], ...observation } = payload ?? {}
        pendingSteps.push({ thought: pendingThought, observation, charts })
        pendingThought = null
      }
    } else {
      const steps = message.step_type === "final_answer" ? pendingSteps : []
      grouped.push({
        ...message,
        steps,
        charts: steps.flatMap((step) => step.charts),
      })
      if (message.step_type === "final_answer") pendingSteps = []
    }
  }
  return grouped
}
