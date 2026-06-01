<script setup>
import {
  RobotOutlined,
  ArrowLeftOutlined,
  LoadingOutlined,
  CheckOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons-vue"
import { AGENT_TEMPLATES } from "../agentTemplates.js"

const props = defineProps({
  ctx: { type: Object, required: true },
})
const ctx = props.ctx

/**
 * @param {{ key: string, label: string, prompt: string }} tpl
 */
function pickTemplate(tpl) {
  ctx.formData.agentTemplate = tpl.key
  ctx.formData.agentPrompt = tpl.prompt
  if (tpl.key !== "blank" && !ctx.formData.agentName.trim()) {
    ctx.formData.agentName = tpl.label
  }
}
</script>

<template>
  <div class="ob-head">
    <div class="ob-head-icon"><RobotOutlined /></div>
    <div class="ob-eyebrow">Step 4 · Optional</div>
    <h1 class="ob-title">Create your first agent</h1>
    <p class="ob-subtitle">
      An agent is a saved persona with its own instructions. Start from a template or a blank
      prompt.
    </p>
  </div>

  <div class="ob-body-inner">
    <div class="ob-field">
      <label class="ob-label" for="ag-name">Agent name</label>
      <input
        id="ag-name"
        class="ob-input"
        :class="{ 'is-error': ctx.errors.agent }"
        :value="ctx.formData.agentName"
        placeholder="Knowledge assistant"
        autofocus
        @input="
          (e) => {
            ctx.formData.agentName = e.target.value
            ctx.setError('agent', null)
          }
        "
      />
      <div v-if="ctx.errors.agent" class="ob-error-text">
        <ExclamationCircleOutlined /> {{ ctx.errors.agent }}
      </div>
    </div>

    <div class="ob-field">
      <label class="ob-label">Start from a template</label>
      <div class="ob-tpl-grid">
        <button
          v-for="tpl in AGENT_TEMPLATES"
          :key="tpl.key"
          class="ob-tpl"
          :class="{ 'is-active': ctx.formData.agentTemplate === tpl.key }"
          @click="pickTemplate(tpl)"
        >
          <span class="ob-tpl-label">{{ tpl.label }}</span>
          <span class="ob-tpl-desc">{{ tpl.desc }}</span>
          <span v-if="ctx.formData.agentTemplate === tpl.key" class="ob-tpl-check">
            <CheckOutlined />
          </span>
        </button>
      </div>
    </div>

    <div class="ob-field">
      <label class="ob-label">System prompt</label>
      <textarea
        class="ob-textarea"
        :value="ctx.formData.agentPrompt"
        rows="5"
        placeholder="e.g. You are a knowledge assistant. Answer only from the indexed sources and cite the document for every claim…"
        @input="(e) => (ctx.formData.agentPrompt = e.target.value)"
      />
      <div class="ob-hint">Edit freely — the template is just a starting point.</div>
    </div>
  </div>

  <div class="ob-actions">
    <div class="ob-actions-left">
      <button class="ob-btn ob-btn-ghost" @click="ctx.back()"><ArrowLeftOutlined /> Back</button>
    </div>
    <div class="ob-actions-right">
      <button class="ob-btn ob-btn-secondary" @click="ctx.skip()">Skip for now</button>
      <button
        class="ob-btn ob-btn-primary"
        :disabled="!ctx.formData.agentName.trim() || ctx.busy === 'agent'"
        @click="ctx.runAction('agent')"
      >
        <LoadingOutlined v-if="ctx.busy === 'agent'" class="ob-spin" />
        Create agent
      </button>
    </div>
  </div>
</template>
