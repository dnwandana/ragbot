<template>
  <span
    class="cite-ref"
    :class="{ 'cite-ref--active': hover }"
    :title="title || `Source ${n}`"
    @mouseenter="hover = true"
    @mouseleave="hover = false"
    @click.stop="emit('click', n)"
    >{{ n }}</span
  >
</template>

<script setup>
import { ref } from "vue"

defineProps({
  /** Citation number */
  n: { type: Number, required: true },
  /** Source title for tooltip */
  title: { type: String, default: "" },
})

const emit = defineEmits(["click"])
const hover = ref(false)
</script>

<style scoped>
.cite-ref {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 17px;
  height: 17px;
  padding: 0 4px;
  margin-left: 2px;
  border-radius: 4px;
  background: var(--brand-tint);
  color: var(--brand-3);
  font: 600 10.5px var(--font-mono);
  vertical-align: 1px;
  cursor: pointer;
  border: 1px solid rgba(255, 107, 53, 0.2);
  transition:
    background var(--dur) var(--ease),
    color var(--dur) var(--ease);
  position: relative;
  top: -1px;
}

.cite-ref:hover,
.cite-ref--active {
  background: var(--brand);
  color: #fff;
}
</style>
