/**
 * Finds the passage in a chunk that supports each cited claim.
 * Pure: no database or network access.
 */

/** Replaces code with spaces of equal length, so offsets stay valid and code never matches. */
const maskCode = (text) =>
  text
    .replace(/```[\s\S]*?(?:```|$)/g, (m) => " ".repeat(m.length))
    .replace(/`[^`\n]*`/g, (m) => " ".repeat(m.length))

// This rule matches the `citation` extension in apps/app/src/composables/useMarkdown.js.
// Keep the two rules the same. If they differ, the API stores a row that the client never shows.
const MARKER = /\[(\d+)\](?!\(|\[[^\d])/g

/**
 * Returns the `[n]` markers of the text in order. Markers in code do not count.
 *
 * @param {string} text - The answer text.
 * @returns {Array<{ n: number, index: number }>} The markers. `index` is the offset of `[` in the text.
 */
export const parseCitationMarkers = (text) =>
  [...maskCode(text ?? "").matchAll(MARKER)].map((m) => ({ n: Number(m[1]), index: m.index }))

const STOP_WORDS = new Set(
  "the a an and or of to in on for with by is was were are it this that from at as".split(" "),
)
const NUMBER_WEIGHT = 3
const WORD_WEIGHT = 1

// A number: optional sign or $, digits with inner . or , , optional % and unit letter.
// The lookahead rejects "3rd", so the word branch takes it.
const TOKEN = /[$+-]?(\d(?:[\d.,]*\d)?)(%?)([kmb]?)(?![\p{L}\p{N}])|[\p{L}\p{N}]+/gu

/**
 * Returns the unique tokens of the text with their weights.
 * A number has weight 3 and a word has weight 1. Stop words are not in the map.
 *
 * @param {string} text - The text to tokenize.
 * @returns {Map<string, number>} Each unique token mapped to its weight.
 */
export const tokenize = (text) => {
  const out = new Map()
  for (const m of (text ?? "").toLowerCase().matchAll(TOKEN)) {
    if (m[1] !== undefined) {
      out.set(String(Number(m[1].replaceAll(",", ""))) + m[3], NUMBER_WEIGHT)
    } else if (!STOP_WORDS.has(m[0])) {
      out.set(m[0], WORD_WEIGHT)
    }
  }
  return out
}

const HEADING = /^#{1,6}\s/
const TABLE_SEPARATOR = /^\|?(\s*:?-+:?\s*\|)+\s*(:?-+:?\s*)?$/
const LIST_PREFIX = /^([-*+]|\d+\.)\s+/
const SENTENCE_END = /[.!?]/
const SPACE = /\s/

/** Returns the range without outer white space, or null when nothing is left. */
const trimRange = (text, from, to) => {
  while (from < to && SPACE.test(text[from])) from++
  while (to > from && SPACE.test(text[to - 1])) to--
  return from < to ? { start: from, end: to } : null
}

/** Adds one unit for each sentence of the range. A sentence ends at . ! or ? before white space. */
const pushSentences = (text, { start, end }, units) => {
  let from = start
  for (let i = start; i < end; i++) {
    if (SENTENCE_END.test(text[i]) && (i + 1 === end || SPACE.test(text[i + 1]))) {
      const range = trimRange(text, from, i + 1)
      if (range) units.push(range)
      from = i + 1
    }
  }
  const rest = trimRange(text, from, end)
  if (rest) units.push(rest)
}

/**
 * Returns the candidate passages of a text: a sentence, a list item, or a table row.
 * A unit never crosses a line end and never includes outer white space or `\r`.
 *
 * @param {string} text - The chunk text or the answer text.
 * @returns {Array<{ start: number, end: number }>} The units in text order. `end` is exclusive.
 */
export const chunkUnits = (text) => {
  const source = text ?? ""
  const units = []
  let lineStart = 0
  while (lineStart <= source.length) {
    const newline = source.indexOf("\n", lineStart)
    const lineEnd = newline === -1 ? source.length : newline
    const line = trimRange(source, lineStart, lineEnd)
    const content = line ? source.slice(line.start, line.end) : ""
    // A heading is not a claim, so it is never a passage.
    if (line && !HEADING.test(content)) {
      const listPrefix = LIST_PREFIX.exec(content)
      if (content.startsWith("|")) {
        if (!TABLE_SEPARATOR.test(content)) units.push(line)
      } else if (listPrefix) {
        const item = trimRange(source, line.start + listPrefix[0].length, line.end)
        if (item) units.push(item)
      } else {
        pushSentences(source, line, units)
      }
    }
    lineStart = lineEnd + 1
  }
  return units
}

/** Removes markers and Markdown syntax, so only the words of the claim are left. */
const toPlainClaim = (s) =>
  s
    .replace(/\s*\[\d+\](?!\()/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\*\*|__|`|#/g, "")
    .replace(/\|/g, " ")
    .replace(/\s+/g, " ")
    .trim()

/**
 * Returns one plain-text claim for each `[n]` marker in the answer.
 * A claim is the sentence, list item, or table row that holds the marker.
 *
 * @param {string} answer - The final answer text.
 * @param {number} n - The citation number.
 * @returns {string[]} The claims in answer order. Empty when the answer does not cite `n`.
 */
export const answerClaims = (answer, n) => {
  const markers = parseCitationMarkers(answer).filter((marker) => marker.n === n)
  if (markers.length === 0) return []
  const source = answer ?? ""
  const units = chunkUnits(source)
  const claims = []
  for (const marker of markers) {
    const at = units.findIndex(({ start, end }) => start <= marker.index && marker.index < end)
    if (at === -1) continue
    let claim = toPlainClaim(source.slice(units[at].start, units[at].end))
    // A marker after the full stop is a unit of its own, so it cites the unit before it.
    if (!claim && at > 0) claim = toPlainClaim(source.slice(units[at - 1].start, units[at - 1].end))
    if (claim) claims.push(claim)
  }
  return claims
}

const MIN_SCORE = 0.3
const MIN_SHARED_WORDS = 2

/** Returns the weighted recall of the claim tokens in the unit, and the accept decision. */
const scoreUnit = (claimTokens, claimWeight, unitTokens) => {
  let shared = 0
  let sharedNumbers = 0
  let sharedWords = 0
  for (const [token, weight] of claimTokens) {
    if (!unitTokens.has(token)) continue
    shared += weight
    if (weight === NUMBER_WEIGHT) sharedNumbers++
    else sharedWords++
  }
  const score = shared / claimWeight
  // Both rules are necessary: a high score from one common word is not a match.
  const valid = score >= MIN_SCORE && (sharedNumbers >= 1 || sharedWords >= MIN_SHARED_WORDS)
  return { score, valid }
}

/**
 * Finds the unit of the chunk that best supports the claims that cite `n` in the answer.
 * The offsets are UTF-16 string indices into `chunkText`, so `chunkText.slice(start, end)` is the unit.
 *
 * @param {Object} params
 * @param {string} params.answer - The final answer text.
 * @param {number} params.n - The citation number.
 * @param {string} params.chunkText - The full text of the cited chunk.
 * @returns {{ start: number, end: number } | null} The offsets of the best supporting unit,
 *   with `end` exclusive, or null when no unit is a valid match.
 */
export const findPassage = ({ answer, n, chunkText }) => {
  const claims = answerClaims(answer, n)
  if (claims.length === 0) return null
  const units = chunkUnits(chunkText).map((unit) => ({
    ...unit,
    tokens: tokenize(chunkText.slice(unit.start, unit.end)),
  }))
  let best = null
  for (const claim of claims) {
    const claimTokens = tokenize(claim)
    let claimWeight = 0
    for (const weight of claimTokens.values()) claimWeight += weight
    // A claim with only stop words has no weight and cannot match.
    if (claimWeight === 0) continue
    for (const unit of units) {
      const { score, valid } = scoreUnit(claimTokens, claimWeight, unit.tokens)
      if (!valid) continue
      const length = unit.end - unit.start
      if (!best || score > best.score || (score === best.score && length < best.length)) {
        best = { start: unit.start, end: unit.end, score, length }
      }
    }
  }
  return best && { start: best.start, end: best.end }
}
