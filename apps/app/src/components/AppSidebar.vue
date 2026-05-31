<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue"
import { useRoute, useRouter } from "vue-router"
import {
  SearchOutlined,
  PlusOutlined,
  MessageOutlined,
  EllipsisOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons-vue"
import { useAuthStore } from "@/stores/auth"
import { useWorkspacesStore } from "@/stores/workspaces"
import { useConversationsStore } from "@/stores/conversations"
import { useInvitations } from "@/composables/useInvitations"
import { useTheme } from "@/composables/useTheme"
import { relativeTime } from "@/utils/time"

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const workspacesStore = useWorkspacesStore()
const { pendingCount } = useInvitations()
const { theme, toggleTheme } = useTheme()

const workspaceId = computed(() => route.params.workspaceId || null)
const currentUser = computed(() => authStore.currentUser)

const avatarInitials = computed(() => {
  const name = currentUser.value?.full_name || ""
  return (
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  )
})

const currentWorkspace = computed(() =>
  workspacesStore.workspaces.find((ws) => ws.id === workspaceId.value),
)

/** @param {string} path */
function isActive(path) {
  return route.path === path || route.path.startsWith(path + "/")
}

const emit = defineEmits(["close"])

/** @param {string} path */
function navigate(path) {
  router.push(path)
  emit("close")
}

function handleLogout() {
  void authStore.logout()
  router.push("/login")
}

const conversationsStore = useConversationsStore()

const conversationSearch = ref("")
const hoveredConvoId = ref(null)
const menuConvoId = ref(null)
const menuAnchor = ref(null)
const modalState = ref(null)
const renameValue = ref("")

const filteredConversations = computed(() => {
  const q = conversationSearch.value.toLowerCase().trim()
  return conversationsStore.conversations.filter((c) => c.title?.toLowerCase().includes(q))
})

function conversationGroup(c) {
  if (!c.updated_at && !c.created_at) return "Earlier"
  const d = new Date(c.updated_at || c.created_at)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const itemDay = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diffDays = Math.round((today - itemDay) / 86_400_000)
  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Yesterday"
  return "Earlier"
}

const groupedConversations = computed(() => {
  const groups = {}
  filteredConversations.value.forEach((c) => {
    const key = conversationGroup(c)
    ;(groups[key] = groups[key] || []).push(c)
  })
  return groups
})

const GROUP_ORDER = ["Today", "Yesterday", "Earlier"]
const orderedGroups = computed(() =>
  GROUP_ORDER.filter((k) => groupedConversations.value[k]?.length),
)

async function onNewConversation() {
  if (!workspaceId.value) return
  const convo = await conversationsStore.createConversation(workspaceId.value, {
    title: "New conversation",
  })
  router.push(`/workspaces/${workspaceId.value}/conversations/${convo.id}`)
}

function onSelectConversation(id) {
  router.push(`/workspaces/${workspaceId.value}/conversations/${id}`)
}

async function onDeleteConversation(id) {
  if (!workspaceId.value) return
  await conversationsStore.deleteConversation(workspaceId.value, id)
  if (route.params.conversationId === id) {
    router.push(`/workspaces/${workspaceId.value}/conversations`)
  }
}

async function onRenameConversation(id, title) {
  if (!workspaceId.value) return
  await conversationsStore.updateConversation(workspaceId.value, id, { title })
}

function openKebabMenu(e, convoId) {
  e.stopPropagation()
  const rect = e.currentTarget.getBoundingClientRect()
  menuConvoId.value = menuConvoId.value === convoId ? null : convoId
  menuAnchor.value = { bottom: rect.bottom, right: rect.right }
}

function openRenameModal(convo) {
  renameValue.value = convo.title
  modalState.value = { type: "rename", convo }
  menuConvoId.value = null
}

function openDeleteModal(convo) {
  modalState.value = { type: "delete", convo }
  menuConvoId.value = null
}

async function confirmRename() {
  if (modalState.value?.convo && renameValue.value.trim()) {
    await onRenameConversation(modalState.value.convo.id, renameValue.value.trim())
  }
  modalState.value = null
}

async function confirmDelete() {
  if (modalState.value?.convo) {
    await onDeleteConversation(modalState.value.convo.id)
  }
  modalState.value = null
}

function onDocumentClick() {
  menuConvoId.value = null
}

watch(
  workspaceId,
  (id) => {
    if (id) conversationsStore.fetchConversations(id)
  },
  { immediate: true },
)

onMounted(() => {
  document.addEventListener("click", onDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener("click", onDocumentClick)
})
</script>

<template>
  <div class="rail">
    <!-- Brand -->
    <div class="rail-brand" @click="navigate('/workspaces')">
      <svg class="brand-logo" viewBox="0 0 140 48" role="img" aria-label="RAGBot">
        <text x="2" y="34" fill="var(--brand)" font-size="28" font-weight="700">[</text>
        <text x="15" y="35" fill="var(--ink)" font-size="28" font-weight="700">R</text>
        <text x="35" y="34" fill="var(--brand)" font-size="28" font-weight="700">]</text>
        <text
          x="53"
          y="33"
          fill="var(--ink)"
          font-size="21"
          font-weight="600"
          letter-spacing="-0.5"
        >
          RAGBot
        </text>
      </svg>
    </div>

    <!-- Workspace pill -->
    <div class="ws-pill" @click="navigate('/workspaces')">
      <span class="ws-pill__name">{{ currentWorkspace?.name || "Select workspace" }}</span>
      <span class="ws-pill__caret">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2 4l3 3 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        </svg>
      </span>
    </div>

    <!-- Workspace-scoped nav -->
    <nav class="rail-nav" v-if="workspaceId">
      <button
        class="nav-item"
        :class="{ active: isActive(`/workspaces/${workspaceId}/conversations`) }"
        @click="navigate(`/workspaces/${workspaceId}/conversations`)"
      >
        <svg
          class="nav-icon"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.7"
        >
          <path
            d="M2 2h12a1 1 0 011 1v8a1 1 0 01-1 1H5l-3 2V3a1 1 0 011-1z"
            stroke-linejoin="round"
          />
        </svg>
        Conversations
      </button>

      <button
        class="nav-item"
        :class="{ active: isActive(`/workspaces/${workspaceId}/datasets`) }"
        @click="navigate(`/workspaces/${workspaceId}/datasets`)"
      >
        <svg
          class="nav-icon"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.7"
        >
          <ellipse cx="8" cy="4" rx="6" ry="2.5" />
          <path d="M2 4v4c0 1.38 2.686 2.5 6 2.5S14 9.38 14 8V4" />
          <path d="M2 8v4c0 1.38 2.686 2.5 6 2.5S14 13.38 14 12V8" />
        </svg>
        Datasets
      </button>

      <button
        class="nav-item"
        :class="{ active: isActive(`/workspaces/${workspaceId}/agents`) }"
        @click="navigate(`/workspaces/${workspaceId}/agents`)"
      >
        <svg
          class="nav-icon"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.7"
        >
          <rect x="3" y="1.5" width="10" height="8" rx="3" />
          <circle cx="5.5" cy="6" r="1" fill="currentColor" stroke="none" />
          <circle cx="10.5" cy="6" r="1" fill="currentColor" stroke="none" />
          <path d="M5 11.5c0-1.657 1.343-2.5 3-2.5s3 .843 3 2.5" stroke-linecap="round" />
          <path d="M8 9.5v2" stroke-linecap="round" />
        </svg>
        Agents
      </button>
    </nav>

    <!-- Conversation history (only when in a workspace) -->
    <template v-if="workspaceId">
      <div style="height: 1px; background: var(--line); margin: 8px 12px" />

      <button class="sidebar-new-btn" @click="onNewConversation">
        <PlusOutlined /> New conversation
      </button>

      <div class="sidebar-search">
        <SearchOutlined class="sidebar-search__icon" />
        <input
          v-model="conversationSearch"
          class="sidebar-search__input"
          placeholder="Search conversations"
        />
      </div>

      <div class="sidebar-convo-list">
        <div v-if="orderedGroups.length === 0" class="sidebar-convo-empty">
          <template v-if="conversationSearch">
            No conversations match "{{ conversationSearch }}".
          </template>
          <template v-else>No conversations yet.</template>
        </div>
        <div v-for="group in orderedGroups" :key="group">
          <div class="sidebar-convo-group">{{ group }}</div>
          <div
            v-for="c in groupedConversations[group]"
            :key="c.id"
            class="sidebar-convo-item"
            :class="{ 'sidebar-convo-item--active': route.params.conversationId === c.id }"
            @click="onSelectConversation(c.id)"
            @mouseenter="hoveredConvoId = c.id"
            @mouseleave="hoveredConvoId = null"
          >
            <MessageOutlined class="sidebar-convo-item__icon" />
            <span class="sidebar-convo-item__title">{{ c.title }}</span>
            <button
              v-if="hoveredConvoId === c.id || menuConvoId === c.id"
              class="sidebar-convo-item__kebab"
              @click.stop="openKebabMenu($event, c.id)"
            >
              <EllipsisOutlined />
            </button>
            <span v-else class="sidebar-convo-item__time">{{ relativeTime(c.created_at) }}</span>
          </div>
        </div>
      </div>
    </template>

    <!-- Fallback spacer when no workspace (non-workspace routes) -->
    <div v-else style="flex: 1" />

    <div class="rail-divider" />

    <!-- Global nav -->
    <nav class="rail-nav">
      <div class="nav-eyebrow">Workspace</div>

      <button
        class="nav-item"
        :class="{ active: isActive(`/workspaces/${workspaceId}/settings`) }"
        @click="navigate(`/workspaces/${workspaceId}/settings`)"
        v-if="workspaceId"
      >
        <svg
          class="nav-icon"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.7"
        >
          <circle cx="8" cy="8" r="2.5" />
          <path
            d="M8 1.5v1M8 13.5v1M1.5 8h1M13.5 8h1M3.34 3.34l.71.71M11.95 11.95l.71.71M3.34 12.66l.71-.71M11.95 4.05l.71-.71"
            stroke-linecap="round"
          />
        </svg>
        Settings
      </button>

      <button
        class="nav-item"
        :class="{ active: route.path === '/workspaces' }"
        @click="navigate('/workspaces')"
      >
        <svg
          class="nav-icon"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.7"
        >
          <rect x="1" y="1" width="6" height="6" rx="1.5" />
          <rect x="9" y="1" width="6" height="6" rx="1.5" />
          <rect x="1" y="9" width="6" height="6" rx="1.5" />
          <rect x="9" y="9" width="6" height="6" rx="1.5" />
        </svg>
        Workspaces
      </button>

      <button
        class="nav-item"
        :class="{ active: isActive('/invitations') }"
        @click="navigate('/invitations')"
      >
        <svg
          class="nav-icon"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.7"
        >
          <rect x="1" y="3.5" width="14" height="10" rx="1.5" />
          <path d="M1 5.5l7 5 7-5" stroke-linejoin="round" />
        </svg>
        Invitations
        <span v-if="pendingCount > 0" class="nav-badge">{{ pendingCount }}</span>
      </button>
    </nav>

    <!-- Footer: user + dark toggle -->
    <div class="rail-footer">
      <div class="user-avatar">{{ avatarInitials }}</div>
      <div class="user-info">
        <div class="user-name">{{ currentUser?.full_name || "User" }}</div>
        <div class="user-role">{{ currentWorkspace?.role_name || "Member" }}</div>
      </div>
      <button
        class="icon-btn"
        :title="theme === 'dark' ? 'Light mode' : 'Dark mode'"
        @click="toggleTheme"
      >
        <svg
          v-if="theme === 'dark'"
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.7"
        >
          <circle cx="8" cy="8" r="3.5" />
          <path
            d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.2 3.2l1.1 1.1M11.7 11.7l1.1 1.1M3.2 12.8l1.1-1.1M11.7 4.3l1.1-1.1"
            stroke-linecap="round"
          />
        </svg>
        <svg
          v-else
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.7"
        >
          <path d="M13.5 10A6 6 0 016 2.5a6 6 0 100 11 6 6 0 007.5-3.5z" stroke-linejoin="round" />
        </svg>
      </button>
      <button class="icon-btn" title="Sign out" @click="handleLogout">
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          stroke-width="1.7"
        >
          <path
            d="M9 2h3a1 1 0 011 1v8a1 1 0 01-1 1H9M5 9.5L2 7l3-2.5M2 7h8"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </div>
    <!-- Kebab dropdown -->
    <div
      v-if="menuConvoId && menuAnchor"
      class="sidebar-menu"
      :style="{
        top: Math.min(menuAnchor.bottom + 4, window.innerHeight - 96) + 'px',
        left: Math.min(menuAnchor.right - 168, window.innerWidth - 176) + 'px',
      }"
    >
      <div
        class="sidebar-menu__item"
        @click.stop="
          openRenameModal(conversationsStore.conversations.find((c) => c.id === menuConvoId))
        "
      >
        <EditOutlined /> Rename
      </div>
      <div
        class="sidebar-menu__item sidebar-menu__item--danger"
        @click.stop="
          openDeleteModal(conversationsStore.conversations.find((c) => c.id === menuConvoId))
        "
      >
        <DeleteOutlined /> Delete
      </div>
    </div>

    <!-- Rename modal -->
    <div
      v-if="modalState?.type === 'rename'"
      class="sidebar-scrim"
      @mousedown.self="modalState = null"
    >
      <div class="sidebar-modal">
        <div class="sidebar-modal__title">Rename conversation</div>
        <div class="sidebar-modal__body">
          Give this conversation a clear name so it's easy to find later.
        </div>
        <input
          v-model="renameValue"
          class="sidebar-modal__input"
          maxlength="80"
          autofocus
          @keydown.enter="confirmRename"
          @keydown.escape="modalState = null"
        />
        <div class="sidebar-modal__actions">
          <button class="sidebar-modal__btn-ghost" @click="modalState = null">Cancel</button>
          <button
            class="sidebar-modal__btn-primary"
            :disabled="!renameValue.trim()"
            @click="confirmRename"
          >
            Save
          </button>
        </div>
      </div>
    </div>

    <!-- Delete modal -->
    <div
      v-if="modalState?.type === 'delete'"
      class="sidebar-scrim"
      @mousedown.self="modalState = null"
    >
      <div class="sidebar-modal">
        <div style="display: flex; gap: 13px; align-items: flex-start">
          <span class="sidebar-modal__error-icon"><DeleteOutlined /></span>
          <div>
            <div class="sidebar-modal__title">Delete conversation?</div>
            <div class="sidebar-modal__body">
              This permanently removes "{{ modalState.convo?.title }}" and all of its messages. This
              can't be undone.
            </div>
          </div>
        </div>
        <div class="sidebar-modal__actions">
          <button class="sidebar-modal__btn-ghost" @click="modalState = null">Cancel</button>
          <button class="sidebar-modal__btn-danger" @click="confirmDelete">Delete</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.rail {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 100vh;
  background: var(--bg-2);
  border-right: 1px solid var(--line);
  padding: 0;
}

/* Brand */
.rail-brand {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 18px 14px 10px;
  cursor: pointer;
  flex-shrink: 0;
}
.brand-logo {
  height: 24px;
  display: block;
}

/* Workspace pill */
.ws-pill {
  margin: 0 8px 10px;
  padding: 8px 10px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  flex-shrink: 0;
}
.ws-pill:hover {
  border-color: var(--line-2);
}
.ws-pill__name {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--ink-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ws-pill__caret {
  color: var(--ink-4);
  flex-shrink: 0;
}

/* Nav */
.rail-nav {
  padding: 0 8px;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.nav-eyebrow {
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--ink-4);
  padding: 10px 8px 4px;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 7px 10px;
  border-radius: var(--r-sm);
  font-size: 13px;
  font-weight: 500;
  color: var(--ink-3);
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  transition:
    background var(--dur) var(--ease),
    color var(--dur) var(--ease);
}
.nav-item:hover {
  background: rgba(24, 18, 12, 0.05);
  color: var(--ink);
}
.nav-item.active {
  background: var(--surface);
  color: var(--ink);
  font-weight: 600;
  box-shadow: var(--shadow-1);
  border: 1px solid var(--line);
}
.nav-icon {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
  color: inherit;
}
.nav-badge {
  background: var(--brand);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 10px;
  margin-left: auto;
}

.rail-divider {
  height: 1px;
  background: var(--line);
  margin: 8px 14px;
  flex-shrink: 0;
}

/* Footer */
.rail-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 12px 14px;
  border-top: 1px solid var(--line);
  flex-shrink: 0;
}
.user-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--brand-tint);
  color: var(--brand-3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--t-xs);
  font-weight: 700;
  flex-shrink: 0;
}
.user-info {
  flex: 1;
  min-width: 0;
}
.user-name {
  font-size: var(--t-sm);
  font-weight: 600;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.user-role {
  font-size: var(--t-xs);
  color: var(--ink-4);
  margin-top: 1px;
}
.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  background: none;
  cursor: pointer;
  color: var(--ink-4);
  border-radius: var(--r-sm);
  flex-shrink: 0;
  transition:
    background var(--dur),
    color var(--dur);
}
.icon-btn:hover {
  background: var(--line);
  color: var(--ink);
}

/* ── Conversation history ── */
.sidebar-new-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px 12px 10px;
  padding: 9px 12px;
  background: var(--brand);
  color: #fff;
  border: none;
  border-radius: var(--r);
  font: 600 13.5px var(--font-sans);
  cursor: pointer;
  transition: background var(--dur) var(--ease);
  justify-content: center;
  width: calc(100% - 24px);
}

.sidebar-new-btn:hover {
  background: var(--brand-2);
}

.sidebar-search {
  margin: 0 12px 8px;
  position: relative;
  display: flex;
  align-items: center;
}

.sidebar-search__icon {
  position: absolute;
  left: 9px;
  color: var(--ink-4);
  pointer-events: none;
  font-size: 14px;
}

.sidebar-search__input {
  width: 100%;
  padding: 7px 10px 7px 30px;
  border-radius: var(--r-sm);
  border: 1px solid var(--line);
  background: var(--surface);
  outline: none;
  font: 400 12.5px var(--font-sans);
  color: var(--ink);
}

.sidebar-search__input:focus {
  border-color: var(--brand);
  box-shadow: 0 0 0 2px rgba(255, 107, 53, 0.14);
}

.sidebar-convo-list {
  padding: 0 8px 8px;
  display: flex;
  flex-direction: column;
  gap: 1px;
  overflow-y: auto;
  flex: 1;
}

.sidebar-convo-empty {
  padding: 24px 16px;
  text-align: center;
  color: var(--ink-4);
  font-size: var(--t-sm);
  line-height: 1.5;
}

.sidebar-convo-group {
  padding: 12px 14px 4px;
  font-size: var(--t-xs);
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-4);
}

.sidebar-convo-item {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 10px;
  border-radius: var(--r-sm);
  font-size: var(--t-base);
  color: var(--ink-2);
  font-weight: 400;
  cursor: pointer;
  transition: background var(--dur) var(--ease);
  position: relative;
}

.sidebar-convo-item:hover {
  background: rgba(24, 18, 12, 0.04);
}

.sidebar-convo-item--active {
  color: var(--ink);
  font-weight: 500;
  background: var(--surface);
  box-shadow: var(--shadow-1);
}

.sidebar-convo-item__icon {
  color: var(--ink-4);
  font-size: 15px;
  flex-shrink: 0;
}

.sidebar-convo-item--active .sidebar-convo-item__icon {
  color: var(--brand);
}

.sidebar-convo-item__title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar-convo-item__time {
  font-size: var(--t-xs);
  color: var(--ink-4);
  font-family: var(--font-mono);
}

.sidebar-convo-item__kebab {
  width: 24px;
  height: 24px;
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ink-4);
  background: transparent;
  border: none;
  cursor: pointer;
  flex-shrink: 0;
  font-size: 16px;
}

.sidebar-convo-item__kebab:hover {
  background: var(--bg-2);
  color: var(--ink);
}

.sidebar-menu {
  position: fixed;
  min-width: 168px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r);
  box-shadow: var(--shadow-3);
  padding: 6px;
  z-index: 120;
}

.sidebar-menu__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: var(--r-sm);
  cursor: pointer;
  color: var(--ink-2);
  font-size: var(--t-base);
  font-weight: 500;
  transition: background var(--dur) var(--ease);
}

.sidebar-menu__item:hover {
  background: var(--bg-2);
}

.sidebar-menu__item--danger {
  color: var(--err);
}

.sidebar-menu__item--danger:hover {
  background: var(--err-bg);
}

.sidebar-scrim {
  position: fixed;
  inset: 0;
  background: rgba(24, 18, 12, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}

.sidebar-modal {
  width: 420px;
  max-width: calc(100vw - 32px);
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-3);
  padding: 22px;
}

.sidebar-modal__title {
  font-size: var(--t-lg);
  font-weight: 600;
  color: var(--ink);
}

.sidebar-modal__body {
  font-size: var(--t-base);
  color: var(--ink-3);
  line-height: 1.55;
  margin-top: 8px;
}

.sidebar-modal__input {
  width: 100%;
  margin-top: 16px;
  padding: 10px 12px;
  border-radius: var(--r);
  border: 1px solid var(--brand);
  outline: none;
  background: var(--surface);
  font: 400 14px var(--font-sans);
  color: var(--ink);
  box-shadow: 0 0 0 2px rgba(255, 107, 53, 0.16);
}

.sidebar-modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 20px;
}

.sidebar-modal__btn-ghost {
  padding: 8px 14px;
  border-radius: var(--r-sm);
  background: transparent;
  border: 1px solid var(--line-2);
  color: var(--ink-2);
  font: 500 13px var(--font-sans);
  cursor: pointer;
}

.sidebar-modal__btn-primary {
  padding: 8px 14px;
  border-radius: var(--r-sm);
  background: var(--brand);
  border: none;
  color: #fff;
  font: 600 13px var(--font-sans);
  cursor: pointer;
}

.sidebar-modal__btn-primary:disabled {
  background: var(--bg-2);
  color: var(--ink-4);
  cursor: not-allowed;
}

.sidebar-modal__btn-danger {
  padding: 8px 14px;
  border-radius: var(--r-sm);
  background: var(--err);
  border: none;
  color: #fff;
  font: 600 13px var(--font-sans);
  cursor: pointer;
}

.sidebar-modal__error-icon {
  width: 34px;
  height: 34px;
  border-radius: var(--r);
  background: var(--err-bg);
  border: 1px solid var(--err-border);
  color: var(--err);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 17px;
}
</style>
