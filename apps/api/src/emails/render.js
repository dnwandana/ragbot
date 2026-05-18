import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { join, dirname } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))
const templatesDir = join(__dirname, "templates")
const cache = new Map()

/**
 * Escapes HTML-special characters in a string.
 *
 * @param {string} str - The string to escape.
 * @returns {string} HTML-safe string.
 */
const escapeHtml = (str) =>
  String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")

/**
 * Loads an HTML template from disk (cached after first read).
 *
 * @param {string} name - Template name without extension (e.g., 'verify-email').
 * @returns {string} Raw HTML template string.
 */
function load(name) {
  if (!cache.has(name)) {
    cache.set(name, readFileSync(join(templatesDir, `${name}.html`), "utf-8"))
  }
  return cache.get(name)
}

/**
 * Renders an HTML template by substituting {{key}} placeholders with HTML-escaped values.
 *
 * @param {string} name - Template name without extension.
 * @param {Object} [params={}] - Key-value pairs to substitute into the template.
 * @returns {string} Rendered HTML string with all matching placeholders replaced.
 */
export function render(name, params = {}) {
  let html = load(name)
  for (const [key, value] of Object.entries(params)) {
    html = html.replaceAll(`{{${key}}}`, escapeHtml(value ?? ""))
  }
  return html
}
