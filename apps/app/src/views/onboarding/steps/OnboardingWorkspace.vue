<script setup>
import { LayoutGrid, ArrowLeft, LoaderCircle, CircleAlert } from "lucide-vue-next"

const props = defineProps({
  ctx: { type: Object, required: true },
  workspaceName: { type: String, default: "" },
  workspaceDescription: { type: String, default: "" },
})
const emit = defineEmits(["update:workspaceName", "update:workspaceDescription"])
const ctx = props.ctx

/**
 * Emit the new workspace name and clear any prior validation error.
 * @param {Event} e - Input event from the workspace-name field
 */
function onName(e) {
  emit("update:workspaceName", e.target.value)
  ctx.setError("workspace", null)
}
</script>

<template>
  <div class="ob-head">
    <div class="ob-head-icon"><LayoutGrid :size="16" /></div>
    <div class="ob-eyebrow">Step 1 · Required</div>
    <h1 class="ob-title">Create your workspace</h1>
    <p class="ob-subtitle">
      This is the home for your team, knowledge sources, and agents. You can rename it later.
    </p>
  </div>

  <div class="ob-body-inner">
    <div class="ob-field">
      <label class="ob-label" for="ws-name">Workspace name</label>
      <div class="ob-input-wrap">
        <input
          id="ws-name"
          class="ob-input"
          :class="{ 'is-error': ctx.errors.workspace }"
          :value="props.workspaceName"
          placeholder="Acme workspace"
          autocomplete="off"
          autofocus
          @input="onName"
          @keydown.enter="props.workspaceName.trim() && ctx.runAction('workspace')"
        />
      </div>
      <div v-if="ctx.errors.workspace" class="ob-error-text">
        <CircleAlert :size="16" />
        {{ ctx.errors.workspace }}
      </div>
      <div v-else class="ob-hint">Letters, numbers and spaces.</div>
    </div>
    <div class="ob-field">
      <label class="ob-label" for="ws-desc">Description</label>
      <div class="ob-input-wrap">
        <textarea
          id="ws-desc"
          class="ob-input"
          rows="3"
          maxlength="240"
          :value="props.workspaceDescription"
          placeholder="A short line about your workspace (optional)"
          @input="emit('update:workspaceDescription', $event.target.value)"
        />
      </div>
    </div>
  </div>

  <div class="ob-actions">
    <div class="ob-actions-left">
      <button class="ob-btn ob-btn-ghost" @click="ctx.back()"><ArrowLeft :size="16" /> Back</button>
    </div>
    <div class="ob-actions-right">
      <button
        class="ob-btn ob-btn-primary"
        :disabled="!props.workspaceName.trim() || ctx.busy === 'workspace'"
        @click="ctx.runAction('workspace')"
      >
        <LoaderCircle v-if="ctx.busy === 'workspace'" class="ob-spin" :size="16" />
        Create workspace
      </button>
    </div>
  </div>
</template>
