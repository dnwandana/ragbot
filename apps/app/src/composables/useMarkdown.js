import { marked, Marked } from "marked"
import DOMPurify from "dompurify"

// When non-null, only citation numbers in this set render as clickable chips;
// any other [n] marker falls back to literal text. Set synchronously around
// each marked.parse() call — parse is synchronous, so this module-scoped state
// is race-free across renders.
let activeCitations = null

const citationExtension = {
  name: "citation",
  level: "inline",
  start(src) {
    return src.indexOf("[")
  },
  tokenizer(src) {
    const match = /^\[(\d+)\](?!\(|\[[^\d])/.exec(src)
    if (match) return { type: "citation", raw: match[0], num: match[1] }
  },
  renderer(token) {
    // Unknown citation number (stale message capped before the source existed,
    // model hallucinating a marker, or a literal bracket inside a source
    // excerpt) → keep it as plain text instead of a dead, unclickable chip.
    if (activeCitations && !activeCitations.has(Number(token.num))) {
      return `[${token.num}]`
    }
    return `<span class="cite-ref" data-cite="${token.num}">[${token.num}]</span>`
  },
}

marked.use({ extensions: [citationExtension] })

marked.use({
  renderer: {
    link({ href, text }) {
      return `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`
    },
  },
})

const chunkMarked = new Marked()
chunkMarked.use({
  renderer: {
    link({ href, text }) {
      return `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`
    },
  },
})

export function useMarkdown() {
  /**
   * Render chat markdown. Citation markers ([n]) become clickable chips.
   *
   * @param {string|null} content - Raw markdown.
   * @param {number[]|null} [citationNumbers] - Citation numbers that have a
   *   backing source for this message. When provided, any [n] NOT in the list
   *   renders as literal text instead of a chip. Pass null/omit to chip every
   *   marker (used while streaming, before citations are known).
   * @returns {string} Sanitized HTML.
   */
  function render(content, citationNumbers = null) {
    if (!content) return ""
    activeCitations = citationNumbers ? new Set(citationNumbers.map(Number)) : null
    try {
      const html = marked.parse(content)
      return DOMPurify.sanitize(html, { ADD_ATTR: ["target", "rel", "data-cite"] })
    } catch {
      return DOMPurify.sanitize(content)
    } finally {
      activeCitations = null
    }
  }

  /**
   * Render dataset-chunk markdown WITHOUT chat citation semantics.
   *
   * Uses an isolated `Marked` instance (no citation extension) so bracketed
   * numbers in document text stay literal and never render as citation chips.
   *
   * @param {string|null} content - Raw markdown chunk content
   * @returns {string} Sanitized HTML
   */
  function renderChunk(content) {
    if (!content) return ""
    try {
      const html = chunkMarked.parse(content)
      return DOMPurify.sanitize(html, { ADD_ATTR: ["target", "rel"] })
    } catch {
      return DOMPurify.sanitize(content)
    }
  }

  return { render, renderChunk }
}
