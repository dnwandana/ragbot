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
