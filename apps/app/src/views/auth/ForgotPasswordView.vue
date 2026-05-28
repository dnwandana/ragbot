<script setup>
import { ref, onUnmounted } from "vue"
import AuthShell from "@/components/AuthShell.vue"
import { useAuth } from "@/composables/useAuth"
import { useAuthStore } from "@/stores/auth.js"

const { formState, error, loading, sent, emailRules, handleForgotPassword } = useAuth()
const authStore = useAuthStore()

const resendCooldown = ref(0)
const resendCount = ref(0)
let resendTimer = null

async function handleResend() {
  if (resendCooldown.value > 0) return
  resendCount.value++
  resendCooldown.value = 45
  resendTimer = setInterval(() => {
    resendCooldown.value = Math.max(0, resendCooldown.value - 1)
    if (resendCooldown.value <= 0) clearInterval(resendTimer)
  }, 1000)
  try {
    await authStore.forgotPassword(formState.email)
  } catch {
    // Silent — same behaviour as initial submit (don't reveal if email exists)
  }
}

onUnmounted(() => {
  clearInterval(resendTimer)
})
</script>

<template>
  <AuthShell>
    <!-- State B: link sent -->
    <div v-if="sent" class="auth-card" style="text-align: center">
      <div class="status-icon status-icon--brand">
        <svg viewBox="0 0 24 24">
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="m22 7-10 6L2 7" />
        </svg>
      </div>
      <div class="auth-eyebrow">Reset requested</div>
      <h1 class="auth-title">Check your email</h1>
      <p class="auth-lede">
        If an account exists for that address, we've sent reset instructions. The link is valid for
        one hour.
      </p>

      <div class="resend-row">
        <span>Didn't get it?</span>
        <button class="resend-btn" :disabled="resendCooldown > 0" @click="handleResend">
          {{ resendCount > 0 && resendCooldown === 0 ? "Send again" : "Resend email" }}
        </button>
        <span v-if="resendCooldown > 0" class="resend-timer">{{ resendCooldown }}s</span>
      </div>

      <div class="auth-foot">
        <router-link to="/login">← Back to sign in</router-link>
      </div>
    </div>

    <!-- State A: form -->
    <div v-else class="auth-card">
      <div class="auth-eyebrow">Reset password</div>
      <h1 class="auth-title">Forgot your password?</h1>
      <p class="auth-lede">
        Enter the email you signed up with and we'll send a link to choose a new password.
      </p>

      <a-form :model="formState" layout="vertical" @finish="handleForgotPassword">
        <a-form-item name="email" label="Email" :rules="emailRules">
          <a-input
            v-model:value="formState.email"
            type="email"
            placeholder="you@work.com"
            autocomplete="email"
          />
        </a-form-item>

        <div v-if="error" class="form-alert form-alert--err">{{ error }}</div>

        <button type="submit" class="btn-primary" :disabled="loading">
          {{ loading ? "Sending…" : "Send reset link" }}
        </button>
      </a-form>

      <div class="auth-foot">
        <router-link to="/login">← Back to sign in</router-link>
      </div>
    </div>
  </AuthShell>
</template>
