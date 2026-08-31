<!-- apps/app/src/views/auth/TwoFactorChallengeView.vue -->
<script setup>
import { ref, computed, onUnmounted } from "vue"
import { useRouter } from "vue-router"
import { message } from "ant-design-vue"
import AuthShell from "@/components/AuthShell.vue"
import OtpInput from "@/components/OtpInput.vue"
import * as twoFactor from "@/api/twoFactor"
import { useAuthStore } from "@/stores/auth"

const router = useRouter()
const authStore = useAuthStore()
const mode = ref("authenticator") // authenticator | backup | email
const code = ref("")
const busy = ref(false)
const resendCooldown = ref(0)
let cooldownTimer = null

const methodFor = { authenticator: "totp", backup: "backup", email: "email" }

/** Per-mode header copy. */
const COPY = {
  authenticator: {
    eyebrow: "Two-factor authentication",
    title: "Enter your code",
    lede: "Open your authenticator app and enter the 6-digit code for RAGBot.",
  },
  backup: {
    eyebrow: "Backup code",
    title: "Enter a backup code",
    lede: "Use one of the one-time codes you saved when you turned on two-factor.",
  },
  email: {
    eyebrow: "Email code",
    title: "Check your email",
    lede: "We sent a 6-digit code to your email address. Enter it below.",
  },
}

const copy = computed(() => COPY[mode.value])

/** Starts (or restarts) the 30-second email resend cooldown. */
function startCooldown() {
  resendCooldown.value = 30
  clearInterval(cooldownTimer)
  cooldownTimer = setInterval(() => {
    if (resendCooldown.value > 0) resendCooldown.value--
    else clearInterval(cooldownTimer)
  }, 1000)
}

onUnmounted(() => clearInterval(cooldownTimer))

/**
 * Verifies the entered code for the current mode and routes on success.
 *
 * @param {string} [value] - Optional code (OtpInput passes it on complete).
 * @returns {Promise<void>}
 */
async function submit(value) {
  const entered = value ?? code.value
  busy.value = true
  try {
    const res = await twoFactor.verifySignin({ method: methodFor[mode.value], code: entered })
    authStore.setAuthenticatedUser(res.data.data)
    router.push("/workspaces")
  } catch {
    code.value = ""
    // http client shows the error toast
  } finally {
    busy.value = false
  }
}

/**
 * Requests an emailed one-time code and starts the resend cooldown.
 *
 * @returns {Promise<void>}
 */
async function sendEmailCode() {
  try {
    await twoFactor.requestEmailCode()
    message.success("We emailed you a code.")
    startCooldown()
  } catch {
    // toast handled by http client
  }
}

/**
 * Switches mode; requests an email code when entering email mode.
 *
 * @param {string} next - The mode to switch to (authenticator | backup | email).
 * @returns {Promise<void>}
 */
async function switchMode(next) {
  mode.value = next
  code.value = ""
  if (next === "email") await sendEmailCode()
}

defineExpose({ submit, switchMode, mode, resendCooldown })
</script>

<template>
  <AuthShell>
    <header class="challenge-hd">
      <div class="auth-eyebrow">{{ copy.eyebrow }}</div>
      <h1 class="auth-title">{{ copy.title }}</h1>
      <p class="auth-lede">{{ copy.lede }}</p>
    </header>

    <template v-if="mode === 'backup'">
      <label class="field-label" for="backup-code">Backup code</label>
      <input
        id="backup-code"
        v-model="code"
        class="backup-input"
        placeholder="xxxx-xxxx"
        autocomplete="one-time-code"
      />
      <button class="btn-primary" :disabled="busy || !code" @click="submit()">
        Verify &amp; sign in
      </button>
    </template>
    <template v-else>
      <label class="field-label">Verification code</label>
      <OtpInput v-model="code" :length="6" @complete="submit" />
      <button class="btn-primary" :disabled="busy || code.length < 6" @click="submit()">
        Verify &amp; sign in
      </button>
      <div v-if="mode === 'email'" class="resend">
        Didn't get it?
        <button v-if="resendCooldown === 0" class="link-btn" @click="sendEmailCode">
          Send again
        </button>
        <span v-else class="resend-timer">Send again · {{ resendCooldown }}s</span>
      </div>
    </template>

    <div class="alts">
      <a v-if="mode !== 'authenticator'" @click="switchMode('authenticator')"
        >Use authenticator app</a
      >
      <a v-if="mode !== 'backup'" @click="switchMode('backup')">Use a backup code</a>
      <a v-if="mode !== 'email'" @click="switchMode('email')">Email me a code instead</a>
    </div>
  </AuthShell>
</template>

<style scoped>
.challenge-hd {
  margin-bottom: 20px;
}
.auth-eyebrow {
  font-size: var(--t-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--ink-3);
}
.auth-title {
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.018em;
  line-height: 1.15;
  color: var(--ink);
  margin: 6px 0 0;
}
.auth-lede {
  font-size: var(--t-md);
  line-height: 1.55;
  color: var(--ink-3);
  margin: 6px 0 0;
}
.field-label {
  display: block;
  font-size: var(--t-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--ink-3);
  margin-bottom: 8px;
}
.backup-input {
  width: 100%;
  padding: 12px 13px;
  font-family: var(--font-mono);
  font-size: 16px;
  text-align: center;
  letter-spacing: 0.1em;
  border: 1.5px solid var(--line-2);
  border-radius: var(--r-sm);
  background: var(--surface);
  color: var(--ink);
}
.backup-input:focus {
  border-color: var(--brand);
  box-shadow: 0 0 0 2px rgba(255, 107, 53, 0.22);
  outline: none;
}
.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 11px 16px;
  margin-top: 16px;
  background: var(--brand);
  color: #fff;
  border: none;
  border-radius: var(--r);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.btn-primary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.btn-primary:not(:disabled):hover {
  background: var(--brand-2);
}
.resend {
  font-size: var(--t-sm);
  color: var(--ink-3);
  text-align: center;
  margin-top: 12px;
}
.link-btn {
  background: none;
  border: none;
  padding: 0;
  color: var(--brand-3);
  font-size: var(--t-sm);
  font-weight: 500;
  cursor: pointer;
}
.resend-timer {
  color: var(--ink-4);
}
.alts {
  display: flex;
  flex-direction: column;
  gap: 9px;
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid var(--line);
}
.alts a {
  color: var(--brand-3);
  cursor: pointer;
  font-size: var(--t-sm);
  font-weight: 500;
}
.alts a:hover {
  color: var(--brand-2);
}
</style>
