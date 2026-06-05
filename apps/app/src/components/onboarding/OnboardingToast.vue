<script setup>
import { CircleCheck, CircleAlert } from "lucide-vue-next"

defineProps({
  toast: { type: Object, default: null },
})
</script>

<template>
  <Transition name="ob-toast-fade">
    <div v-if="toast" class="ob-toast" :class="{ 'ob-toast-err': toast.tone === 'err' }">
      <CircleCheck v-if="toast.tone === 'ok'" :size="16" />
      <CircleAlert v-else :size="16" />
      <span>{{ toast.msg }}</span>
    </div>
  </Transition>
</template>

<style scoped>
.ob-toast-fade-enter-active,
.ob-toast-fade-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.ob-toast-fade-enter-from,
.ob-toast-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(8px);
}
</style>
