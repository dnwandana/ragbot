<template>
  <a-modal
    :open="visible"
    :title="agent ? 'Edit Agent' : 'New Agent'"
    @cancel="$emit('close')"
    :footer="null"
    width="640px"
  >
    <a-form :model="form" layout="vertical" @finish="onFinish">
      <a-form-item
        v-if="!agent?.is_system"
        label="Name"
        name="name"
        :rules="[{ required: !agent, max: 255 }]"
      >
        <a-input v-model:value="form.name" placeholder="Legal Expert" />
      </a-form-item>
      <a-form-item label="Description">
        <a-input v-model:value="form.description" placeholder="Optional description" />
      </a-form-item>
      <a-form-item label="System Prompt" name="system_prompt" :rules="[{ required: !agent }]">
        <a-textarea
          v-model:value="form.system_prompt"
          :rows="6"
          placeholder="You are a helpful assistant..."
        />
      </a-form-item>
      <a-form-item label="Model">
        <a-select v-model:value="form.model_config.model">
          <a-select-option value="openai/gpt-4.1">GPT-4.1</a-select-option>
          <a-select-option value="openai/gpt-4.1-mini">GPT-4.1 Mini</a-select-option>
          <a-select-option value="anthropic/claude-sonnet-4-6">Claude Sonnet 4.6</a-select-option>
          <a-select-option value="anthropic/claude-haiku-4-5-20251001"
            >Claude Haiku 4.5</a-select-option
          >
          <a-select-option value="google/gemini-2.0-flash-001">Gemini 2.0 Flash</a-select-option>
        </a-select>
      </a-form-item>
      <a-form-item label="Temperature">
        <a-slider
          v-model:value="form.model_config.temperature"
          :min="0"
          :max="2"
          :step="0.1"
          :marks="{ 0: '0', 1: '1', 2: '2' }"
        />
      </a-form-item>
      <a-form-item label="Max Tokens">
        <a-input-number
          v-model:value="form.model_config.max_tokens"
          :min="256"
          :max="32768"
          :step="256"
          style="width: 100%"
        />
      </a-form-item>
      <a-button type="primary" html-type="submit" block>
        {{ agent ? "Save Changes" : "Create Agent" }}
      </a-button>
    </a-form>
  </a-modal>
</template>

<script setup>
import { reactive, watch } from "vue"

const props = defineProps({ visible: Boolean, agent: Object })
const emit = defineEmits(["close", "submit"])

const DEFAULT_MODEL_CONFIG = Object.freeze({
  model: "openai/gpt-4.1",
  temperature: 0.7,
  top_p: 1,
  max_tokens: 4096,
})

const form = reactive({
  name: "",
  description: "",
  system_prompt: "",
  model_config: { ...DEFAULT_MODEL_CONFIG },
})

watch(
  () => props.agent,
  (a) => {
    if (a) {
      form.name = a.name || ""
      form.description = a.description || ""
      form.system_prompt = a.system_prompt || ""
      const mc =
        typeof a.model_config === "string" ? JSON.parse(a.model_config) : a.model_config || {}
      form.model_config = {
        model: mc.model || DEFAULT_MODEL_CONFIG.model,
        temperature: mc.temperature ?? DEFAULT_MODEL_CONFIG.temperature,
        top_p: mc.top_p ?? DEFAULT_MODEL_CONFIG.top_p,
        max_tokens: mc.max_tokens ?? DEFAULT_MODEL_CONFIG.max_tokens,
      }
    } else {
      form.name = ""
      form.description = ""
      form.system_prompt = ""
      form.model_config = { ...DEFAULT_MODEL_CONFIG }
    }
  },
  { immediate: true },
)

function onFinish() {
  const payload = {
    system_prompt: form.system_prompt,
    description: form.description,
    model_config: { ...form.model_config },
  }
  if (!props.agent?.is_system) payload.name = form.name
  emit("submit", payload)
}
</script>

<style scoped>
:deep(.ant-modal-content) {
  border-radius: var(--radius-lg);
}
:deep(.ant-modal-header) {
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
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
:deep(.ant-input-textarea textarea),
:deep(.ant-select-selector),
:deep(.ant-input-number) {
  background: var(--color-bg) !important;
  border-color: var(--line) !important;
  border-radius: var(--radius-sm) !important;
  font-size: var(--text-base) !important;
}
:deep(.ant-input:focus),
:deep(.ant-input-focused),
:deep(.ant-select-focused .ant-select-selector) {
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
