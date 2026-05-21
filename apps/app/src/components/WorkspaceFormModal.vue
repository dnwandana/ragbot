<template>
  <a-modal
    :open="visible"
    :title="workspace ? 'Edit Workspace' : 'New Workspace'"
    @cancel="$emit('close')"
    :footer="null"
  >
    <a-form :model="form" layout="vertical" @finish="onFinish">
      <a-form-item label="Name" name="name" :rules="[{ required: true, max: 100 }]">
        <a-input v-model:value="form.name" placeholder="My Workspace" />
      </a-form-item>
      <a-button type="primary" html-type="submit" block>
        {{ workspace ? "Save Changes" : "Create Workspace" }}
      </a-button>
    </a-form>
  </a-modal>
</template>

<script setup>
import { reactive, watch } from "vue"

const props = defineProps({ visible: Boolean, workspace: Object })
const emit = defineEmits(["close", "submit"])

const form = reactive({ name: "" })

watch(
  () => props.workspace,
  (ws) => {
    form.name = ws?.name ?? ""
  },
  { immediate: true },
)

/** Submit the form with the current name value. */
function onFinish() {
  emit("submit", { name: form.name })
}
</script>

<style scoped>
:deep(.ant-modal-content) {
  border-radius: var(--radius-lg);
}
:deep(.ant-modal-header) {
  padding: 20px 24px 16px;
  border-bottom: 1px solid var(--color-border);
}
:deep(.ant-modal-title) {
  font-size: var(--text-md);
  font-weight: 700;
  color: var(--color-text-primary);
}
:deep(.ant-modal-body) {
  padding: 20px 24px 24px;
}
:deep(.ant-form-item-label > label) {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-secondary);
}
:deep(.ant-input),
:deep(.ant-input-textarea textarea) {
  background: var(--color-bg) !important;
  border-color: var(--color-border) !important;
  border-radius: var(--radius-sm) !important;
}
:deep(.ant-input:focus),
:deep(.ant-input-focused) {
  border-color: var(--color-accent) !important;
  box-shadow: 0 0 0 3px rgba(29, 78, 216, 0.1) !important;
}
:deep(.ant-btn-primary) {
  background: var(--color-accent);
  border-color: var(--color-accent);
  border-radius: var(--radius-sm);
  height: 40px;
  font-weight: 600;
}
:deep(.ant-btn-primary:hover) {
  background: var(--color-accent-hover);
  border-color: var(--color-accent-hover);
}
</style>
