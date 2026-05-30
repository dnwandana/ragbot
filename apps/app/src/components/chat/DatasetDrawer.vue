<template>
  <div ref="drawerRef" class="dataset-drawer">
    <div class="dataset-drawer__header">
      <span class="dataset-drawer__title">Linked sources</span>
    </div>
    <div class="dataset-drawer__body">
      <p class="dataset-drawer__info">
        This conversation searches
        <strong>{{ count }} linked dataset{{ count === 1 ? "" : "s" }}</strong
        >.
      </p>
      <p class="dataset-drawer__hint">
        To add or remove datasets, edit the conversation from the conversations list.
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue"

defineProps({
  /** Number of datasets linked to this conversation. */
  count: { type: Number, default: 0 },
})

const emit = defineEmits(["close"])

const drawerRef = ref(null)

function onClickOutside(e) {
  if (
    drawerRef.value &&
    !drawerRef.value.contains(e.target) &&
    !e.target.closest("[data-attach]")
  ) {
    emit("close")
  }
}

onMounted(() => document.addEventListener("mousedown", onClickOutside))
onBeforeUnmount(() => document.removeEventListener("mousedown", onClickOutside))
</script>

<style scoped>
.dataset-drawer {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 0;
  width: 300px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-3);
  padding: 8px;
  z-index: 40;
}

.dataset-drawer__header {
  padding: 6px 8px 8px;
  border-bottom: 1px solid var(--line);
  margin-bottom: 8px;
}

.dataset-drawer__title {
  font-size: var(--t-base);
  font-weight: 600;
  color: var(--ink);
}

.dataset-drawer__body {
  padding: 4px 8px 8px;
}

.dataset-drawer__info {
  font-size: var(--t-base);
  color: var(--ink-2);
  margin: 0 0 6px;
  line-height: 1.5;
}

.dataset-drawer__hint {
  font-size: var(--t-sm);
  color: var(--ink-4);
  margin: 0;
  line-height: 1.5;
}
</style>
