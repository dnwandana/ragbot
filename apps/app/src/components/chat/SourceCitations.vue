<template>
  <div v-if="sources.length > 0" class="source-citations">
    <button class="source-toggle" :aria-expanded="open" @click="open = !open">
      <span class="source-toggle__chev" :class="{ 'source-toggle__chev--open': open }">
        <RightOutlined />
      </span>
      <AppstoreOutlined />
      {{ sources.length }} {{ sources.length === 1 ? "source" : "sources" }}
    </button>

    <div v-if="open" class="source-list">
      <a
        v-for="source in sources"
        :key="source.n"
        class="source-card"
        :class="{ 'source-card--highlight': source.n === highlightN }"
        :href="source.kind === 'web' ? source.url : undefined"
        :target="source.kind === 'web' ? '_blank' : undefined"
        :rel="source.kind === 'web' ? 'noreferrer' : undefined"
        @click.prevent="emit('cite', source.n)"
      >
        <span class="source-idx">{{ source.n }}</span>
        <span class="source-favicon" :class="faviconClass(source)">
          <GlobalOutlined v-if="source.kind === 'web'" />
          <LockOutlined v-else-if="source.kind === 'lock'" />
          <FileOutlined v-else />
        </span>
        <span class="source-body">
          <span class="source-title">{{ source.title }}</span>
          <span class="source-url">{{ source.url }}</span>
          <span class="source-excerpt">{{ source.excerpt }}</span>
        </span>
        <span class="source-open">
          <ExportOutlined v-if="source.kind === 'web'" />
          <RightOutlined v-else />
        </span>
      </a>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from "vue"
import {
  RightOutlined,
  AppstoreOutlined,
  GlobalOutlined,
  LockOutlined,
  FileOutlined,
  ExportOutlined,
} from "@ant-design/icons-vue"

const props = defineProps({
  /** Source objects with { n, kind, title, url, excerpt } */
  sources: { type: Array, default: () => [] },
  /** Citation number to highlight */
  highlightN: { type: Number, default: null },
  /** Whether the source list starts expanded */
  defaultExpanded: { type: Boolean, default: false },
})

const emit = defineEmits(["cite"])

const open = ref(props.defaultExpanded)

watch(
  () => props.highlightN,
  (n) => {
    if (n != null) open.value = true
  },
)

function faviconClass(source) {
  if (source.kind === "web") return "source-favicon--web"
  if (source.kind === "lock") return "source-favicon--lock"
  return ""
}
</script>

<style scoped>
.source-toggle {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 5px 10px 5px 8px;
  border-radius: var(--r-sm);
  background: transparent;
  border: 1px solid var(--line);
  color: var(--ink-3);
  font: 500 12px var(--font-sans);
  cursor: pointer;
  transition: all var(--dur) var(--ease);
}

.source-toggle:hover {
  border-color: var(--line-2);
  color: var(--ink-2);
}

.source-toggle__chev {
  display: inline-flex;
  transition: transform var(--dur) var(--ease);
}

.source-toggle__chev--open {
  transform: rotate(90deg);
}

.source-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 8px;
}

.source-card {
  display: flex;
  gap: 10px;
  padding: 10px 12px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r);
  cursor: pointer;
  text-align: left;
  transition:
    border-color var(--dur) var(--ease),
    background var(--dur) var(--ease);
  align-items: flex-start;
  width: 100%;
  text-decoration: none;
  color: inherit;
}

.source-card--highlight {
  border-color: var(--brand);
  background: var(--brand-tint);
}

.source-idx {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  margin-top: 1px;
  border-radius: 4px;
  background: var(--brand-tint);
  color: var(--brand-3);
  font: 600 10.5px var(--font-mono);
  display: flex;
  align-items: center;
  justify-content: center;
}

.source-favicon {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-2);
  color: var(--ink-3);
  font-size: 12px;
}

.source-favicon--web {
  background: #eef4ff;
  color: #2b5cc4;
}

.source-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.source-title {
  font-size: var(--t-base);
  font-weight: 500;
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.source-url {
  font-size: 11.5px;
  color: var(--ink-4);
  font-family: var(--font-mono);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.source-excerpt {
  font-size: var(--t-sm);
  color: var(--ink-3);
  line-height: 1.5;
  margin-top: 2px;
}

.source-open {
  flex-shrink: 0;
  color: var(--ink-4);
  margin-top: 2px;
}

.source-card:not(.source-card--highlight):hover {
  border-color: var(--line-2);
  background: var(--bg-2);
}
</style>
