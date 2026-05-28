<script setup>
import { ref, onMounted, onUnmounted } from "vue"
import { useRoute, useRouter } from "vue-router"
import AuthShell from "@/components/AuthShell.vue"
import StrengthMeter from "@/components/StrengthMeter.vue"
import { useAuth } from "@/composables/useAuth"
import { useAuthStore } from "@/stores/auth.js"

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const { formState, error, loading, passwordRules, resetPasswordConfirmRules } = useAuth()

const invalidLink = ref(false)
const done = ref(false)
const redirectIn = ref(4)
let countdown = null

onMounted(() => {
  if (!route.query.token) {
    invalidLink.value = true
  }
})

async function handleSubmit() {
  error.value = ""
  try {
    await authStore.resetPassword({
      token: route.query.token,
      password: formState.password,
      confirmation_password: formState.confirmation_password,
    })
    done.value = true
    countdown = setInterval(() => {
      redirectIn.value--
      if (redirectIn.value <= 0) {
        clearInterval(countdown)
        router.push("/login")
      }
    }, 1000)
  } catch (e) {
    error.value = e?.response?.data?.message || "Failed to reset password."
  }
}

onUnmounted(() => {
  clearInterval(countdown)
})
</script>

<template>
  <AuthShell>
    <!-- State B: no / expired token -->
    <div v-if="invalidLink" class="auth-card" style="text-align: center">
      <div class="status-icon status-icon--err">
        <svg viewBox="0 0 24 24">
          <path
            d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
          />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </div>
      <div class="auth-eyebrow">Link unusable</div>
      <h1 class="auth-title">Reset link expired</h1>
      <p class="auth-lede">
        Reset links are good for one hour. Request a fresh one and we'll email it over.
      </p>
      <div class="auth-actions">
        <router-link to="/forgot-password" class="btn-primary"> Request a new link </router-link>
        <router-link to="/login" class="btn-ghost"> Back to sign in </router-link>
      </div>
      <div class="auth-card-spacer"></div>
    </div>

    <!-- State C: success -->
    <div v-else-if="done" class="auth-card" style="text-align: center">
      <div class="status-icon status-icon--ok">
        <svg viewBox="0 0 24 24">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      </div>
      <div class="auth-eyebrow">Password updated</div>
      <h1 class="auth-title">You're good to go</h1>
      <p class="auth-lede">
        Your password has been changed. Sign in with the new one to pick up where you left off.
      </p>
      <button class="btn-primary" @click="router.push('/login')">Continue to sign in</button>
      <p class="redirect-countdown">
        Redirecting in <span>{{ redirectIn }}s</span>…
      </p>
      <div class="auth-card-spacer"></div>
    </div>

    <!-- State A: valid token form -->
    <div v-else class="auth-card">
      <div class="auth-eyebrow">Reset password</div>
      <h1 class="auth-title">Choose a new password</h1>
      <p class="auth-lede">
        Pick something memorable and at least 8 characters. Mix in numbers or symbols for a stronger
        result.
      </p>

      <a-form :model="formState" layout="vertical" @finish="handleSubmit">
        <a-form-item name="password" label="New password" :rules="passwordRules">
          <a-input-password
            v-model:value="formState.password"
            placeholder="At least 8 characters"
            autocomplete="new-password"
          />
        </a-form-item>

        <StrengthMeter :password="formState.password" />

        <a-form-item
          name="confirmation_password"
          label="Confirm new password"
          :rules="resetPasswordConfirmRules"
        >
          <a-input-password
            v-model:value="formState.confirmation_password"
            placeholder="Repeat your new password"
            autocomplete="new-password"
          />
        </a-form-item>

        <div v-if="error" class="form-alert form-alert--err">{{ error }}</div>

        <button type="submit" class="btn-primary" :disabled="loading" style="margin-top: 4px">
          {{ loading ? "Updating…" : "Update password" }}
        </button>
      </a-form>

      <div class="auth-foot">
        <router-link to="/login">← Cancel and sign in</router-link>
      </div>
    </div>
  </AuthShell>
</template>
