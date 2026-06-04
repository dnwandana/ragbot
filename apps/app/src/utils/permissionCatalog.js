/**
 * Static display metadata for the workspace permission system.
 * Mirrors the 31 permissions seeded in apps/api/database/seeds/01_permissions.js.
 * This file MUST stay in sync with that seed when permissions change.
 */

/**
 * Ordered resource groups with display label and icon key. `icon` is a stable key
 * mapped to an Ant Design icon component by the consuming RolePermissionMatrix.
 */
export const PERMISSION_GROUPS = [
  { resource: "workspace", label: "Workspace", icon: "workspace" },
  { resource: "role", label: "Roles", icon: "roles" },
  { resource: "member", label: "Members", icon: "members" },
  { resource: "audit", label: "Audit log", icon: "audit" },
  { resource: "dataset", label: "Datasets", icon: "datasets" },
  { resource: "file", label: "Files", icon: "files" },
  { resource: "agent", label: "Agents", icon: "agents" },
  { resource: "conversation", label: "Conversations", icon: "conversations" },
]

/**
 * Per-permission display metadata keyed by permission name ("resource:action").
 * `destructive` marks irreversible actions surfaced with a warning badge.
 */
export const PERMISSION_META = {
  "workspace:create": { label: "Create workspaces" },
  "workspace:read": { label: "View workspace" },
  "workspace:update": { label: "Update workspace settings" },
  "workspace:delete": { label: "Delete workspace", destructive: true },
  "role:create": { label: "Create roles" },
  "role:read": { label: "View roles" },
  "role:update": { label: "Edit roles" },
  "role:delete": { label: "Delete roles", destructive: true },
  "member:read": { label: "View members" },
  "member:invite": { label: "Invite members" },
  "member:remove": { label: "Remove members", destructive: true },
  "member:manage_role": { label: "Change member roles" },
  "audit:read": { label: "View audit log" },
  "dataset:create": { label: "Create datasets" },
  "dataset:read": { label: "View datasets" },
  "dataset:update": { label: "Edit datasets" },
  "dataset:delete": { label: "Delete datasets", destructive: true },
  "file:read": { label: "View files" },
  "file:upload": { label: "Upload files" },
  "file:update": { label: "Edit files" },
  "file:delete": { label: "Delete files", destructive: true },
  "file:reprocess": { label: "Reprocess files" },
  "agent:create": { label: "Create agents" },
  "agent:read": { label: "View agents" },
  "agent:update": { label: "Edit agents" },
  "agent:delete": { label: "Delete agents", destructive: true },
  "conversation:create": { label: "Create conversations" },
  "conversation:read": { label: "View conversations" },
  "conversation:update": { label: "Edit conversations" },
  "conversation:delete": { label: "Delete conversations", destructive: true },
  "conversation:chat": { label: "Chat with agents" },
}

/**
 * Group a flat permissions array (from the API) into ordered display groups.
 * Unknown permissions fall back to their API description, then their name.
 *
 * @param {Array<{id: string, name: string, resource: string, action: string, description?: string}>} permissions
 * @returns {Array<{resource: string, label: string, icon: string, permissions: Array}>}
 */
export function groupPermissions(permissions) {
  const byResource = {}
  for (const perm of permissions) {
    if (!byResource[perm.resource]) byResource[perm.resource] = []
    const meta = PERMISSION_META[perm.name] ?? {}
    byResource[perm.resource].push({
      ...perm,
      label: meta.label ?? perm.description ?? perm.name,
      destructive: meta.destructive ?? false,
    })
  }
  return PERMISSION_GROUPS.filter((group) => byResource[group.resource]).map((group) => ({
    ...group,
    permissions: byResource[group.resource],
  }))
}
