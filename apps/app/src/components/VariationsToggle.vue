<script setup>
import { computed } from "vue"

const props = defineProps({
  /** @type {Array<{ label: string, value: string }>} */
  options: { type: Array, required: true },
  modelValue: { type: String, required: true },
})
const emit = defineEmits(["update:modelValue"])

/** a-segmented expects { label, value } — already our shape. */
const segOptions = computed(() => props.options)

/**
 * Relay segmented selection as the v-model update event.
 * @param {string} value - newly selected option value
 */
function onChange(value) {
  emit("update:modelValue", value)
}
</script>

<template>
  <a-segmented class="vt" :value="modelValue" :options="segOptions" @change="onChange" />
</template>

<style scoped>
.vt :deep(.ant-segmented) {
  background: var(--bg-2);
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  padding: 3px;
}
.vt :deep(.ant-segmented-item) {
  color: var(--ink-3);
  font-size: 12.5px;
  font-weight: 500;
  border-radius: 4px;
  transition: color var(--dur) var(--ease);
}
.vt :deep(.ant-segmented-item:hover) {
  color: var(--ink);
}
.vt :deep(.ant-segmented-item-selected) {
  background: var(--surface);
  color: var(--ink);
  font-weight: 600;
  box-shadow: var(--shadow-1);
}
</style>
