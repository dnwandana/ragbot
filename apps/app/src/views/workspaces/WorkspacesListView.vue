<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">My Workspaces</h1>
        <p class="page-subtitle">Select a workspace to get started</p>
      </div>
      <button class="btn-primary" @click="openCreateModal">+ New Workspace</button>
    </div>

    <a-skeleton v-if="loading && !workspaces.length" active :paragraph="{ rows: 4 }" />

    <div v-else-if="!workspaces.length" class="empty-state">
      <div class="empty-icon">🏢</div>
      <h3 class="empty-title">No workspaces yet</h3>
      <p class="empty-text">Create your first workspace to start organising your knowledge bases.</p>
      <button class="btn-primary" @click="openCreateModal">Create workspace</button>
    </div>

    <div v-else class="ws-grid">
      <div
        v-for="ws in workspaces"
        :key="ws.id"
        class="ws-card"
        :class="{ 'ws-card--owner': ws.role_name === 'Owner' }"
        @click="$router.push(`/workspaces/${ws.id}`)"
      >
        <div class="ws-card__icon">🏢</div>
        <div class="ws-card__name">{{ ws.name }}</div>
        <div class="ws-card__meta">{{ ws.member_count || 1 }} member{{ ws.member_count !== 1 ? 's' : '' }}</div>
        <div class="ws-card__footer">
          <span class="badge" :class="ws.role_name === 'Owner' ? 'badge--accent' : 'badge--gray'">
            {{ ws.role_name }}
          </span>
        </div>
      </div>

      <!-- Create new card -->
      <div class="ws-card ws-card--new" @click="openCreateModal">
        <div class="ws-card__new-icon">+</div>
        <div class="ws-card__name" style="color: var(--color-text-muted)">New workspace</div>
      </div>
    </div>

    <WorkspaceFormModal
      :visible="isModalVisible"
      :workspace="editingWorkspace"
      @close="closeModal"
      @submit="handleSubmit"
    />
  </div>
</template>

<script setup>
import { onMounted } from "vue"
import WorkspaceFormModal from "../../components/WorkspaceFormModal.vue"
import { useWorkspaces } from "../../composables/useWorkspaces.js"

const { workspaces, loading, isModalVisible, editingWorkspace, openCreateModal, closeModal, handleSubmit, fetchWorkspaces } = useWorkspaces()
onMounted(fetchWorkspaces)
</script>

<style scoped>
.page { padding: 28px 24px; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; gap: 16px; }
.page-title { font-size: var(--text-xl); font-weight: 700; color: var(--color-text-primary); letter-spacing: -0.3px; margin: 0; }
.page-subtitle { font-size: var(--text-sm); color: var(--color-text-muted); margin: 4px 0 0; }

.btn-primary { background: var(--color-accent); color: #fff; border: none; border-radius: var(--radius-sm); padding: 8px 16px; font-size: var(--text-sm); font-weight: 600; cursor: pointer; flex-shrink: 0; }
.btn-primary:hover { background: var(--color-accent-hover); }

.ws-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
.ws-card {
  background: var(--color-surface); border: 1px solid var(--color-border);
  border-radius: var(--radius); padding: 20px;
  cursor: pointer; transition: box-shadow 0.15s, border-color 0.15s;
  box-shadow: var(--shadow-sm);
}
.ws-card:hover { box-shadow: var(--shadow-md); border-color: var(--color-accent-border); }
.ws-card--owner { border-left: 3px solid var(--color-accent); }
.ws-card__icon { font-size: 24px; margin-bottom: 10px; }
.ws-card__name { font-size: var(--text-base); font-weight: 600; color: var(--color-text-primary); margin-bottom: 4px; }
.ws-card__meta { font-size: var(--text-xs); color: var(--color-text-muted); margin-bottom: 12px; }
.ws-card__footer { display: flex; align-items: center; }
.ws-card--new {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  border: 1px dashed var(--color-border); background: transparent; min-height: 120px;
}
.ws-card--new:hover { border-color: var(--color-accent-border); background: var(--color-accent-light); }
.ws-card__new-icon { font-size: 24px; color: var(--color-text-muted); margin-bottom: 8px; }

.badge { display: inline-block; font-size: var(--text-xs); font-weight: 600; padding: 2px 9px; border-radius: 20px; }
.badge--accent { background: var(--color-accent-light); color: var(--color-accent); border: 1px solid var(--color-accent-border); }
.badge--gray { background: #f3f4f6; color: var(--color-text-secondary); }

.empty-state { text-align: center; padding: 60px 24px; }
.empty-icon { font-size: 48px; margin-bottom: 16px; }
.empty-title { font-size: var(--text-md); font-weight: 600; color: var(--color-text-primary); margin-bottom: 8px; }
.empty-text { font-size: var(--text-sm); color: var(--color-text-muted); margin-bottom: 24px; max-width: 360px; margin-left: auto; margin-right: auto; }
</style>
