import {
  LayoutGrid,
  ShieldCheck,
  Users,
  ClipboardCheck,
  Database,
  FileText,
  Bot,
  MessageSquare,
} from "lucide-vue-next"

/** @type {Record<string, object>} permission group key → Lucide icon component */
const PERMISSION_GROUP_ICONS = {
  workspace: LayoutGrid,
  roles: ShieldCheck,
  members: Users,
  audit: ClipboardCheck,
  datasets: Database,
  files: FileText,
  agents: Bot,
  conversations: MessageSquare,
}

/**
 * Resolve a permission-group icon key to a Lucide icon component.
 * @param {string} key
 * @returns {object} Lucide icon component (defaults to LayoutGrid).
 */
export function permissionGroupIcon(key) {
  return PERMISSION_GROUP_ICONS[key] || LayoutGrid
}
