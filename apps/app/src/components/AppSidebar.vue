<script setup>
import { computed, h } from "vue"
import { useRoute, useRouter } from "vue-router"
import { Menu } from "ant-design-vue"
import {
  AppstoreOutlined,
  DatabaseOutlined,
  MailOutlined,
  MessageOutlined,
  RobotOutlined,
  SettingOutlined,
} from "@ant-design/icons-vue"

const route = useRoute()
const router = useRouter()

const workspaceId = computed(() => route.params.workspaceId)

/**
 * Compute menu items based on current route context.
 * Two states: no workspace (global nav), workspace context (workspace nav).
 */
const menuItems = computed(() => {
  if (workspaceId.value) {
    return [
      {
        key: `/workspaces/${workspaceId.value}/datasets`,
        icon: () => h(DatabaseOutlined),
        label: "Datasets",
      },
      {
        key: `/workspaces/${workspaceId.value}/agents`,
        icon: () => h(RobotOutlined),
        label: "Agents",
      },
      {
        key: `/workspaces/${workspaceId.value}/conversations`,
        icon: () => h(MessageOutlined),
        label: "Conversations",
      },
      {
        key: `/workspaces/${workspaceId.value}/settings`,
        icon: () => h(SettingOutlined),
        label: "Settings",
      },
    ]
  }

  return [
    {
      key: "/workspaces",
      icon: () => h(AppstoreOutlined),
      label: "My Workspaces",
    },
    {
      key: "/invitations",
      icon: () => h(MailOutlined),
      label: "Invitations",
    },
  ]
})

/**
 * Determine the active (selected) menu key based on current route path and query.
 * For settings pages, checks query params to distinguish Settings vs Members.
 * Falls back to longest prefix match for sub-pages.
 */
const selectedKeys = computed(() => {
  const path = route.path
  const query = route.query

  // First pass: exact path + query match
  for (const item of menuItems.value) {
    const [itemPath, itemQuery] = item.key.split("?")
    if (path !== itemPath) continue

    if (itemQuery) {
      // Item has a query string — only match if route query matches
      const itemParams = new URLSearchParams(itemQuery)
      const matches = [...itemParams].every(([k, v]) => query[k] === v)
      if (matches) return [item.key]
    } else {
      // Item has no query string — match only if route also has no relevant query
      const queryKeys = Object.keys(query)
      if (queryKeys.length === 0 || !queryKeys.includes("tab")) {
        return [item.key]
      }
    }
  }

  // Fallback: find the best prefix match (for sub-pages)
  const sorted = [...menuItems.value].sort(
    (a, b) => b.key.split("?")[0].length - a.key.split("?")[0].length,
  )
  for (const item of sorted) {
    const itemPath = item.key.split("?")[0]
    if (path.startsWith(itemPath)) {
      return [item.key]
    }
  }
  return []
})

/**
 * Handle menu item click — navigate to the item's route.
 * @param {object} param - Click event parameter.
 * @param {string} param.key - The route key of the clicked menu item.
 */
function onMenuClick({ key }) {
  const [path, query] = key.split("?")
  if (query) {
    const params = new URLSearchParams(query)
    router.push({ path, query: Object.fromEntries(params) })
  } else {
    router.push(path)
  }
}
</script>

<template>
  <Menu
    mode="inline"
    :selected-keys="selectedKeys"
    :items="menuItems"
    @click="onMenuClick"
    style="border-right: none"
  />
</template>
