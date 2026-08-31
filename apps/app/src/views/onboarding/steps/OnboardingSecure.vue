<script setup>
import { ref, watch, onMounted } from "vue"
import QRCode from "qrcode"
import {
  ShieldCheck,
  ArrowLeft,
  LoaderCircle,
  CircleAlert,
  Copy,
  Check,
  Download,
} from "lucide-vue-next"
import OtpInput from "@/components/OtpInput.vue"
import { useTwoFactor } from "@/composables/useTwoFactor"
import { copyCodes, downloadCodes } from "@/utils/backupCodes"

const props = defineProps({ ctx: { type: Object, required: true } })
const ctx = props.ctx

const tf = useTwoFactor()
const qrDataUrl = ref("")
const savedAck = ref(false)
const keyCopied = ref(false)
const codesCopied = ref(false)
const error = ref(null)

onMounted(() => tf.fetchStatus())

watch(
  () => tf.otpauthUrl.value,
  async (url) => {
    qrDataUrl.value = url ? await QRCode.toDataURL(url) : ""
  },
)

/** Phase 1 → 2: re-auth and fetch the pending TOTP secret. */
async function handleContinue() {
  error.value = null
  try {
    await tf.confirmPassword()
  } catch {
    error.value = "That password didn't match. Try again."
  }
}

/** Phase 2 → 3: verify the entered code and capture backup codes. */
async function handleVerify() {
  error.value = null
  try {
    await tf.verifyCode()
  } catch {
    error.value = "That code didn't match. Codes refresh every 30 seconds — try the current one."
    tf.code.value = ""
  }
}

/** Copies the manual setup key and flips the icon briefly. */
async function copyKey() {
  await navigator.clipboard?.writeText(tf.secret.value.replace(/\s/g, ""))
  keyCopied.value = true
  setTimeout(() => (keyCopied.value = false), 1600)
}

/** Copies the backup codes and flips the button label briefly. */
async function copyBackup() {
  await copyCodes(tf.backupCodes.value)
  codesCopied.value = true
  setTimeout(() => (codesCopied.value = false), 1600)
}
</script>

<template>
  <div class="ob-head">
    <div class="ob-head-icon"><ShieldCheck :size="20" /></div>
    <div class="ob-eyebrow">Step 2 · Optional</div>
    <h1 class="ob-title">Secure your account</h1>
    <p class="ob-subtitle">
      Add a second step at sign-in with an authenticator app. It takes about a minute — you can also
      do this later in settings.
    </p>
  </div>

  <div class="ob-body-inner">
    <!-- Already enabled (restored session) -->
    <template v-if="tf.status.value.enabled">
      <div class="ob-2fa-hint">
        <ShieldCheck :size="18" />
        <p>Two-factor authentication is already on for your account. You're all set.</p>
      </div>
    </template>

    <!-- Phase 1: confirm password -->
    <template v-else-if="tf.step.value === 1">
      <div class="ob-field">
        <label class="ob-label" for="secure-password">Confirm your password</label>
        <div class="ob-input-wrap">
          <input
            id="secure-password"
            v-model="tf.password.value"
            type="password"
            class="ob-input"
            :class="{ 'is-error': error }"
            placeholder="••••••••"
            autocomplete="current-password"
            @keydown.enter="tf.password.value && handleContinue()"
          />
        </div>
        <div v-if="error" class="ob-error-text"><CircleAlert :size="16" /> {{ error }}</div>
        <div v-else class="ob-hint">Required before we can generate your secret key.</div>
      </div>
      <div class="ob-2fa-hint">
        <ShieldCheck :size="18" />
        <p>
          Two-factor adds a check beyond your password, so a leaked password alone can't get in.
          After you verify, we'll show your one-time backup codes to save.
        </p>
      </div>
    </template>

    <!-- Phase 2: scan & verify -->
    <template v-else-if="tf.step.value === 2">
      <div class="ob-totp">
        <img v-if="qrDataUrl" :src="qrDataUrl" alt="2FA QR code" class="ob-qr" />
        <div class="ob-totp-side">
          <div class="ob-substep">
            <span class="ob-sub-badge">1</span>
            Scan this with your authenticator app (1Password, Authy, Google Authenticator).
          </div>
          <div class="ob-field">
            <span class="ob-hint">Can't scan? Enter this setup key:</span>
            <button type="button" class="ob-secret" title="Copy setup key" @click="copyKey">
              <code>{{ tf.secret.value }}</code>
              <Check v-if="keyCopied" :size="15" class="ob-secret-ok" />
              <Copy v-else :size="15" />
            </button>
          </div>
          <div class="ob-substep">
            <span class="ob-sub-badge">2</span>
            Enter the 6-digit code it shows.
          </div>
          <OtpInput v-model="tf.code.value" :length="6" @complete="handleVerify" />
          <div v-if="error" class="ob-error-text"><CircleAlert :size="16" /> {{ error }}</div>
        </div>
      </div>
    </template>

    <!-- Phase 3: backup codes -->
    <template v-else>
      <div class="ob-2fa-hint ob-2fa-hint--warn">
        <CircleAlert :size="18" />
        <p>
          <strong>Save these somewhere safe.</strong> Each code works once if you lose your
          authenticator. They won't be shown again.
        </p>
      </div>
      <ul class="ob-codes">
        <li v-for="(c, i) in tf.backupCodes.value" :key="c">
          <span class="ob-code-index">{{ String(i + 1).padStart(2, "0") }}</span> {{ c }}
        </li>
      </ul>
      <div class="ob-codes-actions">
        <button
          type="button"
          class="ob-btn ob-btn-secondary"
          @click="downloadCodes(tf.backupCodes.value)"
        >
          <Download :size="14" /> Download
        </button>
        <button type="button" class="ob-btn ob-btn-secondary" @click="copyBackup">
          <template v-if="codesCopied"><Check :size="14" /> Copied</template>
          <template v-else><Copy :size="14" /> Copy</template>
        </button>
        <label class="ob-ack">
          <input v-model="savedAck" type="checkbox" /> I've saved my backup codes
        </label>
      </div>
    </template>
  </div>

  <div class="ob-actions">
    <div class="ob-actions-left">
      <button class="ob-btn ob-btn-ghost" @click="ctx.back()"><ArrowLeft :size="16" /> Back</button>
    </div>
    <div class="ob-actions-right">
      <template v-if="tf.status.value.enabled">
        <button class="ob-btn ob-btn-primary" @click="ctx.advance()">Continue</button>
      </template>
      <template v-else-if="tf.step.value === 1">
        <button class="ob-btn ob-btn-secondary" @click="ctx.skip()">Skip for now</button>
        <button
          class="ob-btn ob-btn-primary"
          :disabled="!tf.password.value || tf.busy.value"
          @click="handleContinue"
        >
          <LoaderCircle v-if="tf.busy.value" class="ob-spin" :size="16" />
          Continue
        </button>
      </template>
      <template v-else-if="tf.step.value === 2">
        <button class="ob-btn ob-btn-secondary" @click="ctx.skip()">Skip for now</button>
        <button
          class="ob-btn ob-btn-primary"
          :disabled="tf.code.value.length < 6 || tf.busy.value"
          @click="handleVerify"
        >
          <LoaderCircle v-if="tf.busy.value" class="ob-spin" :size="16" />
          Verify &amp; enable
        </button>
      </template>
      <template v-else>
        <button class="ob-btn ob-btn-primary" :disabled="!savedAck" @click="ctx.advance()">
          Continue
        </button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.ob-totp {
  display: flex;
  gap: 18px;
  align-items: flex-start;
}
.ob-qr {
  width: 132px;
  height: 132px;
  border: 1px solid var(--line);
  border-radius: var(--r);
  background: #fff;
  padding: 6px;
  flex-shrink: 0;
}
.ob-totp-side {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.ob-secret {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 9px;
  background: var(--bg-2);
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  color: var(--ink-3);
  cursor: pointer;
}
.ob-secret code {
  flex: 1;
  text-align: left;
  font-family: var(--font-mono);
  font-size: var(--t-sm);
  color: var(--ink);
  letter-spacing: 0.04em;
  word-break: break-all;
}
.ob-secret-ok {
  color: var(--ok);
}
.ob-2fa-hint {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 12px 14px;
  background: var(--bg-2);
  border: 1px solid var(--line);
  border-radius: var(--r);
  color: var(--brand);
}
.ob-2fa-hint p {
  margin: 0;
  font-size: var(--t-sm);
  color: var(--ink-3);
  line-height: 1.5;
}
.ob-2fa-hint svg {
  flex-shrink: 0;
  margin-top: 1px;
}
.ob-2fa-hint--warn {
  color: var(--warn);
  background: var(--warn-bg);
  border-color: var(--warn-border);
}
.ob-2fa-hint--warn p {
  color: var(--ink-2);
}
.ob-codes {
  list-style: none;
  margin: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 7px 22px;
  padding: 14px;
  background: var(--bg-2);
  border: 1px solid var(--line);
  border-radius: var(--r);
  font-family: var(--font-mono);
  font-size: var(--t-base);
  color: var(--ink);
  letter-spacing: 0.03em;
}
.ob-code-index {
  color: var(--ink-4);
}
.ob-codes-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ob-ack {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--t-sm);
  color: var(--ink-2);
  margin-left: auto;
  cursor: pointer;
}
</style>
