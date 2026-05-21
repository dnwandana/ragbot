<script setup>
import { ref } from "vue"
import { useRoute, useRouter } from "vue-router"
import AuthShell from "@/components/AuthShell.vue"
import { resetPassword } from "@/api/auth"

const route = useRoute()
const router = useRouter()
const password = ref("")
const loading = ref(false)
const error = ref("")

async function handleSubmit() {
  loading.value = true
  error.value = ""
  try {
    await resetPassword({ token: route.query.token, password: password.value })
    router.push("/login")
  } catch (e) {
    error.value = e.message || "Failed to reset password."
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthShell>
    <div class="auth-card">
      <div class="auth-title">Set new password</div>
      <div class="auth-subtitle">Must be at least 8 characters.</div>

      <a-form layout="vertical" @finish="handleSubmit">
        <a-form-item
          name="password"
          :rules="[{ required: true, min: 8, message: 'Password must be at least 8 characters' }]"
        >
          <template #label><span class="field-label">New password</span></template>
          <a-input-password v-model:value="password" placeholder="Min 8 characters" />
        </a-form-item>

        <div v-if="error" class="form-error">{{ error }}</div>

        <button type="submit" class="btn-brand" :disabled="loading">
          {{ loading ? "Resetting…" : "Reset password →" }}
        </button>
      </a-form>

      <div class="auth-footer">
        <router-link to="/login">← Back to sign in</router-link>
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
:deep(.ant-input-affix-wrapper) {
  background: var(--surface);
  border-color: var(--line-2);
  border-radius: var(--r-sm);
}
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
