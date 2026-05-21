<script setup>
import { ref } from "vue"
import { useRoute } from "vue-router"
import { message } from "ant-design-vue"
import AuthShell from "@/components/AuthShell.vue"
import { resendVerification } from "@/api/auth"

const route = useRoute()
const loading = ref(false)

async function handleResend() {
  loading.value = true
  try {
    await resendVerification(route.query.email)
    message.success("Verification email sent!")
  } catch {
    message.error("Failed to resend. Please try again.")
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthShell>
    <div class="auth-card">
      <div class="verify-icon">📬</div>
      <div class="auth-title">Verify your email</div>
      <div class="auth-subtitle">
        We sent a verification link to <strong>{{ $route.query.email || "your email" }}</strong>.
        Click it to activate your account.
      </div>

      <button class="btn-brand" :disabled="loading" @click="handleResend">
        {{ loading ? "Sending…" : "Resend verification email" }}
      </button>

      <div class="auth-footer">
        <router-link to="/login">← Back to sign in</router-link>
      </div>
    </div>
  </AuthShell>
</template>

<style scoped>
.auth-card { width: 100%; max-width: 380px; text-align: center; }
.verify-icon { font-size: 44px; margin-bottom: 16px; }
.auth-title { font-size: 22px; font-weight: 600; letter-spacing: -0.015em; color: var(--ink); margin-bottom: 4px; }
.auth-subtitle { font-size: 13.5px; color: var(--ink-3); margin-bottom: 28px; line-height: 1.6; }
.btn-brand { width: 100%; padding: 10px 16px; margin-bottom: 20px; background: var(--brand); color: #fff; border: none; border-radius: var(--r-sm); font-size: 14px; font-weight: 500; cursor: pointer; }
.btn-brand:hover:not(:disabled) { background: var(--brand-2); }
.btn-brand:disabled { opacity: 0.6; cursor: not-allowed; }
.auth-footer { font-size: 13px; color: var(--ink-3); }
.auth-footer a { color: var(--ink); font-weight: 500; text-decoration: none; }
.auth-footer a:hover { color: var(--brand); }
</style>
