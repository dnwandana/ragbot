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
 * @param {string} value - New value from the a-input update:value event
 */
function onName(value) {
  emit("update:workspaceName", value)
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
        <a-input
          id="ws-name"
          class="ob-input"
          :class="{ 'is-error': ctx.errors.workspace }"
          :value="props.workspaceName"
          placeholder="Acme workspace"
          autocomplete="off"
          autofocus
          @update:value="onName"
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
        <a-textarea
          id="ws-desc"
          class="ob-input"
          :rows="3"
          :maxlength="240"
          :value="props.workspaceDescription"
          placeholder="A short line about your workspace (optional)"
          @update:value="emit('update:workspaceDescription', $event)"
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

<style scoped>
/*
 * Ant Design input overrides scoped to this step.
 * :deep() targets the inner ant-input element rendered by a-input / a-textarea.
 * Specificity is bumped via .ob-input so these win over Ant defaults
 * without touching the shared onboarding.css.
 */
.ob-input :deep(.ant-input) {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--line-2);
  border-radius: var(--r-sm);
  background: var(--surface);
  font: 400 var(--t-base) / 1.45 var(--font-sans);
  color: var(--ink);
  transition:
    border-color var(--dur) var(--ease),
    box-shadow var(--dur) var(--ease);
  outline: none;
  box-shadow: none;
}

.ob-input :deep(.ant-input::placeholder) {
  color: var(--ink-4);
}

.ob-input :deep(.ant-input:focus),
.ob-input :deep(.ant-input-focused) {
  border-color: var(--brand);
  box-shadow: 0 0 0 3px var(--brand-tint);
}

.ob-input.is-error :deep(.ant-input) {
  border-color: var(--err);
}

.ob-input.is-error :deep(.ant-input:focus) {
  box-shadow: 0 0 0 3px var(--err-bg);
}

/* Wrapper that Ant wraps around a-input */
.ob-input :deep(.ant-input-affix-wrapper),
.ob-input :deep(.ant-input-outlined) {
  width: 100%;
  padding: 0;
  border: none;
  background: transparent;
  box-shadow: none;
}

/* a-textarea uses ant-input directly (no wrapper) */
.ob-input :deep(textarea.ant-input) {
  line-height: 1.55;
  resize: vertical;
}

.ob-input :deep(textarea.ant-input::placeholder) {
  color: var(--ink-4);
}

.ob-input :deep(textarea.ant-input:focus) {
  border-color: var(--brand);
  box-shadow: 0 0 0 3px var(--brand-tint);
}
</style>
