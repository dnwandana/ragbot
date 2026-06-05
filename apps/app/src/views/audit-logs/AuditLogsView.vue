<script setup>
import { computed } from "vue"
import { useRoute } from "vue-router"
import { Clock, Inbox, FileSearch } from "lucide-vue-next"
import AuditFilterBar from "@/components/audit/AuditFilterBar.vue"
import AuditTable from "@/components/audit/AuditTable.vue"
import AuditDetailDrawer from "@/components/audit/AuditDetailDrawer.vue"
import { useAuditLogs } from "@/composables/useAuditLogs"
import { usePaginationUI } from "@/composables/usePaginationUI"

const route = useRoute()
const workspaceId = route.params.workspaceId

const {
  auditLogs,
  loading,
  pagination,
  members,
  entityType,
  action,
  userId,
  sortBy,
  sortOrder,
  page,
  setPage,
  clearFilters,
  hasFilters,
  selectedEvent,
  openEvent,
  closeEvent,
  actorFor,
} = useAuditLogs(workspaceId)

const { totalCount, paginationInfo, pageNumbers, showPagination } = usePaginationUI({
  pagination,
  page,
  sortBy,
  sortOrder,
})

const selectedActor = computed(() =>
  selectedEvent.value ? actorFor(selectedEvent.value.user_id) : null,
)
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <div class="page-eyebrow">Settings</div>
        <div class="page-title">Audit logs</div>
        <div class="page-sub">
          <Clock :size="16" />
          Every action in your workspace, in one place.
        </div>
      </div>
    </div>

    <div class="filters">
      <AuditFilterBar
        v-model:entity-type="entityType"
        v-model:action="action"
        v-model:user-id="userId"
        :members="members"
        :count="totalCount"
        :has-filters="hasFilters"
        @clear="clearFilters"
      />
    </div>

    <div class="card">
      <!-- Loading skeleton -->
      <div v-if="loading && !auditLogs.length" class="state">
        <div v-for="n in 7" :key="n" class="skel-row">
          <div class="skel skel-av" />
          <div class="skel" style="height: 11px; width: 60%" />
          <div class="skel" style="height: 18px; width: 80px" />
          <div class="skel" style="height: 11px; width: 70px" />
        </div>
      </div>

      <!-- Empty (no events, no filters) -->
      <div v-else-if="!loading && !auditLogs.length && !hasFilters" class="centered">
        <div class="centered-icon"><Inbox :size="24" /></div>
        <div class="centered-title">No activity yet</div>
        <div class="centered-body">
          Audit events appear here as people and integrations act on your workspace — managing
          members, editing datasets, configuring agents, and more.
        </div>
      </div>

      <!-- Zero results (filters match nothing) -->
      <div v-else-if="!loading && !auditLogs.length && hasFilters" class="centered">
        <div class="centered-icon"><FileSearch :size="24" /></div>
        <div class="centered-title">No events match your filters</div>
        <div class="centered-body">Try removing a filter to widen the results.</div>
        <button class="btn-primary" @click="clearFilters">Clear all filters</button>
      </div>

      <!-- Populated -->
      <template v-else>
        <AuditTable
          :events="auditLogs"
          :actor-for="actorFor"
          :selected-id="selectedEvent?.id || null"
          @open="openEvent"
        />
        <div v-if="showPagination" class="pager">
          <span class="pg-info">{{ paginationInfo }} events</span>
          <div class="pg-controls">
            <button class="pg-btn" :disabled="page === 1" @click="setPage(page - 1)">← Prev</button>
            <template v-for="(p, i) in pageNumbers" :key="i">
              <span v-if="p === '…'" class="pg-sep">…</span>
              <button
                v-else
                class="pg-btn"
                :class="{ 'pg-btn--active': p === page }"
                @click="setPage(p)"
              >
                {{ p }}
              </button>
            </template>
            <button
              class="pg-btn"
              :disabled="page === pagination?.total_pages"
              @click="setPage(page + 1)"
            >
              Next →
            </button>
          </div>
        </div>
      </template>
    </div>

    <AuditDetailDrawer :event="selectedEvent" :actor="selectedActor" @close="closeEvent" />
  </div>
</template>

<style scoped>
.page {
  padding: 24px 28px 48px;
  max-width: 1280px;
  margin: 0 auto;
}
.page-head {
  margin-bottom: 20px;
}
.page-eyebrow {
  font-size: var(--t-xs);
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-4);
  margin-bottom: 4px;
}
.page-title {
  font-size: var(--t-xl);
  font-weight: 600;
  letter-spacing: -0.015em;
  color: var(--ink);
}
.page-sub {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 7px;
  font-size: var(--t-sm);
  color: var(--ink-3);
}
.filters {
  margin-bottom: 16px;
}
.card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-1);
  overflow: hidden;
}
.state {
  padding: 6px 0;
}
.skel-row {
  display: grid;
  grid-template-columns: 220px 1fr 120px 90px;
  align-items: center;
  gap: 14px;
  padding: 13px 18px;
  border-bottom: 1px solid var(--line);
}
.skel {
  border-radius: 4px;
  background: var(--bg-2);
  animation: at-shimmer 1.4s ease-in-out infinite;
}
.skel-av {
  width: 32px;
  height: 32px;
  border-radius: 50%;
}
@keyframes at-shimmer {
  0% {
    opacity: 0.55;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0.55;
  }
}
.centered {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 72px 32px;
}
.centered-icon {
  width: 56px;
  height: 56px;
  border-radius: var(--r-lg);
  background: var(--bg-2);
  border: 1px solid var(--line);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ink-3);
  font-size: 24px;
  margin-bottom: 18px;
}
.centered-title {
  font-size: var(--t-lg);
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--ink);
  margin-bottom: 7px;
}
.centered-body {
  font-size: var(--t-base);
  color: var(--ink-3);
  max-width: 380px;
  line-height: 1.55;
  margin-bottom: 18px;
}
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 16px;
  background: var(--brand);
  color: #fff;
  border: none;
  border-radius: var(--r);
  font-size: var(--t-base);
  font-weight: 600;
  cursor: pointer;
}
.btn-primary:hover {
  background: var(--brand-2);
}
.pager {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding: 14px 18px;
  border-top: 1px solid var(--line);
}
.pg-info {
  font-size: var(--t-sm);
  color: var(--ink-3);
}
.pg-controls {
  display: flex;
  align-items: center;
  gap: 4px;
}
.pg-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 30px;
  height: 30px;
  padding: 0 8px;
  border: 1px solid var(--line-2);
  border-radius: var(--r-sm);
  background: var(--surface);
  font-size: 12px;
  color: var(--ink-2);
  cursor: pointer;
}
.pg-btn:hover:not(:disabled) {
  background: var(--bg-2);
}
.pg-btn--active {
  background: var(--brand);
  color: #fff;
  border-color: var(--brand);
  font-weight: 600;
}
.pg-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.pg-sep {
  font-size: 12px;
  color: var(--ink-4);
  padding: 0 2px;
  user-select: none;
}
</style>
