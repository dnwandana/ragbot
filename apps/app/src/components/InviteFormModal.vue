<script setup>
import { reactive, watch } from "vue"
import { Form, Modal, Input, Select } from "ant-design-vue"

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  roles: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(["submit", "close"])

const formState = reactive({
  email: "",
  role_id: undefined,
})

const rules = {
  email: [
    { required: true, message: "Please enter an email address" },
    { type: "email", message: "Please enter a valid email address" },
  ],
  role_id: [{ required: true, message: "Please select a role" }],
}

const { validate, resetFields } = Form.useForm(formState, rules)

function resetForm() {
  resetFields()
}

watch(
  () => props.visible,
  (val) => {
    if (!val) resetForm()
  },
)

async function handleOk() {
  try {
    await validate()
    emit("submit", { email: formState.email, role_id: formState.role_id })
  } catch {
    // Validation failed — field-level errors are shown by ant-design-vue
  }
}

function handleCancel() {
  emit("close")
}
</script>

<template>
  <Modal
    :open="visible"
    title="Invite Member"
    :confirm-loading="loading"
    @ok="handleOk"
    @cancel="handleCancel"
  >
    <Form :model="formState" :rules="rules" layout="vertical" autocomplete="off">
      <Form.Item label="Email" name="email">
        <Input v-model:value="formState.email" placeholder="Enter email address" />
      </Form.Item>

      <Form.Item label="Role" name="role_id">
        <Select v-model:value="formState.role_id" placeholder="Select a role">
          <Select.Option v-for="role in roles" :key="role.id" :value="role.id">
            {{ role.name }}
          </Select.Option>
        </Select>
      </Form.Item>
    </Form>
  </Modal>
</template>

<style scoped>
:deep(.ant-modal-content) {
  border-radius: var(--radius-lg);
}
:deep(.ant-modal-header) {
  padding: 20px 24px 16px;
  border-bottom: 1px solid var(--line);
}
:deep(.ant-modal-title) {
  font-size: var(--text-md);
  font-weight: 700;
  color: var(--ink);
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
  border-color: var(--line) !important;
  border-radius: var(--radius-sm) !important;
}
:deep(.ant-input:focus),
:deep(.ant-input-focused) {
  border-color: var(--brand) !important;
  box-shadow: 0 0 0 3px rgba(29, 78, 216, 0.1) !important;
}
:deep(.ant-btn-primary) {
  background: var(--brand);
  border-color: var(--brand);
  border-radius: var(--radius-sm);
  height: 40px;
  font-weight: 600;
}
:deep(.ant-btn-primary:hover) {
  background: var(--color-accent-hover);
  border-color: var(--color-accent-hover);
}
</style>
