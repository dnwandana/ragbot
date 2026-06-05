import {
  Database,
  MessageSquare,
  Users,
  Bot,
  LayoutGrid,
  FileText,
  User,
  ShieldCheck,
  Paperclip,
} from "lucide-vue-next"

/** @type {Record<string, object>} icon key → Lucide icon component */
const AUDIT_ICONS = {
  database: Database,
  message: MessageSquare,
  team: Users,
  robot: Bot,
  appstore: LayoutGrid,
  file: FileText,
  user: User,
  safety: ShieldCheck,
  paperclip: Paperclip,
}

/**
 * Resolve an audit icon key to a Lucide icon component.
 * @param {string} key
 * @returns {object} Lucide icon component (defaults to FileText).
 */
export function auditIcon(key) {
  return AUDIT_ICONS[key] || FileText
}
