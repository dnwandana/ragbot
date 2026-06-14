<script setup>
import { onMounted } from "vue"
import { useInvitations } from "@/composables/useInvitations"
import { useFormattedTime } from "@/composables/useFormattedTime"

const { myInvitations, loading, fetchMyInvitations, handleAccept, handleDecline } = useInvitations()
const { calendarDate } = useFormattedTime()

onMounted(fetchMyInvitations)

/** @param {string} name */
function wsEmoji(name) {
  const codepoint = (name || "W").toUpperCase().charCodeAt(0)
  const emojis = ["🏢", "🚀", "💼", "🌐", "🔬", "📡", "🏗️", "🌿"]
  return emojis[codepoint % emojis.length]
}

const pendingInvitations = (invs) => invs.filter((i) => i.status === "pending")
const otherInvitations = (invs) => invs.filter((i) => i.status !== "pending")
</script>

<template>
  <div class="page">
    <!-- Page head -->
    <div class="page-head">
      <div>
        <div class="page-title">My Invitations</div>
        <div class="page-sub">Workspaces that have invited you to join.</div>
      </div>
    </div>

    <!-- Loading -->
    <a-skeleton v-if="loading && !myInvitations.length" active :paragraph="{ rows: 3 }" />

    <!-- Empty state -->
    <div v-else-if="!myInvitations.length" class="empty-state">
      <div class="empty-icon"><span aria-hidden="true">✉️</span></div>
      <div class="empty-title">No pending invitations</div>
      <p class="empty-text">When someone invites you to a workspace, it will appear here.</p>
    </div>

    <div v-else class="inv-sections">
      <!-- Pending invitations -->
      <template v-if="pendingInvitations(myInvitations).length">
        <div class="section-label">Pending</div>
        <div v-for="inv in pendingInvitations(myInvitations)" :key="inv.id" class="inv-card">
          <div class="inv-ws-icon">
            <span aria-hidden="true">{{ wsEmoji(inv.workspace_name || inv.org_id) }}</span>
          </div>
          <div class="inv-body">
            <div class="inv-ws-name">{{ inv.workspace_name || inv.org_id }}</div>
            <div class="inv-details">
              <span v-if="inv.expires_at">Expires {{ calendarDate(inv.expires_at) }}</span>
            </div>
          </div>
          <div class="inv-actions">
            <button class="btn-brand" @click="handleAccept(inv.id)">Accept</button>
            <a-popconfirm
              title="Decline this invitation?"
              ok-text="Decline"
              cancel-text="Cancel"
              @confirm="handleDecline(inv.id)"
            >
              <button class="btn-danger-sm">Decline</button>
            </a-popconfirm>
          </div>
        </div>
      </template>

      <!-- Accepted / other -->
      <template v-if="otherInvitations(myInvitations).length">
        <div class="section-label" style="margin-top: 24px">Previous</div>
        <div
          v-for="inv in otherInvitations(myInvitations)"
          :key="inv.id"
          class="inv-card inv-card--muted"
        >
          <div class="inv-ws-icon">
            <span aria-hidden="true">{{ wsEmoji(inv.workspace_name || inv.org_id) }}</span>
          </div>
          <div class="inv-body">
            <div class="inv-ws-name">{{ inv.workspace_name || inv.org_id }}</div>
            <div class="inv-details">Status: {{ inv.status }}</div>
          </div>
          <span class="chip" :class="inv.status === 'accepted' ? 'chip--ok' : 'chip--ghost'">
            <span class="status-dot" />
            {{ inv.status }}
          </span>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.page {
  padding: 20px 24px;
}
.page-head {
  margin-bottom: 20px;
}
.page-title {
  font-size: var(--t-lg);
  font-weight: 600;
  letter-spacing: -0.015em;
  color: var(--ink);
}
.page-sub {
  font-size: var(--t-sm);
  color: var(--ink-3);
  margin-top: 2px;
}

.section-label {
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-4);
  margin-bottom: 8px;
}
.inv-sections {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.inv-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 18px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r);
  box-shadow: var(--shadow-1);
}
.inv-card--muted {
  opacity: 0.7;
}
.inv-ws-icon {
  font-size: 28px;
  flex-shrink: 0;
}
.inv-body {
  flex: 1;
  min-width: 0;
}
.inv-ws-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
  margin-bottom: 3px;
}
.inv-details {
  font-size: 12.5px;
  color: var(--ink-3);
}
.inv-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.btn-brand {
  display: inline-flex;
  align-items: center;
  padding: 7px 14px;
  background: var(--brand);
  color: #fff;
  border: none;
  border-radius: var(--r-sm);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}
.btn-brand:hover {
  background: var(--brand-2);
}
.btn-danger-sm {
  display: inline-flex;
  align-items: center;
  padding: 7px 14px;
  font-size: 13px;
  background: transparent;
  color: var(--err);
  border: 1px solid var(--err-border);
  border-radius: var(--r-sm);
  cursor: pointer;
  font-weight: 500;
}
.btn-danger-sm:hover {
  background: var(--err-bg);
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  text-transform: capitalize;
}
.chip--ok {
  background: var(--ok-bg);
  color: var(--ok);
  border: 1px solid var(--ok-border);
}
.chip--ghost {
  background: var(--bg-2);
  color: var(--ink-4);
  border: 1px solid var(--line);
}
.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.empty-state {
  text-align: center;
  padding: 60px 24px;
}
.empty-icon {
  font-size: 40px;
  margin-bottom: 14px;
}
.empty-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--ink);
  margin-bottom: 6px;
}
.empty-text {
  font-size: 13px;
  color: var(--ink-3);
  max-width: 340px;
  margin: 0 auto;
}
</style>
