<script setup>
import { Bot, ArrowLeft, LoaderCircle, Check, CircleAlert } from "lucide-vue-next"
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
 * Apply a template: select it, replace the prompt, and update the agent
 * name via the shared fill rule (user-typed names are preserved). The parent
 * owns formData, so each field change is emitted rather than mutated.
 * @param {{ key: string, label: string, name: string, prompt: string }} tpl - Picked template
 */
function pickTemplate(tpl) {
  emit("update:agentTemplate", tpl.key)
  emit("update:agentPrompt", tpl.prompt)
  emit("update:agentName", nameForTemplate(props.agentName, tpl))
}

/**
 * Emit the new agent name and clear any prior validation error.
 * @param {Event} e - Input event from the agent-name field
 */
function onName(e) {
  emit("update:agentName", e.target.value)
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
      <input
        id="ag-name"
        class="ob-input"
        :class="{ 'is-error': ctx.errors.agent }"
        :value="props.agentName"
        placeholder="e.g. Support Sidekick"
        autofocus
        @input="onName"
      />
      <div v-if="ctx.errors.agent" class="ob-error-text">
        <CircleAlert :size="16" /> {{ ctx.errors.agent }}
      </div>
    </div>

    <div class="ob-field">
      <label class="ob-label">Start from a template</label>
      <div class="ob-tpl-grid">
        <button
          v-for="tpl in AGENT_TEMPLATES"
          :key="tpl.key"
          class="ob-tpl"
          :class="{ 'is-active': props.agentTemplate === tpl.key }"
          @click="pickTemplate(tpl)"
        >
          <span class="ob-tpl-label">{{ tpl.label }}</span>
          <span class="ob-tpl-desc">{{ tpl.desc }}</span>
          <span v-if="props.agentTemplate === tpl.key" class="ob-tpl-check">
            <Check :size="16" />
          </span>
        </button>
      </div>
    </div>

    <div class="ob-field">
      <label class="ob-label">System prompt</label>
      <textarea
        class="ob-textarea"
        :value="props.agentPrompt"
        rows="5"
        placeholder="e.g. You are a knowledge assistant. Answer only from the indexed sources and cite the document for every claim…"
        @input="(e) => emit('update:agentPrompt', e.target.value)"
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
