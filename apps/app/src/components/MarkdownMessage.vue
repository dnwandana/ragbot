<template>
  <div class="markdown-body" v-html="renderedHtml" @click="onContainerClick" />
</template>

<script setup>
import { computed } from "vue"
import { useMarkdown } from "@/composables/useMarkdown"

const props = defineProps({
  content: {
    type: String,
    default: "",
  },
})

const emit = defineEmits(["citation-click"])

const { render } = useMarkdown()
const renderedHtml = computed(() => render(props.content))

function onContainerClick(event) {
  const num = event.target.dataset?.cite
  if (num) emit("citation-click", parseInt(num, 10))
}
</script>

<style scoped>
.markdown-body :deep(h1) {
  font-size: 1.5em;
  margin-bottom: 0.5rem;
}
.markdown-body :deep(h2) {
  font-size: 1.3em;
  margin-bottom: 0.5rem;
}
.markdown-body :deep(h3) {
  font-size: 1.1em;
  margin-bottom: 0.5rem;
}
.markdown-body :deep(h4) {
  font-size: 1em;
  margin-bottom: 0.5rem;
}
.markdown-body :deep(h5) {
  font-size: 0.9em;
  margin-bottom: 0.5rem;
}
.markdown-body :deep(h6) {
  font-size: 0.8em;
  margin-bottom: 0.5rem;
}
.markdown-body :deep(p) {
  margin-bottom: 0.75rem;
  line-height: 1.6;
}
.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  padding-left: 1.5rem;
}
.markdown-body :deep(code) {
  font-family: monospace;
  background: #f1f5f9;
  padding: 1px 3px;
  border-radius: 3px;
  font-size: 0.9em;
}
.markdown-body :deep(pre > code) {
  background: #1e293b;
  color: #fff;
  display: block;
  padding: 1rem;
  border-radius: 6px;
  overflow-x: auto;
  font-size: 0.85em;
}
.markdown-body :deep(blockquote) {
  border-left: 3px solid var(--line-2);
  color: var(--ink-3);
  padding-left: 1rem;
  margin: 0.5rem 0;
}
.markdown-body :deep(a) {
  color: var(--brand);
}
.markdown-body :deep(a:hover) {
  text-decoration: underline;
}
.markdown-body :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin-bottom: 0.75rem;
}
.markdown-body :deep(th),
.markdown-body :deep(td) {
  border: 1px solid var(--line-2);
  padding: 0.4rem 0.6rem;
}
.markdown-body :deep(*:last-child) {
  margin-bottom: 0;
}
.markdown-body :deep(.cite-ref) {
  color: var(--brand);
  font-size: 0.8em;
  font-weight: 700;
  cursor: pointer;
  padding: 0 2px;
  border-radius: 3px;
  vertical-align: super;
}
.markdown-body :deep(.cite-ref:hover) {
  text-decoration: underline;
}
</style>
