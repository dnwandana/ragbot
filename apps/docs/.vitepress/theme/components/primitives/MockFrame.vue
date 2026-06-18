<script setup>
defineProps({
  label: { type: String, default: "" },
  caption: { type: String, default: "" },
})
</script>

<template>
  <div class="mock">
    <div class="mock__bar">
      <div class="mock__dots"><i /><i /><i /></div>
      <span class="mock__label">{{ label }}</span>
    </div>
    <div class="mock__body"><slot /></div>
  </div>
  <p v-if="caption" class="mock__caption">{{ caption }}</p>
</template>
