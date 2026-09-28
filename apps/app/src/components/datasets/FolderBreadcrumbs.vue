<script setup>
import { ref } from "vue"
import { ChevronRight, House } from "lucide-vue-next"
import { DRAG_TYPE, readDragKeys } from "./itemKeys"

const props = defineProps({
  datasetName: { type: String, required: true },
  breadcrumbs: { type: Array, default: () => [] },
  droppable: { type: Boolean, default: false },
})
const emit = defineEmits(["navigate", "drop"])
const overId = ref(undefined)

/** Accepts only drags that started in this app. A drop from the computer goes to the table. */
function onDragOver(event, id) {
  if (!props.droppable || !Array.from(event.dataTransfer?.types ?? []).includes(DRAG_TYPE)) return
  event.preventDefault?.()
  overId.value = id
}

function onDrop(event, targetId, isCurrent) {
  overId.value = undefined
  if (!props.droppable || isCurrent) return
  const keys = readDragKeys(event.dataTransfer)
  if (!keys) return
  event.preventDefault?.()
  emit("drop", { targetId, keys })
}
</script>

<template>
  <nav class="crumbs" aria-label="Folder path">
    <template v-if="breadcrumbs.length">
      <button
        class="crumb"
        :class="{ 'crumb--over': overId === null }"
        @click="emit('navigate', null)"
        @dragover="onDragOver($event, null)"
        @dragleave="overId = undefined"
        @drop="onDrop($event, null, false)"
      >
        <House :size="13" :stroke-width="1.7" /> {{ datasetName }}
      </button>
      <template v-for="(c, i) in breadcrumbs" :key="c.id">
        <ChevronRight :size="12" :stroke-width="1.8" class="crumb-sep" />
        <span
          v-if="i === breadcrumbs.length - 1"
          class="crumb crumb--current"
          aria-current="page"
          :class="{ 'crumb--invalid': overId === c.id }"
          @dragover="onDragOver($event, c.id)"
          @dragleave="overId = undefined"
          @drop="onDrop($event, c.id, true)"
          >{{ c.name }}</span
        >
        <button
          v-else
          class="crumb"
          :class="{ 'crumb--over': overId === c.id }"
          @click="emit('navigate', c.id)"
          @dragover="onDragOver($event, c.id)"
          @dragleave="overId = undefined"
          @drop="onDrop($event, c.id, false)"
        >
          {{ c.name }}
        </button>
      </template>
    </template>
    <span v-else class="crumb crumb--current" aria-current="page"
      ><House :size="13" :stroke-width="1.7" /> {{ datasetName }}</span
    >
  </nav>
</template>

<style scoped>
.crumbs {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
  margin-bottom: 12px;
  font-size: 13px;
}
.crumb {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 6px;
  border: 1px dashed transparent;
  border-radius: 6px;
  background: none;
  color: var(--ink-2);
  cursor: pointer;
}
.crumb:hover {
  background: var(--bg-2);
  color: var(--ink);
}
.crumb--current {
  color: var(--ink);
  font-weight: 600;
  cursor: default;
}
.crumb--over {
  border-color: var(--brand);
  background: var(--brand-tint);
}
.crumb--invalid {
  border-color: var(--err);
}
.crumb-sep {
  color: var(--ink-4);
}
</style>
