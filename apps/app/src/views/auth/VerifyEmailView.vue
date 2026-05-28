<script setup>
import { ref, onMounted } from "vue"
import { useRoute, useRouter } from "vue-router"
import { message } from "ant-design-vue"
import AuthShell from "@/components/AuthShell.vue"
import { verifyEmail, resendVerification } from "@/api/auth"

const route = useRoute()
const router = useRouter()

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
    <!-- State A: token present, verification in-flight -->
    <div v-if="verifying" class="auth-card" style="text-align: center">
      <div class="status-icon status-icon--brand">
        <svg viewBox="0 0 24 24">
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="m22 7-10 6L2 7" />
        </svg>
      </div>
      <div class="auth-eyebrow">Verifying…</div>
      <h1 class="auth-title">Hold on a moment</h1>
      <p class="auth-lede">Confirming your email address.</p>
      <div class="auth-card-spacer"></div>
    </div>

    <!-- State B: verification succeeded -->
    <div v-else-if="verified" class="auth-card" style="text-align: center">
      <div class="status-icon status-icon--ok">
        <svg viewBox="0 0 24 24">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      </div>
      <div class="auth-eyebrow">Email verified</div>
      <h1 class="auth-title">You're all set</h1>
      <p class="auth-lede">
        Your email is confirmed. You can start indexing sources and chatting right away.
      </p>
      <div class="auth-actions">
        <button class="btn-primary" @click="router.push('/workspaces')">
          Continue to RAGBot →
        </button>
        <button class="btn-ghost" @click="router.push('/login')">
          Sign in with a different account
        </button>
      </div>
      <div class="auth-card-spacer"></div>
    </div>

    <!-- State C: token invalid or expired -->
    <div v-else-if="verifyError" class="auth-card" style="text-align: center">
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
      <h1 class="auth-title">This link has expired</h1>
      <p class="auth-lede">
        Verification links work for 24 hours. Enter your email below to get a new one.
      </p>
      <div class="verify-email-field">
        <a-input v-model:value="email" placeholder="you@work.com" />
      </div>
      <button class="btn-primary" :disabled="loading || !email" @click="handleResend">
        {{ loading ? "Sending…" : "Send new link" }}
      </button>
      <div class="auth-foot">
        <router-link to="/login">← Back to sign in</router-link>
      </div>
    </div>

    <!-- State D: default — no token in URL (arrived right after signup) -->
    <div v-else class="auth-card" style="text-align: center">
      <div class="status-icon status-icon--brand">
        <svg viewBox="0 0 24 24">
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="m22 7-10 6L2 7" />
        </svg>
      </div>
      <div class="auth-eyebrow">Verify your email</div>
      <h1 class="auth-title">Check your inbox</h1>
      <p class="auth-lede">
        We sent a verification link to <strong>{{ email || "your email" }}</strong
        >. Open it within 24 hours to finish setting up your account.
      </p>
      <div class="recipient-pill">
        <svg
          style="width: 14px; height: 14px; flex-shrink: 0; color: var(--ink-3)"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="m22 7-10 6L2 7" />
        </svg>
        <span>{{ email || "your email" }}</span>
      </div>
      <div class="resend-row">
        <span>Didn't get it?</span>
        <button class="resend-btn" :disabled="loading" @click="handleResend">Resend email</button>
      </div>
      <div class="auth-foot">
        <router-link to="/login">← Back to sign in</router-link>
      </div>
    </div>
  </AuthShell>
</template>

<style scoped>
/* Standalone email input in State C (not inside an a-form) */
.verify-email-field {
  margin-bottom: 12px;
  text-align: left;
}
</style>
