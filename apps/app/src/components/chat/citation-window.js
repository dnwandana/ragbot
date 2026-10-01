/**
 * Selects the part of a cited chunk that the sources panel shows.
 *
 * The slice must still render as Markdown. A cut table or a cut list does not
 * render, so the module cuts only paragraphs. A table, a list, a heading, a
 * quote, or a code block stays whole.
 */

/** The number of characters to show on each side of the passage. */
export const CONTEXT_CHARS = 140

/** The maximum length of the lead of a text that has no passage offsets. */
export const LEAD_CHARS = 280

const ELLIPSIS = "…"
const SPACE = /\s/

/** Returns the kind of a block from its first line. */
function kindOf(block) {
  if (/^#{1,6}\s/.test(block)) return "heading"
  if (block.startsWith("|")) return "table"
  if (/^([-*+]|\d+\.)\s/.test(block)) return "list"
  if (block.startsWith(">")) return "quote"
  if (block.startsWith("```")) return "code"
  return "paragraph"
}

const fenceCount = (s) => (s.match(/```/g) || []).length

/**
 * Splits a text into blocks at blank lines. Returns the offsets of each block
 * without outer white space. A fence with a blank line inside stays one block.
 */
function toBlocks(text) {
  const pieces = []
  const gap = /\n{2,}/g
  let from = 0
  for (let m = gap.exec(text); m; m = gap.exec(text)) {
    pieces.push([from, m.index])
    from = m.index + m[0].length
  }
  pieces.push([from, text.length])

  const blocks = []
  for (let [start, end] of pieces) {
    while (start < end && SPACE.test(text[start])) start++
    while (end > start && SPACE.test(text[end - 1])) end--
    if (start === end) continue
    const last = blocks[blocks.length - 1]
    if (last && fenceCount(text.slice(last.start, last.end)) % 2 === 1) {
      last.end = end
    } else {
      blocks.push({ start, end })
    }
  }
  for (const block of blocks) block.kind = kindOf(text.slice(block.start, block.end))
  return blocks
}

/** Moves a cut forward to the start of the next word, but not past `limit`. */
function toWordStart(text, cut, limit) {
  let at = cut
  if (at > 0 && !SPACE.test(text[at - 1])) {
    while (at < limit && !SPACE.test(text[at])) at++
  }
  while (at < limit && SPACE.test(text[at])) at++
  return at < limit ? at : cut
}

/** Moves a cut back to the end of the previous word, but not before `limit`. */
function toWordEnd(text, cut, limit) {
  let at = cut
  if (at < text.length && !SPACE.test(text[at])) {
    while (at > limit && !SPACE.test(text[at - 1])) at--
  }
  while (at > limit && SPACE.test(text[at - 1])) at--
  return at > limit ? at : cut
}

/** Returns the Markdown and the clipped flag for the slice from `from` to `to`. */
function toView(text, from, to, cutStart, cutEnd) {
  const slice = text.slice(from, to)
  return {
    markdown: `${cutStart ? ELLIPSIS : ""}${slice}${cutEnd ? ELLIPSIS : ""}`,
    clipped: slice.trim() !== text.trim(),
  }
}

/**
 * Returns the Markdown slice around the passage `text.slice(start, end)`, for
 * the collapsed view of a citation.
 *
 * @param {Object} args
 * @param {string} args.text - The full chunk text.
 * @param {number} args.start - The start offset of the passage.
 * @param {number} args.end - The end offset of the passage (exclusive).
 * @returns {{ markdown: string, clipped: boolean }} The slice, and true when it is not the full text.
 */
export function selectWindow({ text, start, end }) {
  const blocks = toBlocks(text)
  if (!blocks.length) return { markdown: text, clipped: false }

  let first = blocks.findIndex((b) => b.end > start)
  if (first < 0) first = blocks.length - 1
  let last = blocks.findLastIndex((b) => b.start <= end - 1)
  if (last < first) last = first

  let from = blocks[first].start
  let to = blocks[last].end
  let cutStart = false
  let cutEnd = false

  if (blocks[first].kind === "paragraph" && start - from > CONTEXT_CHARS) {
    from = toWordStart(text, start - CONTEXT_CHARS, start)
    cutStart = true
  }
  if (blocks[last].kind === "paragraph" && to - end > CONTEXT_CHARS) {
    to = toWordEnd(text, end + CONTEXT_CHARS, end)
    cutEnd = true
  }
  if (!cutStart && first > 0 && blocks[first - 1].kind === "heading") {
    from = blocks[first - 1].start
  }

  return toView(text, from, to, cutStart, cutEnd)
}

/**
 * Returns the first blocks of a text that has no passage offsets.
 *
 * @param {string} text - The full chunk text.
 * @returns {{ markdown: string, clipped: boolean }} The lead, and true when it is not the full text.
 */
export function selectLead(text) {
  const blocks = toBlocks(text)
  if (!blocks.length) return { markdown: text, clipped: false }

  const from = blocks[0].start
  if (blocks[0].kind === "paragraph" && blocks[0].end - from > LEAD_CHARS) {
    const to = toWordEnd(text, from + LEAD_CHARS, from)
    return toView(text, from, to, false, true)
  }

  let to = blocks[0].end
  for (const block of blocks.slice(1)) {
    if (block.end - from > LEAD_CHARS) break
    to = block.end
  }
  return toView(text, from, to, false, false)
}

const KEY_CHAR = /[\p{L}\p{N}]/u
const TRAILING = new Set([".", ",", ";", ":", "!", "?", "%"])

/**
 * Calls `add` once for each UTF-16 unit of the search key of `str`, with the
 * offset of the source character. The key holds only letters and digits, in
 * lower case, so that Markdown syntax and HTML tags do not change it.
 */
function eachKeyUnit(str, add) {
  let offset = 0
  for (const ch of str) {
    if (KEY_CHAR.test(ch)) {
      for (const unit of ch.toLowerCase()) add(unit, offset, offset + ch.length)
    }
    offset += ch.length
  }
}

/** Parses sanitized HTML into a detached template element. */
function parse(html) {
  const template = document.createElement("template")
  template.innerHTML = html
  return template
}

/** Returns the search key of the text in `html`. */
function toKey(html) {
  let key = ""
  eachKeyUnit(parse(html).content.textContent, (unit) => (key += unit))
  return key
}

/** Returns the text nodes below `root`, in document order. */
function textNodes(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const nodes = []
  for (let node = walker.nextNode(); node; node = walker.nextNode()) nodes.push(node)
  return nodes
}

/**
 * Returns the search key of the text below `root`, and a map from each key
 * character to its text node and its offsets in that node.
 */
function textIndex(root) {
  let key = ""
  const map = []
  for (const node of textNodes(root)) {
    eachKeyUnit(node.data, (unit, offset, end) => {
      key += unit
      map.push({ node, offset, end })
    })
  }
  return { key, map }
}

/**
 * Wraps each matched part of the passage in rendered HTML in a
 * `<mark class="citation-excerpt__mark">`. The match uses only letters and
 * digits, so it works across bold text, links, and table cells.
 *
 * @param {Object} args
 * @param {string} args.html - Sanitized HTML of the excerpt.
 * @param {string} args.passageMarkdown - The Markdown of the cited passage.
 * @param {(md: string) => string} args.render - Renders Markdown to sanitized HTML.
 * @returns {string} The HTML with the marks, or `html` unchanged when the passage is not found.
 */
export function markPassage({ html, passageMarkdown, render }) {
  const needle = toKey(render(passageMarkdown))
  if (!needle) return html

  const template = parse(html)
  const { key, map } = textIndex(template.content)
  const at = key.indexOf(needle)
  if (at < 0) return html

  const { node: startNode, offset: startOffset } = map[at]
  const { node: endNode } = map[at + needle.length - 1]
  let endOffset = map[at + needle.length - 1].end
  while (endOffset < endNode.data.length && TRAILING.has(endNode.data[endOffset])) endOffset++

  const nodes = textNodes(template.content)
  const inRange = nodes.slice(nodes.indexOf(startNode), nodes.indexOf(endNode) + 1)

  // Build nodes, never HTML strings, so passage text cannot become markup.
  for (const node of inRange) {
    const from = node === startNode ? startOffset : 0
    const to = node === endNode ? endOffset : node.data.length
    if (!node.data.slice(from, to).trim()) continue
    let part = node
    if (to < part.data.length) part.splitText(to)
    if (from > 0) part = part.splitText(from)
    const mark = document.createElement("mark")
    mark.className = "citation-excerpt__mark"
    mark.textContent = part.data
    part.replaceWith(mark)
  }

  return template.innerHTML
}
