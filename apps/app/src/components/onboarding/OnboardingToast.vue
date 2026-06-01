<script setup>
import { CheckCircleOutlined, ExclamationCircleOutlined } from "@ant-design/icons-vue"

defineProps({
  toast: { type: Object, default: null },
})
</script>

<template>
  <Transition name="ob-toast-fade">
    <div v-if="toast" class="ob-toast" :class="{ 'ob-toast-err': toast.tone === 'err' }">
      <CheckCircleOutlined v-if="toast.tone === 'ok'" />
      <ExclamationCircleOutlined v-else />
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
