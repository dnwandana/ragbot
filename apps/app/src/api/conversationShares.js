import { request, baseURL } from "@/utils/http"

const base = (workspaceId, conversationId) =>
  `/workspaces/${workspaceId}/conversations/${conversationId}`

/** Reads the `filename="…"` value of a Content-Disposition header. */
const filenameFrom = (headers) =>
  /filename="([^"]+)"/.exec(headers.get("content-disposition") || "")?.[1] || "conversation.md"

/**
 * Gets the share of a conversation. Silent: a 404 means "not shared" and is not an error to show.
 * @param {string} workspaceId
 * @param {string} conversationId
 * @returns {Promise<Object>}
 */
export function getShare(workspaceId, conversationId) {
  return request.get(`${base(workspaceId, conversationId)}/share`, { silent: true })
}

/**
 * Creates the share link. Silent: a 409 carries the existing share in `error.data.data`.
 * @param {string} workspaceId
 * @param {string} conversationId
 * @returns {Promise<Object>}
 */
export function createShare(workspaceId, conversationId) {
  return request.post(`${base(workspaceId, conversationId)}/share`, undefined, { silent: true })
}

/**
 * Rebuilds the snapshot behind the existing link.
 * @param {string} workspaceId
 * @param {string} conversationId
 * @returns {Promise<Object>}
 */
export function updateShare(workspaceId, conversationId) {
  return request.put(`${base(workspaceId, conversationId)}/share`, undefined)
}

/**
 * Revokes the share link.
 * @param {string} workspaceId
 * @param {string} conversationId
 * @returns {Promise<Object>}
 */
export function revokeShare(workspaceId, conversationId) {
  return request.del(`${base(workspaceId, conversationId)}/share`)
}

/**
 * Downloads the conversation as Markdown. Uses plain `fetch` because the shared
 * client always parses JSON.
 * @param {string} workspaceId
 * @param {string} conversationId
 * @returns {Promise<{ blob: Blob, filename: string }>}
 * @throws {Error} When the response is not 2xx.
 */
export async function exportMarkdown(workspaceId, conversationId) {
  const url = `${baseURL}${base(workspaceId, conversationId)}/export?format=markdown`
  const response = await fetch(url, { credentials: "include" })
  if (!response.ok) throw new Error("Export failed")
  return { blob: await response.blob(), filename: filenameFrom(response.headers) }
}
