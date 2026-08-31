<!-- apps/app/src/components/settings/TwoFactorSetupModal.vue -->
<script setup>
import { ref, computed, watch } from "vue"
import QRCode from "qrcode"
import { Copy, Check, Download, ChevronRight } from "lucide-vue-next"
import OtpInput from "@/components/OtpInput.vue"
import { useTwoFactor } from "@/composables/useTwoFactor"
import { copyCodes, downloadCodes } from "@/utils/backupCodes"

const props = defineProps({ open: { type: Boolean, default: false } })
const emit = defineEmits(["update:open", "enabled"])

const tf = useTwoFactor()
const qrDataUrl = ref("")
const savedAck = ref(false)
const keyCopied = ref(false)
const codesCopied = ref(false)

const titleForStep = computed(
  () =>
    ["Confirm it's you", "Scan & verify", "Save your backup codes"][tf.step.value - 1] ??
    "Two-factor authentication",
)

watch(
  () => tf.otpauthUrl.value,
  async (url) => {
    qrDataUrl.value = url ? await QRCode.toDataURL(url) : ""
  },
)

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      tf.resetWizard()
      savedAck.value = false
      keyCopied.value = false
      codesCopied.value = false
    }
  },
)

/** Closes the modal. */
function close() {
  emit("update:open", false)
}

/** Copies the manual setup key and flips the icon briefly. */
async function copyKey() {
  await navigator.clipboard?.writeText(tf.secret.value.replace(/\s/g, ""))
  keyCopied.value = true
  setTimeout(() => (keyCopied.value = false), 1600)
}

/** Copies the backup codes and flips the button label briefly. */
async function copyBackupCodes() {
  await copyCodes(tf.backupCodes.value)
  codesCopied.value = true
  setTimeout(() => (codesCopied.value = false), 1600)
}

/** Finishes the wizard. */
function finish() {
  emit("enabled")
  close()
}
</script>

<template>
  <a-modal :open="open" :footer="null" @cancel="close">
    <template #title>
      <div class="m-title">{{ titleForStep }}</div>
      <div class="m-step">Step {{ tf.step.value }} of 3</div>
    </template>

    <!-- Step 1: password -->
    <div v-if="tf.step.value === 1">
      <p class="m-copy">Re-enter your password to start turning on two-factor authentication.</p>
      <label class="m-label">Current password</label>
      <a-input-password
        v-model:value="tf.password.value"
        placeholder="••••••••"
        @press-enter="tf.confirmPassword"
      />
      <div class="m-actions">
        <button class="btn-ghost" @click="close">Cancel</button>
        <button
          class="btn-primary"
          :disabled="!tf.password.value || tf.busy.value"
          @click="tf.confirmPassword"
        >
          Continue <ChevronRight :size="14" />
        </button>
      </div>
    </div>

    <!-- Step 2: scan + verify -->
    <div v-else-if="tf.step.value === 2">
      <p class="m-copy">
        Scan the QR code with your authenticator app, then enter the 6-digit code it shows.
      </p>
      <div class="qr-row">
        <img v-if="qrDataUrl" :src="qrDataUrl" alt="2FA QR code" class="qr" />
        <div class="qr-side">
          <div class="m-label">Setup key</div>
          <button class="secret-key" title="Copy setup key" @click="copyKey">
            <code>{{ tf.secret.value }}</code>
            <Check v-if="keyCopied" :size="15" class="ok-ink" />
            <Copy v-else :size="15" />
          </button>
        </div>
      </div>
      <label class="m-label m-label--gap">Verification code</label>
      <OtpInput v-model="tf.code.value" :length="6" @complete="tf.verifyCode" />
      <div class="m-actions">
        <button class="btn-ghost" :disabled="tf.busy.value" @click="tf.step.value = 1">Back</button>
        <button
          class="btn-primary"
          :disabled="tf.code.value.length < 6 || tf.busy.value"
          @click="tf.verifyCode"
        >
          {{ tf.busy.value ? "Verifying…" : "Verify & turn on" }}
        </button>
      </div>
    </div>

    <!-- Step 3: backup codes -->
    <div v-else>
      <p class="m-copy">
        <strong>Save these somewhere safe.</strong> Each code works once if you lose access to your
        authenticator. They won't be shown again.
      </p>
      <ul class="codes-grid">
        <li v-for="(c, i) in tf.backupCodes.value" :key="c">
          <span class="code-index">{{ String(i + 1).padStart(2, "0") }}</span> {{ c }}
        </li>
      </ul>
      <div class="codes-actions">
        <button class="btn-secondary" @click="downloadCodes(tf.backupCodes.value)">
          <Download :size="14" /> Download
        </button>
        <button class="btn-secondary" @click="copyBackupCodes">
          <template v-if="codesCopied"><Check :size="14" /> Copied</template>
          <template v-else><Copy :size="14" /> Copy</template>
        </button>
      </div>
      <label class="ack">
        <input v-model="savedAck" type="checkbox" /> I've saved my backup codes
      </label>
      <div class="m-actions">
        <button class="btn-primary" :disabled="!savedAck" @click="finish">Done</button>
      </div>
    </div>
  </a-modal>
</template>

<style scoped>
.m-title {
  font-size: var(--t-md);
  font-weight: 600;
  color: var(--ink);
}
.m-step {
  font-size: var(--t-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--ink-4);
  margin-top: 2px;
}
.m-copy {
  font-size: var(--t-base);
  color: var(--ink-2);
  line-height: 1.55;
  margin: 0 0 14px;
}
.m-label {
  display: block;
  font-size: var(--t-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--ink-3);
  margin-bottom: 6px;
}
.m-label--gap {
  margin-top: 14px;
}
.m-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}
.qr-row {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}
.qr {
  width: 128px;
  height: 128px;
  border: 1px solid var(--line);
  border-radius: var(--r);
  background: #fff;
  padding: 6px;
  flex-shrink: 0;
}
.qr-side {
  flex: 1;
  min-width: 0;
}
.secret-key {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 7px 9px;
  background: var(--bg-2);
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  color: var(--ink-3);
  cursor: pointer;
}
.secret-key code {
  flex: 1;
  text-align: left;
  font-family: var(--font-mono);
  font-size: var(--t-sm);
  color: var(--ink);
  letter-spacing: 0.04em;
  word-break: break-all;
}
.ok-ink {
  color: var(--ok);
}
.codes-grid {
  list-style: none;
  margin: 0 0 12px;
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
.code-index {
  color: var(--ink-4);
}
.codes-actions {
  display: flex;
  gap: 8px;
}
.ack {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--t-sm);
  color: var(--ink-2);
  margin-top: 12px;
  cursor: pointer;
}
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  background: var(--brand);
  color: #fff;
  border: none;
  border-radius: var(--r-sm);
  font-size: var(--t-base);
  font-weight: 500;
  cursor: pointer;
}
.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn-primary:not(:disabled):hover {
  background: var(--brand-2);
}
.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 13px;
  background: var(--surface);
  color: var(--ink-2);
  border: 1px solid var(--line-2);
  border-radius: var(--r-sm);
  font-size: var(--t-base);
  cursor: pointer;
}
.btn-secondary:hover {
  border-color: var(--ink-2);
  color: var(--ink);
}
.btn-ghost {
  display: inline-flex;
  align-items: center;
  padding: 7px 16px;
  background: transparent;
  color: var(--ink-2);
  border: 1px solid var(--line-2);
  border-radius: var(--r-sm);
  font-size: var(--t-base);
  cursor: pointer;
}
.btn-ghost:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
