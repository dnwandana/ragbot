<script setup>
import { computed } from "vue"
import { Bot, ArrowLeft, LoaderCircle, CircleAlert } from "lucide-vue-next"
import { AGENT_TEMPLATES, nameForTemplate } from "../agentTemplates.js"

const props = defineProps({
  ctx: { type: Object, required: true },
  agentName: { type: String, default: "" },
  agentTemplate: { type: String, default: "" },
  agentPrompt: { type: String, default: "" },
})
const emit = defineEmits(["update:agentName", "update:agentTemplate", "update:agentPrompt"])
const ctx = props.ctx

/**
 * Option list for the template a-select. Each entry carries a label for the
 * dropdown display and a value matching the template key.
 * @type {import("vue").ComputedRef<{ value: string, label: string }[]>}
 */
const templateOptions = computed(() =>
  AGENT_TEMPLATES.map((tpl) => ({ value: tpl.key, label: tpl.label })),
)

/**
 * Handle a-select's @change event: look up the full template object, then emit
 * template key, prompt, and (via nameForTemplate) the resolved agent name.
 * @param {string} key - The selected template key emitted by a-select
 */
function onTemplateChange(key) {
  const tpl = AGENT_TEMPLATES.find((t) => t.key === key)
  if (!tpl) return
  emit("update:agentTemplate", tpl.key)
  emit("update:agentPrompt", tpl.prompt)
  emit("update:agentName", nameForTemplate(props.agentName, tpl))
}

/**
 * Emit the new agent name and clear any prior validation error.
 * @param {string} value - New value emitted by a-input's update:value event
 */
function onName(value) {
  emit("update:agentName", value)
  ctx.setError("agent", null)
}
</script>

<template>
  <div class="ob-head">
    <div class="ob-head-icon"><Bot :size="16" /></div>
    <div class="ob-eyebrow">Step 4 · Optional</div>
    <h1 class="ob-title">Meet your first agent</h1>
    <p class="ob-subtitle">
      An agent is your knowledge base with a job and a personality. Pick a template to see how one
      is built — everything stays editable.
    </p>
  </div>

  <div class="ob-body-inner">
    <div class="ob-field">
      <label class="ob-label" for="ag-name">Agent name</label>
      <a-input
        id="ag-name"
        :value="props.agentName"
        placeholder="e.g. Support Sidekick"
        :status="ctx.errors.agent ? 'error' : ''"
        autofocus
        @update:value="onName"
      />
      <div v-if="ctx.errors.agent" class="ob-error-text">
        <CircleAlert :size="16" /> {{ ctx.errors.agent }}
      </div>
    </div>

    <div class="ob-field">
      <label class="ob-label">Start from a template</label>
      <a-select
        :value="props.agentTemplate || undefined"
        :options="templateOptions"
        placeholder="Choose a template…"
        class="ob-tpl-select"
        @change="onTemplateChange"
      />
    </div>

    <div class="ob-field">
      <label class="ob-label">System prompt</label>
      <a-textarea
        :value="props.agentPrompt"
        :rows="5"
        placeholder="e.g. You are a knowledge assistant. Answer only from the indexed sources and cite the document for every claim…"
        @update:value="(v) => emit('update:agentPrompt', v)"
      />
      <div class="ob-hint">
        This is your agent's job description. Edit freely — the template is just a head start.
      </div>
    </div>
  </div>

  <div class="ob-actions">
    <div class="ob-actions-left">
      <button class="ob-btn ob-btn-ghost" @click="ctx.back()"><ArrowLeft :size="16" /> Back</button>
    </div>
    <div class="ob-actions-right">
      <button class="ob-btn ob-btn-secondary" @click="ctx.skip()">Skip for now</button>
      <button
        class="ob-btn ob-btn-primary"
        :disabled="!props.agentName.trim() || ctx.busy === 'agent'"
        @click="ctx.runAction('agent')"
      >
        <LoaderCircle v-if="ctx.busy === 'agent'" class="ob-spin" :size="16" />
        Create agent
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Make the template select full-width to match other ob-field controls */
.ob-tpl-select {
  width: 100%;
}

/* Bump specificity so Ant's input/textarea borders harmonise with onboarding card */
:deep(.ob-tpl-select .ant-select-selector) {
  border-radius: var(--ob-radius, 8px) !important;
}

:deep(.ant-input),
:deep(.ant-input-affix-wrapper) {
  border-radius: var(--ob-radius, 8px);
}

:deep(.ant-input-textarea textarea) {
  border-radius: var(--ob-radius, 8px);
}
</style>
