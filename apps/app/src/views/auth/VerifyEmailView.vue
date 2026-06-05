<script setup>
import { ref, onMounted } from "vue"
import { useRoute, useRouter } from "vue-router"
import { message } from "ant-design-vue"
import { Mail, CircleCheck, TriangleAlert } from "lucide-vue-next"
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
        <Mail :size="24" :stroke-width="1.5" />
      </div>
      <div class="auth-eyebrow">Verifying…</div>
      <h1 class="auth-title">Hold on a moment</h1>
      <p class="auth-lede">Confirming your email address.</p>
      <div class="auth-card-spacer"></div>
    </div>

    <!-- State B: verification succeeded -->
    <div v-else-if="verified" class="auth-card" style="text-align: center">
      <div class="status-icon status-icon--ok">
        <CircleCheck :size="24" :stroke-width="1.5" />
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
        <TriangleAlert :size="24" :stroke-width="1.5" />
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
        <Mail :size="24" :stroke-width="1.5" />
      </div>
      <div class="auth-eyebrow">Verify your email</div>
      <h1 class="auth-title">Check your inbox</h1>
      <p class="auth-lede">
        We sent a verification link to <strong>{{ email || "your email" }}</strong
        >. Open it within 24 hours to finish setting up your account.
      </p>
      <div class="recipient-pill">
        <Mail :size="14" :stroke-width="1.6" style="flex-shrink: 0; color: var(--ink-3)" />
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
