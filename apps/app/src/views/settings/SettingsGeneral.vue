<!-- apps/app/src/views/settings/SettingsGeneral.vue -->
<script setup>
import { ref, computed, watch } from "vue"
import { useRouter } from "vue-router"
import { message, Modal } from "ant-design-vue"
import { useWorkspacesStore } from "@/stores/workspaces"
import { usePermissions } from "@/composables/usePermissions"

const props = defineProps({
  workspaceId: { type: String, required: true },
})

const router = useRouter()
const workspacesStore = useWorkspacesStore()
const { can } = usePermissions()

const canEdit = computed(() => can("workspace:update"))
const canDelete = computed(() => can("workspace:delete"))

const saved = computed(() => workspacesStore.currentWorkspace)
const draft = ref({ name: "", description: "" })
const saving = ref(false)

watch(
  saved,
  (ws) => {
    if (ws) draft.value = { name: ws.name ?? "", description: ws.description ?? "" }
  },
  { immediate: true },
)

const dirty = computed(
  () =>
    draft.value.name !== (saved.value?.name ?? "") ||
    draft.value.description !== (saved.value?.description ?? ""),
)

async function handleSave() {
  if (!draft.value.name.trim()) {
    message.error("Workspace name can't be empty.")
    return
  }
  saving.value = true
  try {
    await workspacesStore.updateWorkspace(props.workspaceId, {
      name: draft.value.name.trim(),
      description: draft.value.description.trim() || null,
    })
    message.success("Workspace settings saved.")
  } finally {
    saving.value = false
  }
}

function handleDiscard() {
  draft.value = { name: saved.value?.name ?? "", description: saved.value?.description ?? "" }
}

function handleDeleteWorkspace() {
  Modal.confirm({
    title: "Delete workspace",
    content: `Every conversation, source, and membership in "${saved.value?.name}" will be permanently deleted. This can't be undone.`,
    okText: "Delete workspace",
    okType: "danger",
    cancelText: "Cancel",
    onOk: async () => {
      try {
        await workspacesStore.deleteWorkspace(props.workspaceId)
        message.success("Workspace deleted.")
        router.push("/workspaces")
      } catch {
        // HTTP client already showed message.error()
      }
    },
  })
}
</script>

<template>
  <div class="section-wrap">
    <!-- Read-only banner -->
    <div v-if="!canEdit" class="readonly-banner">
      <svg
        width="15"
        height="15"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        stroke-width="1.7"
      >
        <circle cx="8" cy="8" r="6" />
        <path d="M8 6v4M8 4v.5" />
      </svg>
      You don't have permission to edit workspace settings.
    </div>

    <div class="section-hd">
      <div class="section-title">General</div>
      <div class="section-sub">How this workspace appears to its members.</div>
    </div>

    <div class="settings-card">
      <div class="card-row">
        <div class="row-label">
          <div class="label-text">Workspace name</div>
          <div class="label-hint">Shown in the sidebar and on invitations.</div>
        </div>
        <div class="row-control">
          <a-input
            v-model:value="draft.name"
            placeholder="Workspace name"
            :disabled="!canEdit"
            class="field-input"
          />
        </div>
      </div>
      <div class="card-row card-row--last">
        <div class="row-label">
          <div class="label-text">Description</div>
          <div class="label-hint">A short note about what this workspace is for.</div>
        </div>
        <div class="row-control">
          <a-textarea
            v-model:value="draft.description"
            placeholder="Optional description…"
            :rows="3"
            :maxlength="240"
            :disabled="!canEdit"
            class="field-input"
          />
        </div>
      </div>
    </div>

    <div v-if="canEdit" class="section-actions">
      <span v-if="dirty" class="dirty-hint">You have unsaved changes.</span>
      <button class="btn-ghost" :disabled="!dirty || saving" @click="handleDiscard">Discard</button>
      <button class="btn-primary" :disabled="!dirty || saving" @click="handleSave">
        {{ saving ? "Saving…" : "Save changes" }}
      </button>
    </div>

    <!-- Danger zone -->
    <div v-if="canDelete" class="danger-zone">
      <div class="danger-zone__body">
        <div>
          <div class="danger-zone__title">Delete this workspace</div>
          <div class="danger-zone__desc">
            Permanently removes the workspace, all conversations, datasets, agents, and members.
            This cannot be undone.
          </div>
        </div>
        <button class="btn-danger" @click="handleDeleteWorkspace">Delete workspace</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.section-wrap {
  padding: 28px 36px 60px;
  max-width: 720px;
}

.readonly-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  margin-bottom: 18px;
  background: var(--brand-tint);
  border: 1px solid var(--color-accent-border);
  border-radius: var(--r);
  font-size: var(--t-sm);
  color: var(--brand-3);
}

.section-hd {
  margin-bottom: 14px;
}
.section-title {
  font-size: var(--t-md);
  font-weight: 600;
  color: var(--ink);
  margin-bottom: 3px;
}
.section-sub {
  font-size: var(--t-sm);
  color: var(--ink-3);
}

.settings-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r);
  box-shadow: var(--shadow-1);
  overflow: hidden;
}

.card-row {
  display: flex;
  gap: 20px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--line);
  align-items: flex-start;
}

.card-row--last {
  border-bottom: none;
}

.row-label {
  width: 160px;
  flex-shrink: 0;
  padding-top: 4px;
}
.label-text {
  font-size: var(--t-base);
  font-weight: 500;
  color: var(--ink);
}
.label-hint {
  font-size: var(--t-xs);
  color: var(--ink-3);
  margin-top: 2px;
  line-height: 1.4;
}
.row-control {
  flex: 1;
}
.field-input {
  width: 100%;
}

.section-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 14px;
  justify-content: flex-end;
}

.dirty-hint {
  font-size: var(--t-sm);
  color: var(--ink-3);
  margin-right: auto;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  padding: 7px 16px;
  background: var(--brand);
  color: #fff;
  border: none;
  border-radius: var(--r-sm);
  font-size: var(--t-base);
  font-weight: 500;
  cursor: pointer;
}
.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn-primary:not(:disabled):hover {
  background: var(--brand-2);
}

.btn-ghost {
  display: inline-flex;
  align-items: center;
  padding: 7px 16px;
  background: transparent;
  color: var(--ink-2);
  border: 1px solid var(--line-2);
  border-radius: var(--r-sm);
  font-size: var(--t-base);
  cursor: pointer;
}
.btn-ghost:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn-ghost:not(:disabled):hover {
  border-color: var(--ink-2);
}

.danger-zone {
  margin-top: 24px;
  background: var(--surface);
  border: 1px solid var(--err-border);
  border-radius: var(--r);
  box-shadow: var(--shadow-1);
}

.danger-zone__body {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 20px;
}

.danger-zone__title {
  font-size: var(--t-base);
  font-weight: 600;
  color: var(--err);
}
.danger-zone__desc {
  font-size: var(--t-sm);
  color: var(--ink-3);
  margin-top: 3px;
  line-height: 1.5;
  max-width: 480px;
}

.btn-danger {
  display: inline-flex;
  align-items: center;
  padding: 7px 14px;
  background: var(--err);
  color: #fff;
  border: none;
  border-radius: var(--r-sm);
  font-size: var(--t-base);
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
}
.btn-danger:hover {
  background: var(--err-2);
}
</style>
