<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue"
import { useRoute, useRouter } from "vue-router"
import {
  ChevronDown,
  MessageSquare,
  Database,
  Bot,
  Settings,
  Users,
  Star,
  FileText,
  LayoutGrid,
  Mail,
  Sun,
  Moon,
  LogOut,
  Search,
  Plus,
  Ellipsis,
  Pencil,
  Trash2,
} from "lucide-vue-next"
import AppUserMenu from "@/components/AppUserMenu.vue"
import { useAuthStore } from "@/stores/auth"
import { useWorkspacesStore } from "@/stores/workspaces"
import { useConversationsStore } from "@/stores/conversations"
import { useInvitations } from "@/composables/useInvitations"
import { useTheme } from "@/composables/useTheme"
import { usePermissions } from "@/composables/usePermissions"
import { useFormattedTime } from "@/composables/useFormattedTime"

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const workspacesStore = useWorkspacesStore()
const { pendingCount } = useInvitations()
const { theme, toggleTheme } = useTheme()
const { can } = usePermissions()
const { relativeTime, calendarDaysAgo } = useFormattedTime()

const workspaceId = computed(() => route.params.workspaceId || null)
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
const menuConvoId = ref(null)
const menuAnchor = ref(null)
const modalState = ref(null)
const renameValue = ref("")

const filteredConversations = computed(() => {
  const q = conversationSearch.value.toLowerCase().trim()
  return conversationsStore.conversations.filter((c) => c.title?.toLowerCase().includes(q))
})

function conversationGroup(c) {
  const days = calendarDaysAgo(c.updated_at || c.created_at)
  if (days === null) return "Earlier"
  if (days === 0) return "Today"
  if (days === 1) return "Yesterday"
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

function onNewConversation() {
  if (!workspaceId.value) return
  router.push({ name: "NewChat", params: { workspaceId: workspaceId.value } })
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
  menuAnchor.value = {
    top: Math.min(rect.bottom + 4, window.innerHeight - 96),
    left: Math.min(rect.right - 168, window.innerWidth - 176),
  }
}

function openRenameModal(convo) {
  if (!convo) {
    menuConvoId.value = null
    return
  }
  renameValue.value = convo.title
  modalState.value = { type: "rename", convo }
  menuConvoId.value = null
}

function openDeleteModal(convo) {
  if (!convo) {
    menuConvoId.value = null
    return
  }
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
  window.addEventListener("resize", onDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener("click", onDocumentClick)
  window.removeEventListener("resize", onDocumentClick)
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
        <ChevronDown :size="10" :stroke-width="1.5" />
      </span>
    </div>

    <!-- Workspace-scoped nav -->
    <nav class="rail-nav" v-if="workspaceId">
      <div class="nav-eyebrow">Main</div>
      <button
        class="nav-item"
        :class="{ active: isActive(`/workspaces/${workspaceId}/conversations`) }"
        @click="navigate(`/workspaces/${workspaceId}/conversations`)"
      >
        <MessageSquare class="nav-icon" :size="15" :stroke-width="1.7" />
        Conversations
      </button>

      <button
        class="nav-item"
        :class="{ active: isActive(`/workspaces/${workspaceId}/datasets`) }"
        @click="navigate(`/workspaces/${workspaceId}/datasets`)"
      >
        <Database class="nav-icon" :size="15" :stroke-width="1.7" />
        Datasets
      </button>

      <button
        class="nav-item"
        :class="{ active: isActive(`/workspaces/${workspaceId}/agents`) }"
        @click="navigate(`/workspaces/${workspaceId}/agents`)"
      >
        <Bot class="nav-icon" :size="15" :stroke-width="1.7" />
        Agents
      </button>
    </nav>

    <!-- Conversation history (only when in a workspace) -->
    <template v-if="workspaceId">
      <div style="height: 1px; background: var(--line); margin: 8px 12px" />

      <button class="sidebar-new-btn" @click="onNewConversation">
        <Plus :size="16" /> New conversation
      </button>

      <div class="sidebar-search">
        <Search class="sidebar-search__icon" :size="14" />
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
            :class="{
              'sidebar-convo-item--active': route.params.conversationId === c.id,
              'sidebar-convo-item--menu-open': menuConvoId === c.id,
            }"
            @click="onSelectConversation(c.id)"
          >
            <MessageSquare class="sidebar-convo-item__icon" :size="15" :stroke-width="1.7" />
            <span class="sidebar-convo-item__title">{{ c.title }}</span>
            <div class="sidebar-convo-item__trail">
              <span class="sidebar-convo-item__time">{{ relativeTime(c.created_at) }}</span>
              <button
                class="sidebar-convo-item__kebab"
                aria-label="Conversation options"
                @click.stop="openKebabMenu($event, c.id)"
              >
                <Ellipsis :size="16" />
              </button>
            </div>
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
        v-if="workspaceId"
        class="nav-item"
        :class="{ active: route.name === 'SettingsGeneral' }"
        @click="navigate(`/workspaces/${workspaceId}/settings/general`)"
      >
        <Settings class="nav-icon" :size="15" :stroke-width="1.7" />
        General
      </button>

      <button
        v-if="workspaceId"
        class="nav-item"
        :class="{ active: route.name === 'SettingsMembers' }"
        @click="navigate(`/workspaces/${workspaceId}/settings/members`)"
      >
        <Users class="nav-icon" :size="15" :stroke-width="1.7" />
        Members
      </button>

      <button
        v-if="workspaceId"
        class="nav-item"
        :class="{ active: route.name === 'SettingsRoles' }"
        @click="navigate(`/workspaces/${workspaceId}/settings/roles`)"
      >
        <Star class="nav-icon" :size="15" :stroke-width="1.7" />
        Roles
      </button>

      <button
        v-if="workspaceId && can('audit:read')"
        class="nav-item"
        :class="{ active: isActive(`/workspaces/${workspaceId}/audit-logs`) }"
        @click="navigate(`/workspaces/${workspaceId}/audit-logs`)"
      >
        <FileText class="nav-icon" :size="15" :stroke-width="1.7" />
        Audit logs
      </button>

      <button
        class="nav-item"
        :class="{ active: route.path === '/workspaces' }"
        @click="navigate('/workspaces')"
      >
        <LayoutGrid class="nav-icon" :size="15" :stroke-width="1.7" />
        All Workspaces
      </button>

      <button
        class="nav-item"
        :class="{ active: isActive('/invitations') }"
        @click="navigate('/invitations')"
      >
        <Mail class="nav-icon" :size="15" :stroke-width="1.7" />
        Invitations
        <span v-if="pendingCount > 0" class="nav-badge">{{ pendingCount }}</span>
      </button>
    </nav>

    <!-- Footer: user + dark toggle -->
    <div class="rail-footer">
      <AppUserMenu :workspace-id="workspaceId" />
      <button
        class="icon-btn"
        :title="theme === 'dark' ? 'Light mode' : 'Dark mode'"
        @click="toggleTheme"
      >
        <Sun v-if="theme === 'dark'" :size="14" :stroke-width="1.7" />
        <Moon v-else :size="14" :stroke-width="1.7" />
      </button>
      <button class="icon-btn" title="Sign out" @click="handleLogout">
        <LogOut :size="14" :stroke-width="1.7" />
      </button>
    </div>
    <!-- Kebab dropdown -->
    <Teleport to="body">
      <div
        v-if="menuConvoId && menuAnchor"
        class="sidebar-menu"
        :style="{ top: menuAnchor.top + 'px', left: menuAnchor.left + 'px' }"
      >
        <div
          class="sidebar-menu__item"
          @click.stop="
            openRenameModal(conversationsStore.conversations.find((c) => c.id === menuConvoId))
          "
        >
          <Pencil :size="16" /> Rename
        </div>
        <div
          class="sidebar-menu__item sidebar-menu__item--danger"
          @click.stop="
            openDeleteModal(conversationsStore.conversations.find((c) => c.id === menuConvoId))
          "
        >
          <Trash2 :size="16" /> Delete
        </div>
      </div>
    </Teleport>

    <!-- Rename modal -->
    <Teleport to="body">
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
    </Teleport>

    <!-- Delete modal -->
    <Teleport to="body">
      <div
        v-if="modalState?.type === 'delete'"
        class="sidebar-scrim"
        @mousedown.self="modalState = null"
      >
        <div class="sidebar-modal">
          <div style="display: flex; gap: 13px; align-items: flex-start">
            <span class="sidebar-modal__error-icon"><Trash2 :size="16" /></span>
            <div>
              <div class="sidebar-modal__title">Delete conversation?</div>
              <div class="sidebar-modal__body">
                This permanently removes "{{ modalState.convo?.title }}" and all of its messages.
                This can't be undone.
              </div>
            </div>
          </div>
          <div class="sidebar-modal__actions">
            <button class="sidebar-modal__btn-ghost" @click="modalState = null">Cancel</button>
            <button class="sidebar-modal__btn-danger" @click="confirmDelete">Delete</button>
          </div>
        </div>
      </div>
    </Teleport>
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

.sidebar-convo-item__trail {
  position: relative;
  width: 60px;
  height: 24px;
  flex-shrink: 0;
  overflow: hidden;
}

.sidebar-convo-item__time {
  position: absolute;
  top: 50%;
  right: 0;
  transform: translateY(-50%);
  font-size: var(--t-xs);
  color: var(--ink-4);
  font-family: var(--font-mono);
  white-space: nowrap;
  transition: opacity var(--dur) var(--ease);
}

.sidebar-convo-item__kebab {
  position: absolute;
  top: 0;
  right: 0;
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
  opacity: 0;
  pointer-events: none;
  transition:
    opacity var(--dur) var(--ease),
    background var(--dur) var(--ease),
    color var(--dur) var(--ease);
}

.sidebar-convo-item__kebab:hover {
  background: var(--bg-2);
  color: var(--ink);
}

.sidebar-convo-item:hover .sidebar-convo-item__time,
.sidebar-convo-item:focus-within .sidebar-convo-item__time,
.sidebar-convo-item--menu-open .sidebar-convo-item__time {
  opacity: 0;
}

.sidebar-convo-item:hover .sidebar-convo-item__kebab,
.sidebar-convo-item:focus-within .sidebar-convo-item__kebab,
.sidebar-convo-item--menu-open .sidebar-convo-item__kebab {
  opacity: 1;
  pointer-events: auto;
}

@media (hover: none) {
  .sidebar-convo-item__time {
    opacity: 0;
  }

  .sidebar-convo-item__kebab {
    opacity: 1;
    pointer-events: auto;
  }
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
}
</style>
