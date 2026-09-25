<script setup>
import Chart from "chart.js/auto"
import { onBeforeUnmount, onMounted, ref, watch } from "vue"

const props = defineProps({
  spec: { type: Object, default: null },
})
const emit = defineEmits(["ready"])

const canvasRef = ref(null)
let chart = null

/** Destroy the previous Chart instance, then build one from the current spec. */
const render = () => {
  if (chart) {
    chart.destroy()
    chart = null
  }
  if (!props.spec || !canvasRef.value) return
  chart = new Chart(canvasRef.value, {
    type: props.spec.type,
    data: props.spec.data,
    options: { responsive: true, maintainAspectRatio: false, ...props.spec.options },
  })
  emit("ready")
}

onMounted(render)
// `flush: "post"` so the canvas exists in the DOM before the rebuild runs.
watch(() => props.spec, render, { deep: true, flush: "post" })
onBeforeUnmount(() => chart?.destroy())
</script>

<template>
  <div v-if="props.spec" class="chart-card">
    <canvas ref="canvasRef"></canvas>
  </div>
</template>

<style scoped>
.chart-card {
  position: relative;
  height: 320px;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: var(--r);
  background: var(--surface);
}
</style>
