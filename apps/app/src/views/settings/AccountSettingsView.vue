<!-- apps/app/src/views/settings/AccountSettingsView.vue -->
<script setup>
import SettingsCanvas from "@/components/settings/SettingsCanvas.vue"
import ProfileSection from "@/components/settings/ProfileSection.vue"
import SecuritySection from "@/components/settings/SecuritySection.vue"
</script>

<template>
  <SettingsCanvas>
    <div class="page-hd">
      <div class="page-eyebrow">Your account</div>
      <h1 class="page-title">Account &amp; security</h1>
      <p class="page-sub">
        Manage your personal profile, sign-in, and the devices connected to your account.
      </p>
    </div>
    <div class="settings-stack">
      <ProfileSection />
      <SecuritySection />
    </div>
  </SettingsCanvas>
</template>

<style scoped>
.page-hd {
  max-width: 780px;
  margin: 0 auto 28px;
}
.page-eyebrow {
  font-size: var(--t-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--ink-3);
  margin-bottom: 8px;
}
.page-title {
  font-size: var(--t-xl);
  font-weight: 600;
  letter-spacing: -0.015em;
  line-height: 1.2;
  color: var(--ink);
  margin: 0;
}
.page-sub {
  margin: 8px 0 0;
  font-size: var(--t-md);
  color: var(--ink-3);
  line-height: 1.5;
}
.settings-stack {
  max-width: 780px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 26px;
}
</style>
