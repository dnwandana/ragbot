<script setup>
defineProps({
  steps: { type: Array, required: true },
  current: { type: Number, required: true },
  // a-steps derives finished steps from `current`; `done` is kept for API
  // compatibility with callers but is not consumed here.
  done: { type: Object, default: () => ({}) },
})
</script>

<template>
  <a-steps :current="current" size="small" class="ob-steps">
    <a-step v-for="step in steps" :key="step.key" :title="step.label" />
  </a-steps>
</template>

<style scoped>
/* ── Ant Design steps override — scoped to this component ── */
.ob-steps {
  padding: 16px 28px 14px;
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
}

:deep(.ant-steps-item-title) {
  font-size: var(--t-sm);
  font-weight: 500;
  color: var(--ink-3) !important;
  line-height: 1.4;
}

:deep(.ant-steps-item-process .ant-steps-item-title) {
  font-weight: 600;
  color: var(--ink) !important;
}

:deep(.ant-steps-item-finish .ant-steps-item-title) {
  color: var(--ink-3) !important;
}

/* Step icon — done: brand filled; current: brand filled; waiting: muted border */
:deep(.ant-steps-item-process .ant-steps-item-icon) {
  background: var(--brand);
  border-color: var(--brand);
}

:deep(.ant-steps-item-finish .ant-steps-item-icon) {
  background: var(--brand);
  border-color: var(--brand);
}

:deep(.ant-steps-item-finish .ant-steps-item-icon .ant-steps-icon) {
  color: #fff;
}

:deep(.ant-steps-item-wait .ant-steps-item-icon) {
  background: transparent;
  border-color: var(--line);
}

:deep(.ant-steps-item-wait .ant-steps-item-icon .ant-steps-icon) {
  color: var(--ink-4);
}

/* Connector line */
:deep(.ant-steps-item-tail::after) {
  background: var(--line);
  transition: background var(--dur, 0.2s) var(--ease, ease);
}

:deep(.ant-steps-item-finish .ant-steps-item-tail::after) {
  background: var(--brand);
}

/* Keep it compact — labels below icon on narrow cards */
:deep(.ant-steps) {
  flex-wrap: nowrap;
}
</style>
