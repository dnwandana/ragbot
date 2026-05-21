<script setup>
defineProps({
  /** @type {Array<{ label: string, value: string }>} */
  options: { type: Array, required: true },
  modelValue: { type: String, required: true },
})
const emit = defineEmits(["update:modelValue"])
</script>

<template>
  <div class="vt" role="group">
    <button
      v-for="opt in options"
      :key="opt.value"
      class="vt-btn"
      :class="{ 'vt-btn--active': modelValue === opt.value }"
      :aria-pressed="modelValue === opt.value"
      @click="emit('update:modelValue', opt.value)"
    >
      {{ opt.label }}
    </button>
  </div>
</template>

<style scoped>
.vt {
  display: inline-flex;
  background: var(--bg-2);
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  padding: 3px;
  gap: 2px;
}
.vt-btn {
  padding: 5px 12px;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--ink-3);
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: color var(--dur) var(--ease);
}
.vt-btn:hover {
  color: var(--ink);
}
.vt-btn--active {
  background: var(--surface);
  color: var(--ink);
  font-weight: 600;
  box-shadow: var(--shadow-1);
}
</style>
