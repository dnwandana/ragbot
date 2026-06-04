/**
 * Pure translation helpers mapping the lean audit-log API shape into display data.
 * No Vue, no API calls — the single boundary between the API and the audit UI.
 */

/** @type {Record<string,string>} entity_type → category key */
const ENTITY_CATEGORY = {
  dataset: "datasets",
  dataset_file: "datasets",
  conversation: "conversations",
  conversation_dataset: "conversations",
  workspace_member: "members",
  role: "members",
  role_permission: "members",
  agent: "agents",
  workspace: "workspace",
}

/** Category metadata: label, dot color, soft background, soft text color, icon key. */
export const CATEGORIES = {
  datasets: {
    label: "Datasets",
    dot: "#c2603a",
    softBg: "rgba(194,96,58,0.12)",
    text: "rgb(120,59,35)",
    icon: "database",
  },
  conversations: {
    label: "Conversations",
    dot: "#4a6d80",
    softBg: "rgba(74,109,128,0.12)",
    text: "rgb(45,67,79)",
    icon: "message",
  },
  members: {
    label: "Members & roles",
    dot: "#5a7d52",
    softBg: "rgba(90,125,82,0.12)",
    text: "rgb(55,77,50)",
    icon: "team",
  },
  agents: {
    label: "Agents",
    dot: "#9c7a3a",
    softBg: "rgba(156,122,58,0.12)",
    text: "rgb(96,75,35)",
    icon: "robot",
  },
  workspace: {
    label: "Workspace",
    dot: "#8a5a78",
    softBg: "rgba(138,90,120,0.12)",
    text: "rgb(85,55,74)",
    icon: "appstore",
  },
}

/** @param {string} entityType @returns {string} category key */
export function categoryKey(entityType) {
  return ENTITY_CATEGORY[entityType] || "workspace"
}

/** @param {string} entityType @returns {{label:string,dot:string,softBg:string,text:string,icon:string}} */
export function category(entityType) {
  return CATEGORIES[categoryKey(entityType)]
}

/** @type {Record<string,string>} entity_type → resource-pill icon key */
const ENTITY_ICON = {
  workspace: "appstore",
  workspace_member: "user",
  role: "safety",
  role_permission: "safety",
  dataset: "database",
  dataset_file: "file",
  agent: "robot",
  conversation: "message",
  conversation_dataset: "paperclip",
}

/** @param {string} entityType @returns {string} icon key for the resource pill */
export function entityIcon(entityType) {
  return ENTITY_ICON[entityType] || "file"
}

/** @type {Record<string,string>} entity_type → display noun */
const ENTITY_NOUN = {
  workspace: "workspace",
  workspace_member: "member",
  role: "role",
  role_permission: "permission",
  dataset: "dataset",
  dataset_file: "file",
  agent: "agent",
  conversation: "conversation",
  conversation_dataset: "dataset",
}

/** @type {Record<string,string>} action → past-tense verb word */
const ACTION_PAST = {
  created: "Created",
  updated: "Updated",
  deleted: "Deleted",
  invited: "Invited",
  suspended: "Suspended",
  uploaded: "Uploaded",
  reprocessed: "Reprocessed",
  attached: "Attached",
  detached: "Detached",
}

/** @type {Record<string,string>} actions that don't follow "<verb> <noun>" */
const SPECIAL_VERB = {
  joined: "Joined workspace",
  role_changed: "Changed role",
  permission_granted: "Granted permission",
  permission_revoked: "Revoked permission",
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/**
 * Compose a human verb from action + entity_type.
 * @param {string} action
 * @param {string} entityType
 * @returns {string}
 */
export function verb(action, entityType) {
  if (SPECIAL_VERB[action]) return SPECIAL_VERB[action]
  const word = ACTION_PAST[action] || capitalize(String(action).replace(/_/g, " "))
  const noun = ENTITY_NOUN[entityType] || String(entityType).replace(/_/g, " ")
  return `${word} ${noun}`
}

/** @param {string} id @returns {string} first 8 hex chars of a UUID/id */
export function shortId(id) {
  if (!id) return "—"
  return String(id).replace(/-/g, "").slice(0, 8)
}

function resourceName(event) {
  const c = event.changes || {}
  const ctx = event.context || {}
  if (c.name && typeof c.name === "object" && "to" in c.name) return String(c.name.to)
  return ctx.name || ctx.title || ctx.email || ctx.invited_email || ctx.removed_email || null
}

/**
 * Resource label: a human name from changes/context if available, else "<entity_type> · <short id>".
 * @param {Object} event - raw audit row
 * @returns {string}
 */
export function resourceLabel(event) {
  return resourceName(event) || `${event.entity_type} · ${shortId(event.entity_id)}`
}

const ACTOR_COLORS = ["#c2603a", "#5a7d52", "#4a6d80", "#8a5a78", "#9c7a3a", "#6a6a8a"]

/** Deterministic warm avatar color from a user id. @param {string} userId @returns {string} */
export function actorColor(userId) {
  let hash = 0
  const s = String(userId || "")
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0
  return ACTOR_COLORS[hash % ACTOR_COLORS.length]
}

/** Up to two uppercase initials from a name. @param {string} name @returns {string} */
export function initials(name) {
  if (!name) return "?"
  const parts = name.trim().split(/\s+/)
  const a = parts[0]?.[0] || ""
  const b = parts.length > 1 ? parts[parts.length - 1][0] : ""
  return (a + b).toUpperCase() || "?"
}

/**
 * Resolve an actor display object from a members map.
 * @param {string} userId
 * @param {Map<string,{full_name:string,email:string}>} memberMap
 * @returns {{name:string,email:string,initials:string,color:string}}
 */
export function resolveActor(userId, memberMap) {
  const m = memberMap?.get(userId)
  if (m) {
    return {
      name: m.full_name || m.email || shortId(userId),
      email: m.email || "",
      initials: initials(m.full_name || m.email),
      color: actorColor(userId),
    }
  }
  return {
    name: `Unknown · ${shortId(userId)}`,
    email: userId || "",
    initials: "?",
    color: "#9c9081",
  }
}

function pickKey(obj, a, b) {
  return a in obj ? obj[a] : obj[b]
}

function formatVal(v) {
  if (v == null) return "—"
  if (Array.isArray(v)) return v.join(", ")
  if (typeof v === "object") return JSON.stringify(v)
  return String(v)
}

/**
 * Normalize `changes` JSONB into before/after rows. Diff-shaped fields ({from/to} or
 * {before/after}) render before→after; any other field renders with an em-dash "before".
 * @param {Object|null|undefined} changes
 * @returns {Array<{field:string,before:string,after:string}>|null} null only when changes is empty/non-object
 */
export function diffRows(changes) {
  if (!changes || typeof changes !== "object") return null
  const rows = []
  for (const [field, v] of Object.entries(changes)) {
    const isDiff =
      v && typeof v === "object" && ("to" in v || "after" in v || "from" in v || "before" in v)
    if (isDiff) {
      rows.push({
        field,
        before: formatVal(pickKey(v, "before", "from")),
        after: formatVal(pickKey(v, "after", "to")),
      })
    } else {
      rows.push({ field, before: "—", after: formatVal(v) })
    }
  }
  return rows.length ? rows : null
}

/**
 * Flatten an object into [key, displayValue] string pairs for a generic table.
 * @param {Object|null} obj
 * @returns {Array<[string,string]>}
 */
export function keyValueRows(obj) {
  if (!obj || typeof obj !== "object") return []
  return Object.entries(obj).map(([k, v]) => [k, formatVal(v)])
}

/** Filter option lists (mirror the backend enums). */
export const ENTITY_TYPE_OPTIONS = [
  { value: "workspace", label: "Workspace" },
  { value: "workspace_member", label: "Member" },
  { value: "role", label: "Role" },
  { value: "role_permission", label: "Role permission" },
  { value: "dataset", label: "Dataset" },
  { value: "dataset_file", label: "Dataset file" },
  { value: "agent", label: "Agent" },
  { value: "conversation", label: "Conversation" },
  { value: "conversation_dataset", label: "Conversation dataset" },
]

export const ACTION_OPTIONS = [
  { value: "created", label: "Created" },
  { value: "updated", label: "Updated" },
  { value: "deleted", label: "Deleted" },
  { value: "invited", label: "Invited" },
  { value: "joined", label: "Joined" },
  { value: "suspended", label: "Suspended" },
  { value: "role_changed", label: "Role changed" },
  { value: "permission_granted", label: "Permission granted" },
  { value: "permission_revoked", label: "Permission revoked" },
  { value: "uploaded", label: "Uploaded" },
  { value: "reprocessed", label: "Reprocessed" },
  { value: "attached", label: "Attached" },
  { value: "detached", label: "Detached" },
]

/** @param {string} value @returns {string} */
export function entityTypeLabel(value) {
  return ENTITY_TYPE_OPTIONS.find((o) => o.value === value)?.label || value
}

/** @param {string} value @returns {string} */
export function actionLabel(value) {
  return ACTION_OPTIONS.find((o) => o.value === value)?.label || value
}

/**
 * Build actor filter options from a workspace member list, excluding members who have
 * not joined yet (no `user_id`) since they can never match an audit row. Labels fall back
 * to `shortId(user_id)` when both name and email are absent, matching `resolveActor`.
 * @param {Array<{user_id?:string, full_name?:string, email?:string}>} members
 * @returns {Array<{value:string, label:string}>}
 */
export function memberFilterOptions(members) {
  return (members || [])
    .filter((m) => m.user_id)
    .map((m) => ({ value: m.user_id, label: m.full_name || m.email || shortId(m.user_id) }))
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const pad = (n) => (n < 10 ? "0" + n : "" + n)

/** Full absolute timestamp, e.g. "Jun 4, 2026 · 11:12:30". @param {string} dateStr @returns {string} */
export function absoluteTime(dateStr) {
  if (!dateStr) return ""
  const d = new Date(dateStr)
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} · ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/** Time of day, e.g. "11:12:30". @param {string} dateStr @returns {string} */
export function timeOfDay(dateStr) {
  if (!dateStr) return ""
  const d = new Date(dateStr)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}
