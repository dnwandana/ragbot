<script setup>
import { computed } from "vue"
import { useRoute } from "vue-router"
import { ConfigProvider } from "ant-design-vue"
import AppLayout from "@/components/AppLayout.vue"
import { buildAntTheme } from "@/config/antd-theme.js"
import { useTheme } from "@/composables/useTheme"
import { routerViewKey } from "@/router/view-key.js"

const route = useRoute()
const { theme } = useTheme()
const antThemeConfig = computed(() => buildAntTheme(theme.value))

const isBare = computed(() => Boolean(route.meta.bare))
</script>

<template>
  <ConfigProvider :theme="antThemeConfig">
    <RouterView v-if="isBare" />
    <AppLayout v-else>
      <RouterView :key="routerViewKey($route)" />
    </AppLayout>
  </ConfigProvider>
</template>
