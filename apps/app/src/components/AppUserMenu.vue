<script setup>
import { computed } from "vue"
import { User, Lock, LogOut } from "lucide-vue-next"
import { useRouter } from "vue-router"
import { useAuthStore } from "@/stores/auth"

const props = defineProps({
  workspaceId: { type: String, default: null },
})

const router = useRouter()
const authStore = useAuthStore()

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

/** Navigate to a settings route. */
function navigateTo(routeName) {
  router.push({ name: routeName, params: { workspaceId: props.workspaceId } })
}

/** Sign the user out and redirect to login. */
async function handleLogout() {
  await authStore.logout()
  router.push("/login")
}
</script>

<template>
  <a-dropdown :trigger="['click']" :overlay-class-name="'user-menu-overlay'" placement="topLeft">
    <!-- Trigger: avatar + name -->
    <div class="user-trigger" role="button" tabindex="0" aria-haspopup="menu">
      <div class="user-avatar">{{ avatarInitials }}</div>
      <div class="user-info">
        <div class="user-name">{{ currentUser?.full_name || "User" }}</div>
      </div>
    </div>

    <!-- Overlay: menu rendered inside the dropdown portal -->
    <template #overlay>
      <a-menu>
        <!-- Header: name + email (read-only, not a menu item) -->
        <div class="user-menu__header">
          <div class="user-menu__header-name">{{ currentUser?.full_name || "User" }}</div>
          <div class="user-menu__header-email">{{ currentUser?.email || "" }}</div>
        </div>

        <!-- Workspace-scoped links -->
        <template v-if="workspaceId">
          <div class="user-menu__divider" />
          <a-menu-item key="profile" @click="navigateTo('SettingsProfile')">
            <User :size="14" :stroke-width="1.7" class="menu-icon" />
            Profile
          </a-menu-item>
          <a-menu-item key="security" @click="navigateTo('SettingsAccount')">
            <Lock :size="14" :stroke-width="1.7" class="menu-icon" />
            Security
          </a-menu-item>
        </template>

        <div class="user-menu__divider" />
        <a-menu-item key="logout" class="user-menu__item--danger" @click="handleLogout">
          <LogOut :size="14" :stroke-width="1.7" class="menu-icon" />
          Sign out
        </a-menu-item>
      </a-menu>
    </template>
  </a-dropdown>
</template>

<style scoped>
/* ── Trigger area ── */
.user-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  cursor: pointer;
  border-radius: var(--r-sm);
  padding: 2px 4px;
  margin: -2px -4px;
  transition:
    background var(--dur) var(--ease),
    box-shadow var(--dur) var(--ease);
}

.user-trigger:hover {
  background: rgba(24, 18, 12, 0.05);
}

[data-theme="dark"] .user-trigger:hover {
  background: rgba(240, 235, 227, 0.06);
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
</style>

<!-- Non-scoped: styles for the portaled overlay (under .user-menu-overlay class) -->
<style>
.user-menu-overlay .ant-dropdown-menu {
  min-width: 200px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r);
  box-shadow: var(--shadow-3);
  padding: 6px;
}

.user-menu-overlay .user-menu__header {
  padding: 8px 10px 10px;
}

.user-menu-overlay .user-menu__header-name {
  font-size: var(--t-sm);
  font-weight: 600;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-menu-overlay .user-menu__header-email {
  font-size: var(--t-xs);
  color: var(--ink-4);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-menu-overlay .user-menu__divider {
  height: 1px;
  background: var(--line);
  margin: 0 0 6px;
}

.user-menu-overlay .ant-dropdown-menu-item {
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

.user-menu-overlay .ant-dropdown-menu-item:hover {
  background: var(--bg-2);
}

.user-menu-overlay .ant-dropdown-menu-item.user-menu__item--danger {
  color: var(--err);
}

.user-menu-overlay .ant-dropdown-menu-item.user-menu__item--danger:hover {
  background: var(--err-bg);
}

.user-menu-overlay .menu-icon {
  flex-shrink: 0;
  color: inherit;
}
.user-menu-overlay .ant-dropdown-menu-title-content {
  display: flex;
  align-items: center;
  gap: 10px;
}
</style>
