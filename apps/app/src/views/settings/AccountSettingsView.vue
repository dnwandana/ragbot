<!-- apps/app/src/views/settings/AccountSettingsView.vue -->
<script setup>
import SettingsCanvas from "@/components/settings/SettingsCanvas.vue"
import ProfileSection from "@/components/settings/ProfileSection.vue"
import SecuritySection from "@/components/settings/SecuritySection.vue"
</script>

<template>
  <SettingsCanvas>
    <div class="settings-stack">
      <ProfileSection />
      <SecuritySection />
    </div>
  </SettingsCanvas>
</template>

<style scoped>
.settings-stack {
  display: flex;
  flex-direction: column;
  gap: 36px;
}
</style>
