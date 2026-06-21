<script setup>
import { useRoute } from "vue-router"
import AuthShell from "@/components/AuthShell.vue"
import { useAuth } from "@/composables/useAuth"

const route = useRoute()
const { formState, error, loading, emailRules, passwordRules, handleSignin } = useAuth()
const version = __APP_VERSION__
</script>

<template>
  <AuthShell>
    <div class="auth-card">
      <a-alert
        v-if="route.query.registered"
        type="success"
        message="Account created! Check your email to verify before signing in."
        style="margin-bottom: 20px"
        show-icon
      />

      <div class="auth-eyebrow">Welcome back</div>
      <h1 class="auth-title">Sign in to RAGBot</h1>
      <p class="auth-lede">
        Pick up the conversation where you left it — your sources and threads are right where you
        left them.
      </p>

      <a-form :model="formState" layout="vertical" @finish="handleSignin">
        <a-form-item name="email" label="Email" :rules="emailRules">
          <a-input
            v-model:value="formState.email"
            type="email"
            placeholder="you@work.com"
            autocomplete="email"
          />
        </a-form-item>

        <a-form-item name="password" :rules="passwordRules">
          <template #label>
            <div class="password-label-row">
              <span>Password</span>
              <router-link to="/forgot-password" class="forgot-link">Forgot password?</router-link>
            </div>
          </template>
          <a-input-password
            v-model:value="formState.password"
            placeholder="Your password"
            autocomplete="current-password"
          />
        </a-form-item>

        <div v-if="error" class="form-alert form-alert--err">{{ error }}</div>

        <button type="submit" class="btn-primary" :disabled="loading">
          {{ loading ? "Signing in…" : "Sign in" }}
        </button>
      </a-form>

      <div class="auth-foot">
        New to RAGBot? <router-link to="/signup">Create an account</router-link>
      </div>
    </div>
    <span class="login-version">v{{ version }}</span>
  </AuthShell>
</template>

<style scoped>
/* Password field label row with inline "Forgot?" link */
.password-label-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  width: 100%;
}

.forgot-link {
  font-size: 10.5px;
  font-weight: 500;
  color: var(--brand-3);
  text-decoration: none;
  /* Override the uppercase from the AntD label parent */
  text-transform: none;
  letter-spacing: 0;
}

.forgot-link:hover {
  color: var(--brand-2);
}

.forgot-link:focus-visible {
  outline: 2px solid var(--brand-3);
  outline-offset: 2px;
  border-radius: 2px;
}

/* Fixed app-version badge, pinned to the bottom-right of the viewport */
.login-version {
  position: fixed;
  right: 12px;
  bottom: 10px;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--ink-4);
  pointer-events: none;
  user-select: none;
}
</style>
