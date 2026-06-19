<script setup>
import { computed } from "vue"
import { CircleCheck, CircleAlert } from "lucide-vue-next"

const props = defineProps({
  /** Toast object with `msg` (string) and `tone` ('ok'|'err'). Null hides the toast. */
  toast: { type: Object, default: null },
})

/**
 * Maps the internal tone value to an Ant Design Alert type.
 * @type {import("vue").ComputedRef<'success'|'error'>}
 */
const alertType = computed(() => (props.toast?.tone === "err" ? "error" : "success"))
</script>

<template>
  <Transition name="ob-toast-fade">
    <a-alert
      v-if="toast"
      class="ob-toast"
      :type="alertType"
      :message="toast.msg"
      :show-icon="true"
      banner
    >
      <template #icon>
        <CircleCheck v-if="toast.tone === 'ok'" :size="16" />
        <CircleAlert v-else :size="16" />
      </template>
    </a-alert>
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

/* Keep the toast visually consistent with the original design */
:deep(.ob-toast.ant-alert) {
  position: fixed;
  bottom: 28px;
  left: 50%;
  transform: translateX(-50%);
  min-width: 220px;
  max-width: 420px;
  border-radius: var(--r);
  font-size: var(--t-sm);
  font-weight: 500;
  padding: 9px 14px;
  z-index: 9999;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}
</style>
