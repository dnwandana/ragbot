/**
 * Decide whether the active workspace must be (re)loaded for a navigation.
 * Returns true only when navigating into a workspace-scoped route whose
 * workspace differs from the one already loaded, so navigation within the
 * same workspace does not trigger a redundant fetch.
 * An empty-string targetWorkspaceId is treated as absent (same as null/undefined), so it never triggers a fetch.
 *
 * @param {string|null|undefined} currentWorkspaceId - id of the workspace currently loaded in the store
 * @param {string|null|undefined} targetWorkspaceId - workspaceId route param being navigated to
 * @returns {boolean}
 */
export function shouldFetchWorkspace(currentWorkspaceId, targetWorkspaceId) {
  return Boolean(targetWorkspaceId) && currentWorkspaceId !== targetWorkspaceId
}
