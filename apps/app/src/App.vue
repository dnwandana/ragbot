<script setup>
import { computed } from "vue"
import { useRoute } from "vue-router"
import AppLayout from "@/components/AppLayout.vue"

const route = useRoute()

const isAuthPage = computed(() => {
  const authPaths = ["/login", "/signup", "/verify-email", "/forgot-password", "/reset-password"]
  return authPaths.includes(route.path)
})
</script>

<template>
  <!-- Auth pages without layout -->
  <RouterView v-if="isAuthPage" />

  <!-- Protected pages with layout -->
  <AppLayout v-else>
    <RouterView />
  </AppLayout>
</template>
