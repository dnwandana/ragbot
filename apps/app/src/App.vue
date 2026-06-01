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
  <RouterView v-if="isAuthPage" />
  <AppLayout v-else>
    <RouterView />
  </AppLayout>
</template>
