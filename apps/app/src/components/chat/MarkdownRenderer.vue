<template>
  <div class="md-prose" v-html="renderedHtml" @click="onContainerClick" />
</template>

<script setup>
import { computed } from "vue"
import { useMarkdown } from "@/composables/useMarkdown"

const props = defineProps({
  /** Markdown text to render */
  text: { type: String, default: "" },
  /** Whether the response is currently streaming */
  streaming: { type: Boolean, default: false },
})

const emit = defineEmits(["cite"])

const { render } = useMarkdown()

const renderedHtml = computed(() => {
  const content = props.text || ""

  if (!content) return ""

  let html = render(content)

  // Append streaming cursor outside open code fences
  if (props.streaming) {
    const fences = (content.match(/```/g) || []).length
    if (fences % 2 === 0) {
      html += '<span class="md-cursor"></span>'
    }
  }

  return html
})

/** Delegate clicks on .cite-ref elements to the cite event */
function onContainerClick(event) {
  const num = event.target.dataset?.cite
  if (num) emit("cite", parseInt(num, 10))
}
</script>

<style scoped>
/* ── Prose container ── */
.md-prose {
  font-size: var(--t-md);
  line-height: 1.62;
  color: var(--ink);
}

.md-prose > :first-child {
  margin-top: 0;
}
.md-prose > :last-child {
  margin-bottom: 0;
}

/* ── Headings ── */
.md-prose :deep(h1) {
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.015em;
  margin: 20px 0 10px;
  line-height: 1.25;
}
.md-prose :deep(h2) {
  font-size: 16.5px;
  font-weight: 600;
  letter-spacing: -0.01em;
  margin: 22px 0 9px;
  line-height: 1.3;
  padding-bottom: 5px;
  border-bottom: 1px solid var(--line);
}
.md-prose :deep(h3) {
  font-size: 14.5px;
  font-weight: 600;
  margin: 16px 0 7px;
}
.md-prose :deep(h4) {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--ink-2);
  margin: 14px 0 6px;
}

/* ── Paragraphs ── */
.md-prose :deep(p) {
  margin: 0 0 12px;
  text-wrap: pretty;
}

/* ── Strong / em ── */
.md-prose :deep(strong) {
  font-weight: 600;
  color: var(--ink);
}
.md-prose :deep(em) {
  font-style: italic;
}

/* ── Lists ── */
.md-prose :deep(ul),
.md-prose :deep(ol) {
  margin: 0 0 12px;
  padding-left: 22px;
}
.md-prose :deep(li) {
  margin: 4px 0;
  line-height: 1.6;
  padding-left: 3px;
}

/* ── Links ── */
.md-prose :deep(a) {
  color: var(--brand-3);
  text-decoration: underline;
  text-underline-offset: 2px;
  text-decoration-thickness: 1px;
}
.md-prose :deep(a:hover) {
  color: var(--brand-2);
}

/* ── Horizontal rule ── */
.md-prose :deep(hr) {
  border: none;
  border-top: 1px solid var(--line);
  margin: 18px 0;
}

/* ── Blockquote ── */
.md-prose :deep(blockquote) {
  margin: 0 0 12px;
  padding: 4px 0 4px 14px;
  border-left: 3px solid var(--brand);
  color: var(--ink-2);
  font-style: normal;
}

/* ── Inline code ── */
.md-prose :deep(code) {
  font-family: var(--font-mono);
  font-size: 0.86em;
  background: var(--bg-2);
  border: 1px solid var(--line);
  border-radius: 5px;
  padding: 1px 5px;
  color: var(--ink-2);
}

/* ── Code blocks ── */
.md-prose :deep(pre) {
  margin: 0 0 14px;
  border: 1px solid var(--line);
  border-radius: var(--r);
  overflow: hidden;
  background: var(--surface);
}

.md-prose :deep(pre > code) {
  font-family: var(--font-mono);
  font-size: 12.8px;
  line-height: 1.6;
  color: var(--ink);
  background: var(--surface);
  display: block;
  padding: 13px 14px;
  overflow-x: auto;
  white-space: pre;
  border: none;
}

/* ── Tables ── */
.md-prose :deep(table) {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  margin: 0 0 14px;
}

.md-prose :deep(th),
.md-prose :deep(td) {
  text-align: left;
  padding: 8px 13px;
  border-bottom: 1px solid var(--line);
  border-right: 1px solid var(--line);
}

.md-prose :deep(th:last-child),
.md-prose :deep(td:last-child) {
  border-right: none;
}
.md-prose :deep(tr:last-child td) {
  border-bottom: none;
}
.md-prose :deep(thead th) {
  background: var(--bg-2);
  font-weight: 600;
  color: var(--ink-2);
  white-space: nowrap;
}
.md-prose :deep(tbody tr:hover) {
  background: var(--bg-2);
}
.md-prose :deep(td:first-child) {
  font-weight: 500;
}

/* ── Citation refs ── */
.md-prose :deep(.cite-ref) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 3px;
  margin-left: 2px;
  border-radius: 3px;
  background: var(--brand-tint);
  color: var(--brand-3);
  font: 600 10.5px var(--font-mono);
  vertical-align: 1px;
  cursor: pointer;
  transition:
    background var(--dur) var(--ease),
    color var(--dur) var(--ease);
}

.md-prose :deep(.cite-ref:hover) {
  background: var(--brand);
  color: #fff;
}

/* ── Streaming cursor ── */
.md-prose :deep(.md-cursor) {
  display: inline-block;
  width: 7px;
  height: 1.05em;
  vertical-align: -0.18em;
  margin-left: 2px;
  background: var(--brand);
  border-radius: 1px;
  animation: ragbot-blink 1s steps(1) infinite;
}

@keyframes ragbot-blink {
  0%,
  49% {
    opacity: 1;
  }
  50%,
  100% {
    opacity: 0;
  }
}
</style>
