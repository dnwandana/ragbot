<!-- apps/app/src/components/settings/SettingsNavRail.vue -->
<script setup>
import { computed } from "vue"
import { useRouter } from "vue-router"
import { useAuthStore } from "@/stores/auth"
import { useTheme } from "@/composables/useTheme"

const props = defineProps({
  activeSection: { type: String, required: true },
  workspaceId: { type: String, required: true },
  memberCount: { type: Number, default: 0 },
  roleCount: { type: Number, default: 0 },
})

const emit = defineEmits(["navigate"])

const router = useRouter()
const authStore = useAuthStore()
const { theme, toggleTheme } = useTheme()

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

const workspaceSections = [
  { key: "general", label: "General" },
  { key: "members", label: "Members", countKey: "memberCount" },
  { key: "roles", label: "Roles", countKey: "roleCount" },
]

const accountSections = [
  { key: "profile", label: "Profile" },
  { key: "account", label: "Security" },
]

function goBack() {
  router.push(`/workspaces/${props.workspaceId}/conversations`)
}
</script>

<template>
  <aside class="settings-rail">
    <!-- Logo -->
    <div class="rail-logo">
      <span class="logo-bracket">[</span>R<span class="logo-bracket">]</span>
      RAGBot
    </div>

    <!-- Back link -->
    <button class="rail-back" @click="goBack">
      <svg
        width="13"
        height="13"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M10 3L5 8l5 5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      Back to workspace
    </button>

    <div class="rail-divider" />

    <!-- Workspace section -->
    <div class="rail-body">
      <div class="rail-group-label">Workspace</div>
      <button
        v-for="sec in workspaceSections"
        :key="sec.key"
        class="rail-item"
        :class="{ active: activeSection === sec.key }"
        @click="emit('navigate', sec.key)"
      >
        <!-- General icon -->
        <svg
          v-if="sec.key === 'general'"
          class="rail-icon"
          width="15"
          height="15"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.7"
        >
          <circle cx="8" cy="8" r="3" />
          <path
            d="M8 1v2M8 13v2M1 8h2M13 8h2M3.2 3.2l1.4 1.4M11.4 11.4l1.4 1.4M3.2 12.8l1.4-1.4M11.4 4.6l1.4-1.4"
          />
        </svg>
        <!-- Members icon -->
        <svg
          v-if="sec.key === 'members'"
          class="rail-icon"
          width="15"
          height="15"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.7"
        >
          <circle cx="6" cy="5" r="2.5" />
          <path d="M1 14c0-2.8 2.2-5 5-5" />
          <circle cx="12" cy="8" r="2" />
          <path d="M10 14c0-1.7.9-3 2-3s2 1.3 2 3" />
        </svg>
        <!-- Roles icon -->
        <svg
          v-if="sec.key === 'roles'"
          class="rail-icon"
          width="15"
          height="15"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.7"
        >
          <path d="M8 1l1.8 4L14 5.8l-3 3 .7 4.2L8 11l-3.7 2 .7-4.2-3-3 4.2-.8z" />
        </svg>
        <span class="rail-item-label">{{ sec.label }}</span>
        <span v-if="sec.countKey" class="rail-count">{{ props[sec.countKey] }}</span>
      </button>

      <div class="rail-group-label" style="margin-top: 8px">Account</div>
      <button
        v-for="sec in accountSections"
        :key="sec.key"
        class="rail-item"
        :class="{ active: activeSection === sec.key }"
        @click="emit('navigate', sec.key)"
      >
        <!-- Profile icon -->
        <svg
          v-if="sec.key === 'profile'"
          class="rail-icon"
          width="15"
          height="15"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.7"
        >
          <circle cx="8" cy="6" r="3" />
          <path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" />
        </svg>
        <!-- Security icon -->
        <svg
          v-if="sec.key === 'account'"
          class="rail-icon"
          width="15"
          height="15"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="1.7"
        >
          <rect x="3" y="7" width="10" height="7" rx="1" />
          <path d="M5 7V5a3 3 0 0 1 6 0v2" />
        </svg>
        <span class="rail-item-label">{{ sec.label }}</span>
      </button>
    </div>

    <!-- Footer: user info + theme toggle -->
    <div class="rail-footer">
      <div class="rail-avatar">{{ avatarInitials }}</div>
      <div class="rail-user-info">
        <div class="rail-user-name">{{ currentUser?.full_name }}</div>
      </div>
      <button
        class="rail-theme-btn"
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
          <circle cx="8" cy="8" r="4" />
          <path
            d="M8 1v2M8 13v2M1 8h2M13 8h2M3.2 3.2l1.4 1.4M11.4 11.4l1.4 1.4M3.2 12.8l1.4-1.4M11.4 4.6l1.4-1.4"
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
          <path d="M13.5 10A6 6 0 0 1 6 2.5a6 6 0 1 0 7.5 7.5z" />
        </svg>
      </button>
    </div>
  </aside>
</template>

<style scoped>
.settings-rail {
  width: 210px;
  flex-shrink: 0;
  background: var(--bg-2);
  border-right: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  height: 100vh;
  position: sticky;
  top: 0;
}

.rail-logo {
  padding: 12px 14px 10px;
  border-bottom: 1px solid var(--line);
  font-weight: 700;
  font-size: 14px;
  color: var(--ink);
  display: flex;
  align-items: center;
  gap: 4px;
}

.logo-bracket {
  color: var(--brand);
}

.rail-back {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 10px 10px 4px;
  padding: 7px 10px;
  border-radius: var(--r-sm);
  color: var(--ink-2);
  font-size: var(--t-base);
  font-weight: 500;
  background: transparent;
  border: none;
  cursor: pointer;
  width: calc(100% - 20px);
  text-align: left;
}

.rail-back:hover {
  background: rgba(24, 18, 12, 0.04);
}

[data-theme="dark"] .rail-back:hover {
  background: rgba(240, 235, 227, 0.06);
}

.rail-divider {
  border: none;
  border-top: 1px solid var(--line);
  margin: 4px 12px;
}

.rail-body {
  padding: 4px 8px;
  flex: 1;
  overflow-y: auto;
}

.rail-group-label {
  font-size: var(--t-xs);
  color: var(--ink-4);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 8px 8px 3px;
}

.rail-item {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 7px 10px;
  border-radius: var(--r-sm);
  font-size: var(--t-base);
  color: var(--ink-2);
  background: transparent;
  border: none;
  cursor: pointer;
  width: 100%;
  text-align: left;
  margin-bottom: 1px;
  transition: background var(--dur) var(--ease);
}

.rail-item:hover:not(.active) {
  background: rgba(24, 18, 12, 0.04);
}

[data-theme="dark"] .rail-item:hover:not(.active) {
  background: rgba(240, 235, 227, 0.06);
}

.rail-item.active {
  background: var(--surface);
  color: var(--ink);
  font-weight: 500;
  box-shadow: var(--shadow-1);
}

.rail-item.active .rail-icon {
  color: var(--brand);
}

.rail-icon {
  color: var(--ink-3);
  flex-shrink: 0;
}

.rail-item-label {
  flex: 1;
}

.rail-count {
  font-size: var(--t-xs);
  color: var(--ink-4);
  font-family: var(--font-mono);
}

.rail-footer {
  border-top: 1px solid var(--line);
  padding: 8px 10px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.rail-avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--brand);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  flex-shrink: 0;
}

.rail-user-info {
  flex: 1;
  min-width: 0;
}

.rail-user-name {
  font-size: var(--t-sm);
  font-weight: 500;
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rail-theme-btn {
  width: 28px;
  height: 28px;
  border-radius: var(--r-sm);
  background: transparent;
  border: 1px solid var(--line-2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ink-3);
  cursor: pointer;
  flex-shrink: 0;
}

.rail-theme-btn:hover {
  background: var(--bg);
  color: var(--ink);
}
</style>
