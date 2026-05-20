/**
 * Open an SSE chat stream for a conversation. Uses the native fetch API
 * directly because the project HTTP client (and Axios) does not expose the
 * ReadableStream body needed to consume Server-Sent Events.
 *
 * @param {string} workspaceId - Workspace UUID.
 * @param {string} conversationId - Conversation UUID.
 * @param {string} content - The user's message text.
 * @param {AbortSignal} [signal] - Optional signal to cancel the in-flight stream.
 * @returns {Promise<Response>} The raw fetch Response; read `response.body` for the SSE stream.
 */
export const sendMessage = (workspaceId, conversationId, content, signal) => {
  return fetch(`/api/workspaces/${workspaceId}/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    credentials: "include",
    body: JSON.stringify({ content }),
    signal,
  })
}
