import { KeyRound, Code, Table, Book, MessageSquare } from "lucide-vue-next"

/** @type {Record<string, object>} prompt icon key → Lucide icon component */
const PROMPT_ICONS = {
  key: KeyRound,
  code: Code,
  table: Table,
  book: Book,
}

/**
 * Resolve a starter-prompt icon key to a Lucide icon component.
 * @param {string} icon
 * @returns {object} Lucide icon component (defaults to MessageSquare).
 */
export function promptIcon(icon) {
  return PROMPT_ICONS[icon] || MessageSquare
}
