<template>
  <div v-if="sources.length > 0" class="source-citations">
    <button class="source-toggle" @click="emit('open-panel')">
      <AppstoreOutlined />
      {{ sources.length }} {{ sources.length === 1 ? "source" : "sources" }}
    </button>
  </div>
</template>

<script setup>
import { AppstoreOutlined } from "@ant-design/icons-vue"

defineProps({
  /** Source objects — only length is used; detail renders in the side panel */
  sources: { type: Array, default: () => [] },
})

const emit = defineEmits(["open-panel"])
</script>

<style scoped>
.source-citations {
  margin-top: 12px;
}

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
</style>
