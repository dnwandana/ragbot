<script setup>
import { computed } from "vue"
import { useRoute } from "vue-router"
import { ConfigProvider } from "ant-design-vue"
import AppLayout from "@/components/AppLayout.vue"
import { antTheme } from "@/config/antd-theme.js"

const route = useRoute()

const isAuthPage = computed(() => {
  const authPaths = ["/login", "/signup", "/verify-email", "/forgot-password", "/reset-password"]
  return authPaths.includes(route.path)
})
</script>

<template>
  <ConfigProvider :theme="antTheme">
    <RouterView v-if="isAuthPage" />
    <AppLayout v-else>
      <RouterView :key="$route.fullPath" />
    </AppLayout>
  </ConfigProvider>
</template>
