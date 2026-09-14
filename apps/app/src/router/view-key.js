// Routes that share one component instance. ChatView creates the conversation
// and replaces the URL in the middle of a send, so it must survive that URL
// change.
const CHAT_ROUTES = new Set(["NewChat", "Chat"])

/**
 * Returns the key for the `<RouterView>` inside AppLayout.
 *
 * The full path as a key destroys and remounts the view on every URL change.
 * That kills the ChatView instance that owns the live stream when onSend
 * replaces `/conversations/new` with `/conversations/:id`, so the answer stays
 * invisible until the stream ends. The chat routes therefore get one key per
 * workspace: the view survives a send, and it still remounts for another
 * workspace. Every other route keeps the full path.
 *
 * @param {import('vue-router').RouteLocationNormalizedLoaded} route - The current route.
 * @returns {string} The router view key.
 */
export function routerViewKey(route) {
  if (CHAT_ROUTES.has(route.name)) return `chat:${route.params.workspaceId}`
  return route.fullPath
}
