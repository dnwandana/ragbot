<script setup>
import AuthShell from "@/components/AuthShell.vue"
import { useAuth } from "@/composables/useAuth"

const { formState, error, loading, emailRules, passwordRules, handleSignin } = useAuth()
</script>

<template>
  <AuthShell>
    <div class="auth-card">
      <div class="auth-title">Sign in</div>
      <div class="auth-subtitle">Welcome back. Sign in to continue to your workspace.</div>

      <a-alert
        v-if="$route.query.registered"
        type="success"
        message="Account created! Check your email to verify before signing in."
        style="margin-bottom: 20px"
        show-icon
      />

      <a-form :model="formState" layout="vertical" @finish="handleSignin">
        <a-form-item name="email" :rules="emailRules">
          <template #label><span class="field-label">Work email</span></template>
          <a-input v-model:value="formState.email" type="email" placeholder="you@company.com" />
        </a-form-item>

        <a-form-item name="password" :rules="passwordRules">
          <template #label>
            <div class="field-label-row">
              <span class="field-label">Password</span>
              <router-link to="/forgot-password" class="forgot-link">Forgot password?</router-link>
            </div>
          </template>
          <a-input-password v-model:value="formState.password" placeholder="••••••••" />
        </a-form-item>

        <div v-if="error" class="form-error">{{ error }}</div>

        <button type="submit" class="btn-brand" :disabled="loading">
          {{ loading ? "Signing in…" : "Sign in →" }}
        </button>
      </a-form>

      <div class="auth-footer">
        New to RAGbot? <router-link to="/signup">Create an account →</router-link>
      </div>
    </div>
  </AuthShell>
</template>

<style scoped>
.auth-card {
  width: 100%;
  max-width: 380px;
}
.auth-title {
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.015em;
  color: var(--ink);
  margin-bottom: 4px;
}
.auth-subtitle {
  font-size: 13.5px;
  color: var(--ink-3);
  margin-bottom: 28px;
}
.field-label {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--ink);
}
.field-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}
.forgot-link {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--brand);
  text-decoration: none;
}
.forgot-link:hover {
  color: var(--brand-2);
}
.form-error {
  font-size: 13px;
  color: var(--err);
  background: var(--err-bg);
  border: 1px solid var(--err-border);
  border-radius: var(--r-sm);
  padding: 10px 12px;
  margin-bottom: 14px;
}
.btn-brand {
  width: 100%;
  padding: 10px 16px;
  margin-top: 4px;
  margin-bottom: 20px;
  background: var(--brand);
  color: #fff;
  border: none;
  border-radius: var(--r-sm);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}
.btn-brand:hover:not(:disabled) {
  background: var(--brand-2);
}
.btn-brand:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.auth-footer {
  font-size: 13px;
  color: var(--ink-3);
  text-align: center;
}
.auth-footer a {
  color: var(--ink);
  font-weight: 500;
  text-decoration: none;
}
.auth-footer a:hover {
  color: var(--brand);
}
:deep(.ant-input),
:deep(.ant-input-affix-wrapper) {
  background: var(--surface);
  border-color: var(--line-2);
  border-radius: var(--r-sm);
  color: var(--ink);
}
:deep(.ant-input:focus),
:deep(.ant-input-affix-wrapper-focused) {
  border-color: var(--brand);
  box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.12);
}
:deep(.ant-form-item-label > label) {
  color: var(--ink);
  font-size: 12.5px;
  font-weight: 500;
}
</style>
