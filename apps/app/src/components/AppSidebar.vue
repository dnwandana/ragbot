<script setup>
import { ref, computed, watch, reactive } from "vue"
import { Form } from "ant-design-vue"
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
import { useTheme } from "@/composables/useTheme"
import { usePermissions } from "@/composables/usePermissions"
import { useFormattedTime } from "@/composables/useFormattedTime"

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const workspacesStore = useWorkspacesStore()
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

async function handleLogout() {
  await authStore.logout()
  router.push("/login")
}

const conversationsStore = useConversationsStore()

const conversationSearch = ref("")
const modalState = ref(null)
const openMenuId = ref(null)

// Form validation for the rename modal — rules must be reactive (repo gotcha)
const renameFormState = reactive({ title: "" })
const renameRules = reactive({
  title: [{ required: true, message: "Name cannot be empty", whitespace: true }],
})
const { validate: validateRename, resetFields: resetRenameFields } = Form.useForm(
  renameFormState,
  renameRules,
)

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

function openRenameModal(convo) {
  if (!convo) return
  resetRenameFields()
  renameFormState.title = convo.title
  modalState.value = { type: "rename", convo }
}

function openDeleteModal(convo) {
  if (!convo) return
  modalState.value = { type: "delete", convo }
}

async function confirmRename() {
  try {
    await validateRename()
  } catch {
    // Validation failed — field-level errors shown by ant-design-vue
    return
  }
  const title = renameFormState.title.trim()
  if (modalState.value?.convo && title) {
    await onRenameConversation(modalState.value.convo.id, title)
  }
  modalState.value = null
}

async function confirmDelete() {
  if (modalState.value?.convo) {
    await onDeleteConversation(modalState.value.convo.id)
  }
  modalState.value = null
}

/** Close the rename modal without saving. */
function cancelRename() {
  modalState.value = null
}

/** Close the delete modal without deleting. */
function cancelDelete() {
  modalState.value = null
}

watch(
  workspaceId,
  (id) => {
    if (id) conversationsStore.fetchConversations(id)
  },
  { immediate: true },
)
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
        <a-input
          v-model:value="conversationSearch"
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
              'sidebar-convo-item--menu-open': openMenuId === c.id,
            }"
            @click="onSelectConversation(c.id)"
          >
            <MessageSquare class="sidebar-convo-item__icon" :size="15" :stroke-width="1.7" />
            <span class="sidebar-convo-item__title">{{ c.title }}</span>
            <div class="sidebar-convo-item__trail">
              <span class="sidebar-convo-item__time">{{ relativeTime(c.created_at) }}</span>
              <a-dropdown
                :trigger="['click']"
                :overlay-class-name="'sidebar-menu-overlay'"
                placement="bottomRight"
                @click.stop
                @open-change="(vis) => (openMenuId = vis ? c.id : null)"
              >
                <button
                  class="sidebar-convo-item__kebab"
                  aria-label="Conversation options"
                  aria-haspopup="menu"
                  @click.stop
                >
                  <Ellipsis :size="16" />
                </button>
                <template #overlay>
                  <a-menu>
                    <a-menu-item key="rename" @click="openRenameModal(c)">
                      <Pencil :size="16" class="sidebar-menu-icon" /> Rename
                    </a-menu-item>
                    <a-menu-item
                      key="delete"
                      class="sidebar-menu__item--danger"
                      @click="openDeleteModal(c)"
                    >
                      <Trash2 :size="16" class="sidebar-menu-icon" /> Delete
                    </a-menu-item>
                  </a-menu>
                </template>
              </a-dropdown>
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
    <!-- Rename modal -->
    <a-modal
      :open="modalState?.type === 'rename'"
      title="Rename conversation"
      ok-text="Save"
      :wrap-class-name="'convo-rename-wrap'"
      @ok="confirmRename"
      @cancel="cancelRename"
    >
      <a-form :model="renameFormState" :rules="renameRules" layout="vertical">
        <a-form-item name="title">
          <a-input
            v-model:value="renameFormState.title"
            :maxlength="80"
            placeholder="Conversation name"
            autofocus
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- Delete modal -->
    <a-modal
      :open="modalState?.type === 'delete'"
      title="Delete conversation?"
      ok-text="Delete"
      :ok-button-props="{ danger: true }"
      :wrap-class-name="'convo-delete-wrap'"
      @ok="confirmDelete"
      @cancel="cancelDelete"
    >
      <div class="convo-delete-body">
        <span class="convo-delete-icon"><Trash2 :size="16" /></span>
        <p class="convo-delete-text">
          This permanently removes "{{ modalState?.convo?.title }}" and all of its messages. This
          can't be undone.
        </p>
      </div>
    </a-modal>
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

/* a-input renders <input class="ant-input sidebar-search__input">; combine
   classes to outrank Ant's .ant-input defaults and keep the exact look. */
.sidebar-search__input.ant-input,
.sidebar-search__input {
  width: 100%;
  padding: 7px 10px 7px 30px;
  border-radius: var(--r-sm);
  border: 1px solid var(--line);
  background: var(--surface);
  outline: none;
  box-shadow: none;
  font: 400 12.5px var(--font-sans);
  color: var(--ink);
}

.sidebar-search__input.ant-input:focus,
.sidebar-search__input.ant-input-focused,
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
</style>

<!-- Non-scoped: styles for the portaled kebab overlay (under .sidebar-menu-overlay class) -->
<style>
.sidebar-menu-overlay .ant-dropdown-menu {
  min-width: 168px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r);
  box-shadow: var(--shadow-3);
  padding: 6px;
}

.sidebar-menu-overlay .ant-dropdown-menu-item {
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

.sidebar-menu-overlay .ant-dropdown-menu-item:hover {
  background: var(--bg-2);
}

.sidebar-menu-overlay .ant-dropdown-menu-item.sidebar-menu__item--danger {
  color: var(--err);
}

.sidebar-menu-overlay .ant-dropdown-menu-item.sidebar-menu__item--danger:hover {
  background: var(--err-bg);
}

.sidebar-menu-overlay .sidebar-menu-icon {
  flex-shrink: 0;
  color: inherit;
}
.sidebar-menu-overlay .ant-dropdown-menu-title-content {
  display: flex;
  align-items: center;
  gap: 10px;
}
</style>

<!-- Non-scoped: styles for the rename modal portal (under .convo-rename-wrap) -->
<style>
.convo-rename-wrap .ant-modal-content {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-3);
}

.convo-rename-wrap .ant-modal-header {
  background: var(--surface);
  border-bottom: 1px solid var(--line);
}

.convo-rename-wrap .ant-modal-title {
  font-size: var(--t-lg);
  font-weight: 600;
  color: var(--ink);
}

.convo-rename-wrap .ant-modal-body {
  padding: 16px 24px;
}

.convo-rename-wrap .ant-input {
  width: 100%;
  padding: 10px 12px;
  border-radius: var(--r);
  border: 1px solid var(--brand);
  background: var(--surface);
  font: 400 14px var(--font-sans);
  color: var(--ink);
  box-shadow: 0 0 0 2px rgba(255, 107, 53, 0.16);
}

.convo-rename-wrap .ant-input:focus,
.convo-rename-wrap .ant-input-focused {
  border-color: var(--brand);
  box-shadow: 0 0 0 2px rgba(255, 107, 53, 0.16);
}

.convo-rename-wrap .ant-btn-primary {
  background: var(--brand);
  border-color: var(--brand);
  font-weight: 600;
}

.convo-rename-wrap .ant-btn-primary:hover {
  background: var(--brand-2);
  border-color: var(--brand-2);
}
</style>

<!-- Non-scoped: styles for the delete modal portal (under .convo-delete-wrap) -->
<style>
.convo-delete-wrap .ant-modal-content {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-3);
}

.convo-delete-wrap .ant-modal-header {
  background: var(--surface);
  border-bottom: 1px solid var(--line);
}

.convo-delete-wrap .ant-modal-title {
  font-size: var(--t-lg);
  font-weight: 600;
  color: var(--ink);
}

.convo-delete-wrap .ant-modal-body {
  padding: 16px 24px;
}

.convo-delete-wrap .convo-delete-body {
  display: flex;
  gap: 13px;
  align-items: flex-start;
}

.convo-delete-wrap .convo-delete-icon {
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

.convo-delete-wrap .convo-delete-text {
  font-size: var(--t-base);
  color: var(--ink-3);
  line-height: 1.55;
  margin: 0;
}

.convo-delete-wrap .ant-btn-dangerous {
  background: var(--err);
  border-color: var(--err);
  color: #fff;
  font-weight: 600;
}

.convo-delete-wrap .ant-btn-dangerous:hover {
  background: var(--err);
  border-color: var(--err);
  opacity: 0.85;
}
</style>
