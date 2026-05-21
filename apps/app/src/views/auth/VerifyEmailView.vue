<script setup>
import { ref, onMounted } from "vue"
import { useRoute } from "vue-router"
import { message } from "ant-design-vue"
import AuthShell from "@/components/AuthShell.vue"
import { verifyEmail, resendVerification } from "@/api/auth"

const route = useRoute()
const loading = ref(false)
const verifying = ref(false)
const verified = ref(false)
const verifyError = ref("")
const email = ref(route.query.email || "")

onMounted(async () => {
  const { token } = route.query
  if (!token) return
  verifying.value = true
  try {
    await verifyEmail(token)
    verified.value = true
  } catch (e) {
    verifyError.value = e.message || "This verification link is invalid or has expired."
  } finally {
    verifying.value = false
  }
})

async function handleResend() {
  loading.value = true
  try {
    await resendVerification(email.value)
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
      <!-- Token present and request in-flight -->
      <template v-if="verifying">
        <div class="verify-icon">📬</div>
        <div class="auth-title">Verifying your email…</div>
        <div class="auth-subtitle">Just a moment.</div>
      </template>

      <!-- Token verified successfully -->
      <template v-else-if="verified">
        <div class="verify-icon">📬</div>
        <div class="auth-title">Email verified!</div>
        <div class="auth-subtitle">Your account is active. Sign in to get started.</div>
        <router-link to="/login" class="btn-brand btn-link">Sign in →</router-link>
      </template>

      <!-- Token invalid or expired -->
      <template v-else-if="verifyError">
        <div class="verify-icon">📬</div>
        <div class="auth-title">Link expired</div>
        <div class="form-error">{{ verifyError }}</div>
        <div class="field-label">Your email address</div>
        <a-input v-model:value="email" placeholder="you@example.com" class="email-input" />
        <button class="btn-brand" :disabled="loading || !email" @click="handleResend">
          {{ loading ? "Sending…" : "Send new verification link" }}
        </button>
        <div class="auth-footer">
          <router-link to="/login">← Back to sign in</router-link>
        </div>
      </template>

      <!-- Default: no token in URL (arrived here right after signup) -->
      <template v-else>
        <div class="verify-icon">📬</div>
        <div class="auth-title">Verify your email</div>
        <div class="auth-subtitle">
          We sent a verification link to <strong>{{ route.query.email || "your email" }}</strong
          >. Click it to activate your account.
        </div>
        <button class="btn-brand" :disabled="loading" @click="handleResend">
          {{ loading ? "Sending…" : "Resend verification email" }}
        </button>
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
  text-align: center;
}
.verify-icon {
  font-size: 44px;
  margin-bottom: 16px;
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
  line-height: 1.6;
}
.form-error {
  font-size: 13px;
  color: var(--err);
  background: var(--err-bg);
  border: 1px solid var(--err-border);
  border-radius: var(--r-sm);
  padding: 10px 12px;
  margin-bottom: 16px;
  text-align: left;
}
.field-label {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--ink);
  text-align: left;
  margin-bottom: 6px;
}
.email-input {
  margin-bottom: 14px;
}
.btn-brand {
  width: 100%;
  padding: 10px 16px;
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
.btn-link {
  display: block;
  text-decoration: none;
  text-align: center;
}
.auth-footer {
  font-size: 13px;
  color: var(--ink-3);
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
}
:deep(.ant-input:focus) {
  border-color: var(--brand);
  box-shadow: 0 0 0 3px rgba(255, 107, 53, 0.12);
}
</style>
