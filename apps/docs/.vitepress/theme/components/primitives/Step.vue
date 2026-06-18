<script setup>
defineProps({ title: { type: String, required: true } })
</script>

<template>
  <div class="step">
    <div class="step__title">{{ title }}</div>
    <div class="step__body"><slot /></div>
  </div>
</template>
