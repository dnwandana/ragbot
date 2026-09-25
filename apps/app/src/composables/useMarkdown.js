import { marked, Marked } from "marked"
import DOMPurify from "dompurify"

// When non-null, only citation numbers in this set render as clickable chips;
// any other [n] marker falls back to literal text. Set synchronously around
// each marked.parse() call — parse is synchronous, so this module-scoped state
// is race-free across renders.
let activeCitations = null

// When true, a citation marker renders as nothing. The share page has no source
// list, so a marker there points at something the reader cannot open.
let stripActive = false

const citationExtension = {
  name: "citation",
  level: "inline",
  start(src) {
    // The token may begin one space before the bracket, because stripping the
    // marker must take that space with it. Marked cuts the preceding text token
    // at this index, so it has to include the space.
    const i = src.search(/[ \t]?\[\d/)
    return i === -1 ? undefined : i
  },
  tokenizer(src) {
    const match = /^([ \t]?)\[(\d+)\](?!\(|\[[^\d])/.exec(src)
    if (match) return { type: "citation", raw: match[0], lead: match[1], num: match[2] }
  },
  renderer(token) {
    if (stripActive) return ""
    // Unknown citation number (stale message capped before the source existed,
    // model hallucinating a marker, or a literal bracket inside a source
    // excerpt) → keep it as plain text instead of a dead, unclickable chip.
    if (activeCitations && !activeCitations.has(Number(token.num))) {
      return `${token.lead}[${token.num}]`
    }
    return `${token.lead}<span class="cite-ref" data-cite="${token.num}">[${token.num}]</span>`
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
   * @param {Object} [options] - Render options.
   * @param {boolean} [options.stripCitations] - Remove every [n] marker, and the
   *   space before it, instead of rendering it. Use it where no source list is
   *   shown. Bracketed numbers inside code stay untouched.
   * @returns {string} Sanitized HTML.
   */
  function render(content, citationNumbers = null, { stripCitations = false } = {}) {
    if (!content) return ""
    activeCitations = citationNumbers ? new Set(citationNumbers.map(Number)) : null
    stripActive = stripCitations
    try {
      const html = marked.parse(content)
      return DOMPurify.sanitize(html, { ADD_ATTR: ["target", "rel", "data-cite"] })
    } catch (err) {
      console.error("[useMarkdown] markdown parse failed:", err)
      return DOMPurify.sanitize(content, { ALLOWED_TAGS: [] })
    } finally {
      activeCitations = null
      stripActive = false
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
    } catch (err) {
      console.error("[useMarkdown] chunk markdown parse failed:", err)
      return DOMPurify.sanitize(content, { ALLOWED_TAGS: [] })
    }
  }

  return { render, renderChunk }
}
