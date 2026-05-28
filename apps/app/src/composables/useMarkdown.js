import { marked } from "marked"
import DOMPurify from "dompurify"

const citationExtension = {
  name: "citation",
  level: "inline",
  start(src) {
    return src.indexOf("[")
  },
  tokenizer(src) {
    const match = /^\[(\d+)\](?!\[|\()/.exec(src)
    if (match) return { type: "citation", raw: match[0], num: match[1] }
  },
  renderer(token) {
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

export function useMarkdown() {
  /**
   * @param {string|null} content
   * @returns {string}
   */
  function render(content) {
    if (!content) return ""
    try {
      const html = marked.parse(content)
      return DOMPurify.sanitize(html, { ADD_ATTR: ["target", "rel", "data-cite"] })
    } catch {
      return DOMPurify.sanitize(content)
    }
  }

  return { render }
}
