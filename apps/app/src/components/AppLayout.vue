<script setup>
import { computed, ref, onMounted } from "vue"
import { useRouter, useRoute } from "vue-router"
import { Layout, Button, Space, Typography, Badge, Select } from "ant-design-vue"
import { BellOutlined, LogoutOutlined, UserOutlined } from "@ant-design/icons-vue"
import { useAuthStore } from "@/stores/auth"
import { useWorkspacesStore } from "@/stores/workspaces"
import { useInvitations } from "@/composables/useInvitations"
import AppSidebar from "@/components/AppSidebar.vue"

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const workspacesStore = useWorkspacesStore()
const { pendingCount, fetchMyInvitations } = useInvitations()

// Sidebar collapse state
const collapsed = ref(false)

// Computed
const currentUser = computed(() => authStore.currentUser)

// Workspace selector
const workspaceOptions = computed(() =>
  workspacesStore.workspaces.map((ws) => ({ value: ws.id, label: ws.name })),
)

const currentWorkspaceId = computed(() => route.params.workspaceId || null)

// Only show value in selector when it has a matching option (avoids UUID flash on direct URL nav)
const selectedWorkspaceId = computed(() => {
  if (!currentWorkspaceId.value) return null
  return workspaceOptions.value.some((o) => o.value === currentWorkspaceId.value)
    ? currentWorkspaceId.value
    : null
})

/**
 * Handle workspace selection change.
 * Navigates to the selected workspace's settings page or back to workspaces list.
 * @param {string|null} wsId - The selected workspace ID, or null if cleared.
 */
function onWorkspaceChange(wsId) {
  if (wsId) {
    router.push(`/workspaces/${wsId}/settings`)
  } else {
    router.push("/workspaces")
  }
}

// Fetch workspaces list on mount for the workspace selector
onMounted(() => {
  if (authStore.isAuthenticated) {
    workspacesStore.fetchWorkspaces()
    fetchMyInvitations()
  }
})

// Handle logout
function handleLogout() {
  authStore.logout()
  router.push("/login")
}

// Navigation helper
function navigateTo(path) {
  router.push(path)
}
</script>

<template>
  <Layout style="min-height: 100vh">
    <!-- Header -->
    <Layout.Header
      style="display: flex; align-items: center; justify-content: space-between; padding: 0 24px"
    >
      <!-- Left side: Logo + Workspace selector -->
      <div style="display: flex; align-items: center; gap: 12px">
        <Typography.Title
          :level="4"
          style="color: white; margin: 0; cursor: pointer; white-space: nowrap"
          @click="navigateTo('/workspaces')"
        >
          RAG Chatbot
        </Typography.Title>

        <!-- Workspace selector — always visible -->
        <Select
          :value="selectedWorkspaceId"
          :options="workspaceOptions"
          placeholder="Select workspace"
          style="min-width: 180px"
          :bordered="false"
          allow-clear
          @change="onWorkspaceChange"
          class="header-select"
        />
      </div>

      <!-- Right side: Invitations + User + Logout -->
      <Space :size="16">
        <!-- Invitations badge — shows pending count -->
        <Badge :count="pendingCount" :offset="[-5, 5]">
          <Button type="text" @click="navigateTo('/invitations')" style="color: white">
            <template #icon><BellOutlined /></template>
          </Button>
        </Badge>

        <!-- User info -->
        <Space>
          <UserOutlined style="color: white" />
          <Typography.Text style="color: white">
            {{ currentUser?.full_name }}
          </Typography.Text>
        </Space>

        <!-- Logout -->
        <Button type="text" @click="handleLogout" style="color: white">
          <template #icon>
            <LogoutOutlined />
          </template>
          Logout
        </Button>
      </Space>
    </Layout.Header>

    <!-- Body: Sidebar + Content -->
    <Layout>
      <!-- Sidebar -->
      <Layout.Sider
        v-model:collapsed="collapsed"
        collapsible
        :width="200"
        :collapsed-width="64"
        theme="light"
        style="background: #fff"
      >
        <AppSidebar />
      </Layout.Sider>

      <!-- Content + Footer -->
      <Layout>
        <Layout.Content style="padding: 24px; background: #f5f5f5">
          <div
            style="
              background: white;
              padding: 24px;
              min-height: calc(100vh - 64px - 70px - 48px);
              border-radius: 8px;
            "
          >
            <slot></slot>
          </div>
        </Layout.Content>

        <Layout.Footer style="text-align: center">
          RAG Chatbot ©{{ new Date().getFullYear() }}
        </Layout.Footer>
      </Layout>
    </Layout>
  </Layout>
</template>

<style scoped>
/* Style the header selects to match the dark theme */
:deep(.header-select .ant-select-selector) {
  background: transparent !important;
  color: white !important;
  border-color: rgba(255, 255, 255, 0.3) !important;
}

:deep(.header-select .ant-select-selection-item) {
  color: white !important;
}

:deep(.header-select .ant-select-selection-placeholder) {
  color: rgba(255, 255, 255, 0.5) !important;
}

:deep(.header-select .ant-select-arrow) {
  color: rgba(255, 255, 255, 0.5) !important;
}

:deep(.header-select .ant-select-clear) {
  background: transparent !important;
  color: rgba(255, 255, 255, 0.5) !important;
}
</style>
