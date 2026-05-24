<script setup>
import AuthShell from "@/components/AuthShell.vue"
import { useAuth } from "@/composables/useAuth"

const { formState, error, loading, sent, emailRules, handleForgotPassword } = useAuth()
</script>

<template>
  <AuthShell>
    <div class="auth-card">
      <template v-if="sent">
        <div class="sent-icon">✉️</div>
        <div class="auth-title">Check your inbox</div>
        <div class="auth-subtitle">
          If that email is registered, a reset link is on its way. It expires in 1 hour.
        </div>
        <router-link to="/login" class="back-link">← Back to sign in</router-link>
      </template>

      <template v-else>
        <div class="auth-title">Reset your password</div>
        <div class="auth-subtitle">Enter your email and we'll send a reset link.</div>

        <a-form :model="formState" layout="vertical" @finish="handleForgotPassword">
          <a-form-item name="email" :rules="emailRules">
            <template #label><span class="field-label">Work email</span></template>
            <a-input v-model:value="formState.email" type="email" placeholder="you@company.com" />
          </a-form-item>

          <div v-if="error" class="form-error">{{ error }}</div>

          <button type="submit" class="btn-brand" :disabled="loading">
            {{ loading ? "Sending…" : "Send reset link →" }}
          </button>
        </a-form>

        <div class="auth-footer">
          <router-link to="/login">← Back to sign in</router-link>
        </div>
      </template>
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
.sent-icon {
  font-size: 40px;
  margin-bottom: 16px;
}
.back-link {
  display: inline-block;
  margin-top: 20px;
  font-size: 13px;
  color: var(--brand);
  font-weight: 500;
  text-decoration: none;
}
.back-link:hover {
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
:deep(.ant-input) {
  background: var(--surface);
  border-color: var(--line-2);
  border-radius: var(--r-sm);
  color: var(--ink);
}
:deep(.ant-input:focus) {
  border-color: var(--brand);
  box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.12);
}
:deep(.ant-form-item-label > label) {
  color: var(--ink);
  font-size: 12.5px;
  font-weight: 500;
}
</style>
