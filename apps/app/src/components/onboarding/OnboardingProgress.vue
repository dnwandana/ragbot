<script setup>
defineProps({
  steps: { type: Array, required: true },
  current: { type: Number, required: true },
  done: { type: Object, required: true },
})
</script>

<template>
  <div class="ob-prog-bar">
    <div class="ob-prog-barhead">
      <span class="ob-prog-step">Step {{ current + 1 }} of {{ steps.length }}</span>
      <span class="ob-prog-name">{{ steps[current].label }}</span>
    </div>
    <div class="ob-prog-track">
      <div
        v-for="(step, i) in steps"
        :key="step.key"
        class="ob-prog-seg"
        :class="{
          'is-done': done.has(i) && i !== current,
          'is-current': i === current,
        }"
      />
    </div>
  </div>
</template>
