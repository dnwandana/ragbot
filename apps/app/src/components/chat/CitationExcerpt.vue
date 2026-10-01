<template>
  <div class="citation-excerpt">
    <MarkdownRenderer :text="view.markdown" :citation-numbers="[]" :transform="transform" />
    <button
      v-if="view.clipped"
      type="button"
      class="citation-excerpt__toggle"
      @click="expanded = !expanded"
    >
      {{ expanded ? "Show less" : "Show full excerpt" }}
    </button>
  </div>
</template>

<script setup>
import { computed, ref } from "vue"
import MarkdownRenderer from "@/components/chat/MarkdownRenderer.vue"
import { useMarkdown } from "@/composables/useMarkdown"
import { markPassage, selectLead, selectWindow } from "./citation-window.js"

/** A citation without offsets shows its full text up to this length. */
const LEGACY_EXCERPT_CHARS = 500

const props = defineProps({
  /** The full chunk text of the citation. */
  text: { type: String, required: true },
  /** The start offset of the cited passage in `text`. */
  start: { type: Number, default: null },
  /** The end offset of the cited passage in `text` (exclusive). */
  end: { type: Number, default: null },
})

const { render } = useMarkdown()
const expanded = ref(false)

// Offsets that do not fit the text come from old or bad data. Show them as a legacy citation.
const range = computed(() => {
  const { text, start, end } = props
  const valid =
    Number.isInteger(start) &&
    Number.isInteger(end) &&
    start >= 0 &&
    start < end &&
    end <= text.length
  return valid ? { start, end } : null
})

const view = computed(() => {
  const { text } = props
  if (range.value) {
    return expanded.value
      ? { markdown: text, clipped: true }
      : selectWindow({ text, start: range.value.start, end: range.value.end })
  }
  if (text.length <= LEGACY_EXCERPT_CHARS) return { markdown: text, clipped: false }
  return expanded.value ? { markdown: text, clipped: true } : selectLead(text)
})

const transform = computed(() => {
  if (!range.value) return null
  const passage = props.text.slice(range.value.start, range.value.end)
  return (html) => markPassage({ html, passageMarkdown: passage, render: (md) => render(md, []) })
})
</script>

<style scoped>
.citation-excerpt :deep(.citation-excerpt__mark) {
  background: rgba(217, 119, 38, 0.24);
  color: inherit;
  border-radius: 2px;
}

.citation-excerpt__toggle {
  border: none;
  background: none;
  padding: 0;
  margin-top: 6px;
  font-size: var(--t-md);
  color: var(--brand-3);
  cursor: pointer;
}

.citation-excerpt__toggle:hover {
  color: var(--brand-2);
}
</style>
