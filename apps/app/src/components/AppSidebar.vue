<script setup>
import { computed } from "vue"
import { useRoute, useRouter } from "vue-router"
import { useAuthStore } from "@/stores/auth"
import { useWorkspacesStore } from "@/stores/workspaces"
import { useInvitations } from "@/composables/useInvitations"
import { useTheme } from "@/composables/useTheme"

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
  authStore.logout()
  router.push("/login")
}
</script>

<template>
  <div class="rail">
    <!-- Brand -->
    <div class="rail-brand" @click="navigate('/workspaces')">
      <div class="logo-mark">
        <div class="logo-dot" />
        <div class="logo-inner" />
      </div>
      <span class="brand-name">RAGbot</span>
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

    <div style="flex: 1" />

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
.logo-mark {
  width: 24px;
  height: 24px;
  background: var(--ink);
  border-radius: 7px;
  position: relative;
  flex-shrink: 0;
}
.logo-dot {
  position: absolute;
  width: 9px;
  height: 9px;
  background: var(--brand);
  border-radius: 50%;
  top: 4px;
  left: 4px;
}
.logo-inner {
  position: absolute;
  width: 5px;
  height: 5px;
  background: var(--bg-2);
  border-radius: 50%;
  top: 6px;
  left: 6px;
}
.brand-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
  letter-spacing: -0.01em;
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
</style>
