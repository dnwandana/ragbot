<script setup>
import { computed } from "vue"
import { useRoute } from "vue-router"
import AppLayout from "@/components/AppLayout.vue"
import SettingsLayout from "@/views/settings/SettingsLayout.vue"

const route = useRoute()

const isAuthPage = computed(() => {
  const authPaths = ["/login", "/signup", "/verify-email", "/forgot-password", "/reset-password"]
  return authPaths.includes(route.path)
})

const isSettingsPage = computed(() => route.path.includes("/settings"))
</script>

<template>
  <RouterView v-if="isAuthPage" />
  <SettingsLayout v-else-if="isSettingsPage">
    <RouterView />
  </SettingsLayout>
  <AppLayout v-else>
    <RouterView />
  </AppLayout>
</template>
