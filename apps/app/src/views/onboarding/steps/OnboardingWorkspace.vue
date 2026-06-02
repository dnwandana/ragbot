<script setup>
import {
  AppstoreOutlined,
  ArrowLeftOutlined,
  LoadingOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons-vue"

const props = defineProps({
  ctx: { type: Object, required: true },
})
const ctx = props.ctx
</script>

<template>
  <div class="ob-head">
    <div class="ob-head-icon"><AppstoreOutlined /></div>
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
          :value="ctx.formData.workspaceName"
          placeholder="Acme workspace"
          autocomplete="off"
          autofocus
          @input="
            (e) => {
              ctx.formData.workspaceName = e.target.value
              ctx.setError('workspace', null)
            }
          "
          @keydown.enter="ctx.formData.workspaceName.trim() && ctx.runAction('workspace')"
        />
      </div>
      <div v-if="ctx.errors.workspace" class="ob-error-text">
        <ExclamationCircleOutlined />
        {{ ctx.errors.workspace }}
      </div>
      <div v-else class="ob-hint">Letters, numbers and spaces.</div>
    </div>
  </div>

  <div class="ob-actions">
    <div class="ob-actions-left">
      <button class="ob-btn ob-btn-ghost" @click="ctx.back()"><ArrowLeftOutlined /> Back</button>
    </div>
    <div class="ob-actions-right">
      <button
        class="ob-btn ob-btn-primary"
        :disabled="!ctx.formData.workspaceName.trim() || ctx.busy === 'workspace'"
        @click="ctx.runAction('workspace')"
      >
        <LoadingOutlined v-if="ctx.busy === 'workspace'" class="ob-spin" />
        Create workspace
      </button>
    </div>
  </div>
</template>
