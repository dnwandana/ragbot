<!-- apps/app/src/views/settings/WorkspaceSettingsView.vue -->
<script setup>
import { ref, computed, onMounted } from "vue"
import { useRoute } from "vue-router"
import SettingsNavRail from "@/components/settings/SettingsNavRail.vue"
import SettingsGeneral from "@/views/settings/SettingsGeneral.vue"
import SettingsMembers from "@/views/settings/SettingsMembers.vue"
import SettingsRoles from "@/views/settings/SettingsRoles.vue"
import SettingsProfile from "@/views/settings/SettingsProfile.vue"
import SettingsAccount from "@/views/settings/SettingsAccount.vue"
import { useWorkspacesStore } from "@/stores/workspaces"
import { useMembersStore } from "@/stores/members"
import { useRolesStore } from "@/stores/roles"

const route = useRoute()
const workspaceId = route.params.workspaceId
const activeSection = ref("general")

const workspacesStore = useWorkspacesStore()
const membersStore = useMembersStore()
const rolesStore = useRolesStore()

const sectionComponents = {
  general: SettingsGeneral,
  members: SettingsMembers,
  roles: SettingsRoles,
  profile: SettingsProfile,
  account: SettingsAccount,
}

const SECTION_TITLES = {
  general: "General",
  members: "Members",
  roles: "Roles",
  profile: "Profile",
  account: "Security",
}

const memberCount = computed(() => membersStore.members.length)
const roleCount = computed(() => rolesStore.roles.filter((r) => !r.is_system).length)
const sectionTitle = computed(() => SECTION_TITLES[activeSection.value])

onMounted(async () => {
  await workspacesStore.fetchWorkspaceById(workspaceId)
})
</script>

<template>
  <div class="settings-view">
    <SettingsNavRail
      :active-section="activeSection"
      :workspace-id="workspaceId"
      :member-count="memberCount"
      :role-count="roleCount"
      @navigate="activeSection = $event"
    />

    <div class="settings-main">
      <!-- Topbar -->
      <header class="settings-topbar">
        <span class="tb-crumb">Settings</span>
        <svg
          class="tb-chevron"
          width="12"
          height="12"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M6 4l4 4-4 4" stroke-linecap="round" />
        </svg>
        <span class="tb-section">{{ sectionTitle }}</span>
      </header>

      <!-- Active section -->
      <div class="settings-content">
        <component :is="sectionComponents[activeSection]" :workspace-id="workspaceId" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-view {
  display: flex;
  height: 100vh;
}

.settings-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}

.settings-topbar {
  flex-shrink: 0;
  height: 48px;
  border-bottom: 1px solid var(--line);
  background: var(--bg);
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 20px;
}

.tb-crumb {
  font-size: var(--t-sm);
  color: var(--ink-3);
}

.tb-chevron {
  color: var(--ink-4);
}

.tb-section {
  font-size: var(--t-md);
  font-weight: 600;
  color: var(--ink);
  letter-spacing: -0.005em;
}

.settings-content {
  flex: 1;
  overflow-y: auto;
}
</style>
