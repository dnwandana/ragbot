<!-- apps/app/src/components/settings/SecuritySection.vue -->
<script setup>
import { ref, computed, onMounted } from "vue"
import {
  KeyRound,
  Lock,
  Mail,
  Monitor,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Trash2,
  Info,
  Check,
  Copy,
  Download,
} from "lucide-vue-next"
import { useAuthStore } from "@/stores/auth"
import { useAccount } from "@/composables/useAccount"
import { useSessions } from "@/composables/useSessions"
import { useFormattedTime } from "@/composables/useFormattedTime"
import { useTwoFactor } from "@/composables/useTwoFactor"
import { copyCodes, downloadCodes } from "@/utils/backupCodes"
import StrengthMeter from "@/components/StrengthMeter.vue"
import TwoFactorSetupModal from "./TwoFactorSetupModal.vue"

const authStore = useAuthStore()
const { changingPassword, deletingAccount, submitChangePassword, submitDeleteAccount } =
  useAccount()

const {
  sessions,
  loading: sessionsLoading,
  hasOtherSessions,
  revokingId,
  showRevokeAll,
  revokingAll,
  fetchSessions,
  confirmRevoke,
  openRevokeAll,
  closeRevokeAll,
  confirmRevokeAll,
} = useSessions()

const { relativeTime, calendarDate } = useFormattedTime()

const tf = useTwoFactor()
const showSetup = ref(false)

onMounted(() => {
  fetchSessions()
  tf.fetchStatus()
})

const currentUser = computed(() => authStore.currentUser)

// Password change form state
const showPasswordForm = ref(false)
const passwordForm = ref({ current_password: "", new_password: "", confirm_password: "" })

const passwordsMatch = computed(
  () =>
    passwordForm.value.confirm_password.length > 0 &&
    passwordForm.value.new_password === passwordForm.value.confirm_password,
)

const passwordFormValid = computed(
  () =>
    passwordForm.value.current_password.length > 0 &&
    passwordForm.value.new_password.length >= 8 &&
    passwordsMatch.value,
)

function resetPasswordForm() {
  passwordForm.value = { current_password: "", new_password: "", confirm_password: "" }
  showPasswordForm.value = false
}

async function handleChangePassword() {
  try {
    await submitChangePassword({
      current_password: passwordForm.value.current_password,
      new_password: passwordForm.value.new_password,
    })
    resetPasswordForm()
  } catch {
    // HTTP client already shows message.error() toast
  }
}

// Two-factor disable
const showDisableConfirm = ref(false)
const disablePassword = ref("")
const disableCode = ref("")

/** Opens the turn-off-2FA confirmation dialog. */
function handleDisable() {
  disablePassword.value = ""
  disableCode.value = ""
  showDisableConfirm.value = true
}

/** Confirms turning off 2FA using the entered password and second-factor code. */
async function confirmDisable() {
  try {
    await tf.disable(disablePassword.value, disableCode.value)
    showDisableConfirm.value = false
    disablePassword.value = ""
    disableCode.value = ""
  } catch {
    // HTTP client already shows message.error() toast
  }
}

// Backup-code regeneration
const showRegenConfirm = ref(false)
const regenPassword = ref("")
const regenCode = ref("")
const newCodes = ref(null)
const copied = ref(false)

/** Opens the regenerate-backup-codes dialog. */
function handleRegenerate() {
  regenPassword.value = ""
  regenCode.value = ""
  newCodes.value = null
  copied.value = false
  showRegenConfirm.value = true
}

/** Regenerates backup codes and holds the fresh set for one-time display. */
async function confirmRegenerate() {
  try {
    newCodes.value = await tf.regenerate(regenPassword.value, regenCode.value)
    regenPassword.value = ""
    regenCode.value = ""
  } catch {
    // HTTP client already shows message.error() toast
  }
}

/** Copies the freshly generated codes and flips the button label briefly. */
async function copyNewCodes() {
  await copyCodes(newCodes.value)
  copied.value = true
  setTimeout(() => (copied.value = false), 1600)
}

/** Closes the regenerate dialog and discards the displayed codes. */
function closeRegen() {
  showRegenConfirm.value = false
  newCodes.value = null
}

/**
 * Picks a device icon for a session row.
 *
 * @param {string} device - Parsed device label, e.g. "Safari on iPhone".
 * @returns {Object} A lucide icon component.
 */
function deviceIcon(device) {
  return /iphone|ipad|android|mobile/i.test(device ?? "") ? Smartphone : Monitor
}

// Delete account
const showDeleteConfirm = ref(false)
const deleteConfirmText = ref("")
const deleteEnabled = computed(() => deleteConfirmText.value === "delete my account")

function closeDeleteConfirm() {
  showDeleteConfirm.value = false
  deleteConfirmText.value = ""
}

async function handleDeleteAccount() {
  if (!deleteEnabled.value) return
  await submitDeleteAccount()
}
</script>

<template>
  <div class="section-wrap">
    <!-- Sign-in -->
    <div class="settings-card">
      <div class="card-head">
        <div class="tile tile-neutral"><KeyRound :size="18" /></div>
        <div class="head-body">
          <div class="head-title">Sign-in</div>
          <div class="head-sub">The credentials you use to access your account.</div>
        </div>
      </div>
      <div class="setting-item">
        <div class="tile tile-neutral"><Mail :size="18" /></div>
        <div class="item-body">
          <div class="item-title">Email address <span class="badge-verified">Verified</span></div>
          <div class="item-desc mono-value">{{ currentUser?.email }}</div>
        </div>
        <div class="item-right"><span class="muted-note">Cannot be changed</span></div>
      </div>
      <div class="setting-item setting-item--last">
        <div class="tile tile-neutral"><Lock :size="18" /></div>
        <div class="item-body item-body--grow">
          <div class="item-title">Password</div>
          <template v-if="!showPasswordForm">
            <div class="item-desc">Use a strong password you don't reuse elsewhere.</div>
          </template>
          <template v-else>
            <div class="password-form">
              <div class="form-field">
                <label class="form-label">Current password</label>
                <a-input-password
                  v-model:value="passwordForm.current_password"
                  placeholder="••••••••"
                />
              </div>
              <div class="form-field">
                <label class="form-label">New password</label>
                <a-input-password
                  v-model:value="passwordForm.new_password"
                  placeholder="••••••••"
                />
                <StrengthMeter :password="passwordForm.new_password" />
              </div>
              <div class="form-field">
                <label class="form-label">Confirm new password</label>
                <a-input-password
                  v-model:value="passwordForm.confirm_password"
                  placeholder="••••••••"
                  :status="passwordForm.confirm_password && !passwordsMatch ? 'error' : ''"
                />
                <div v-if="passwordForm.confirm_password && !passwordsMatch" class="field-error">
                  Passwords don't match.
                </div>
              </div>
              <div class="form-actions">
                <button class="btn-ghost" :disabled="changingPassword" @click="resetPasswordForm">
                  Cancel
                </button>
                <button
                  class="btn-primary"
                  :disabled="!passwordFormValid || changingPassword"
                  @click="handleChangePassword"
                >
                  {{ changingPassword ? "Updating…" : "Update password" }}
                </button>
              </div>
            </div>
          </template>
        </div>
        <div v-if="!showPasswordForm" class="item-right">
          <button class="btn-secondary" @click="showPasswordForm = true">Change password</button>
        </div>
      </div>
    </div>

    <!-- Two-factor authentication -->
    <div class="settings-card twofa-card">
      <div class="card-head">
        <div class="tile" :class="tf.status.value.enabled ? 'tile-ok' : 'tile-neutral'">
          <ShieldCheck :size="18" />
        </div>
        <div class="head-body">
          <div class="head-title">Two-factor authentication</div>
          <div class="head-sub">
            {{
              tf.status.value.enabled
                ? "A second step is required at sign-in."
                : "Add a second step at sign-in to keep your account secure."
            }}
          </div>
        </div>
        <span :class="tf.status.value.enabled ? 'badge-verified' : 'badge-off'">
          {{ tf.status.value.enabled ? "On" : "Off" }}
        </span>
      </div>

      <template v-if="!tf.status.value.enabled">
        <div class="setting-item setting-item--last">
          <div class="tile tile-neutral"><Smartphone :size="18" /></div>
          <div class="item-body">
            <div class="item-title">
              Authenticator app <span class="badge-brand">Recommended</span>
            </div>
            <div class="item-desc">
              Time-based 6-digit codes from an app like 1Password, Authy, or Google Authenticator.
            </div>
          </div>
          <div class="item-right">
            <button class="btn-secondary" @click="showSetup = true">Set up</button>
          </div>
        </div>
      </template>
      <template v-else>
        <div class="setting-item">
          <div class="tile tile-ok"><Smartphone :size="18" /></div>
          <div class="item-body">
            <div class="item-title">Authenticator app <span class="badge-verified">On</span></div>
            <div class="item-desc">
              Time-based codes{{
                tf.status.value.enabledAt
                  ? ` · enabled ${calendarDate(tf.status.value.enabledAt)}`
                  : ""
              }}.
            </div>
          </div>
          <div class="item-right">
            <button class="btn-danger-ghost" @click="handleDisable">Turn off</button>
          </div>
        </div>
        <div class="setting-item setting-item--last">
          <div class="tile tile-neutral"><KeyRound :size="18" /></div>
          <div class="item-body">
            <div class="item-title">Backup codes</div>
            <div class="item-desc">
              {{ tf.status.value.backupCodesRemaining }} of 10 unused. Regenerating replaces the
              whole set and shows the new codes once.
            </div>
          </div>
          <div class="item-right">
            <button class="btn-secondary" @click="handleRegenerate">
              <RefreshCw :size="14" /> Regenerate
            </button>
          </div>
        </div>
      </template>
    </div>
    <div v-if="!tf.status.value.enabled" class="info-note">
      <Info :size="15" />
      <span>
        Once enabled, you can also receive a one-time code by email if you lose your authenticator —
        no extra setup needed.
      </span>
    </div>

    <TwoFactorSetupModal v-model:open="showSetup" @enabled="tf.fetchStatus" />

    <!-- Active sessions -->
    <div class="settings-card">
      <div class="card-head">
        <div class="tile tile-neutral"><Monitor :size="18" /></div>
        <div class="head-body">
          <div class="head-title">Active sessions</div>
          <div class="head-sub">Devices and browsers signed in to your account.</div>
        </div>
        <button v-if="hasOtherSessions" class="btn-danger-ghost" @click="openRevokeAll">
          Log out all others
        </button>
      </div>
      <div v-if="sessionsLoading" class="setting-item setting-item--last">
        <div class="item-body"><div class="item-desc">Loading sessions…</div></div>
      </div>
      <div
        v-for="(s, i) in sessions"
        v-else
        :key="s.id"
        class="setting-item"
        :class="{ 'setting-item--last': i === sessions.length - 1 }"
      >
        <div class="tile" :class="s.is_current ? 'tile-ok' : 'tile-neutral'">
          <component :is="deviceIcon(s.device)" :size="18" />
        </div>
        <div class="item-body">
          <div class="item-title">
            {{ s.device }}
            <span v-if="s.is_current" class="badge-verified">This device</span>
          </div>
          <div class="item-desc">
            <template v-if="s.location">{{ s.location }} · </template>
            <span class="mono-value">{{ s.ip_address || "—" }}</span>
            · {{ relativeTime(s.last_used_at) }}
          </div>
        </div>
        <div class="item-right">
          <span v-if="s.is_current" class="muted-note">Current</span>
          <a-popconfirm
            v-else
            title="Revoke this session? The device will be signed out immediately and must log in again."
            ok-text="Revoke"
            cancel-text="Cancel"
            :ok-button-props="{ danger: true }"
            @confirm="confirmRevoke(s.id)"
          >
            <button class="btn-secondary" :disabled="revokingId === s.id">
              {{ revokingId === s.id ? "Revoking…" : "Revoke" }}
            </button>
          </a-popconfirm>
        </div>
      </div>
    </div>

    <!-- Log out all other sessions confirm -->
    <a-modal
      v-model:open="showRevokeAll"
      title="Log out all other sessions?"
      :footer="null"
      @cancel="closeRevokeAll"
    >
      <p class="modal-copy">
        This signs out every other device immediately. This device stays signed in. Anyone using
        those devices will need to log in again.
      </p>
      <div class="modal-actions">
        <button class="btn-ghost" @click="closeRevokeAll">Cancel</button>
        <button class="btn-danger" :disabled="revokingAll" @click="confirmRevokeAll">
          {{ revokingAll ? "Signing out…" : "Log out other sessions" }}
        </button>
      </div>
    </a-modal>

    <!-- Turn off 2FA confirm dialog -->
    <a-modal
      v-model:open="showDisableConfirm"
      title="Turn off two-factor authentication?"
      :footer="null"
      @cancel="showDisableConfirm = false"
    >
      <p class="modal-copy">
        Enter your password and a current authenticator (or backup) code to confirm. Your account
        will no longer require a second step at sign-in.
      </p>
      <a-input-password
        v-model:value="disablePassword"
        placeholder="Current password"
        class="modal-input"
      />
      <a-input
        v-model:value="disableCode"
        placeholder="6-digit code or backup code"
        autocomplete="one-time-code"
        class="modal-input modal-input--gap"
      />
      <div class="modal-actions">
        <button class="btn-ghost" @click="showDisableConfirm = false">Cancel</button>
        <button
          class="btn-danger"
          :disabled="!disablePassword || !disableCode || tf.busy.value"
          @click="confirmDisable"
        >
          {{ tf.busy.value ? "Turning off…" : "Turn off" }}
        </button>
      </div>
    </a-modal>

    <!-- Regenerate backup codes dialog -->
    <a-modal
      v-model:open="showRegenConfirm"
      title="Regenerate backup codes?"
      :footer="null"
      @cancel="closeRegen"
    >
      <template v-if="!newCodes">
        <p class="modal-copy">
          This replaces all your backup codes — the old set stops working immediately. Enter your
          password and a current authenticator (or backup) code to confirm.
        </p>
        <a-input-password
          v-model:value="regenPassword"
          placeholder="Current password"
          class="modal-input"
        />
        <a-input
          v-model:value="regenCode"
          placeholder="6-digit code or backup code"
          autocomplete="one-time-code"
          class="modal-input modal-input--gap"
        />
        <div class="modal-actions">
          <button class="btn-ghost" @click="closeRegen">Cancel</button>
          <button
            class="btn-danger"
            :disabled="!regenPassword || !regenCode || tf.busy.value"
            @click="confirmRegenerate"
          >
            {{ tf.busy.value ? "Regenerating…" : "Regenerate" }}
          </button>
        </div>
      </template>
      <template v-else>
        <p class="modal-copy">
          <strong>Save these now — they won't be shown again.</strong> Each code works once if you
          lose access to your authenticator.
        </p>
        <ul class="codes-grid">
          <li v-for="(c, i) in newCodes" :key="c">
            <span class="code-index">{{ String(i + 1).padStart(2, "0") }}</span> {{ c }}
          </li>
        </ul>
        <div class="codes-actions">
          <button class="btn-secondary" @click="downloadCodes(newCodes)">
            <Download :size="14" /> Download
          </button>
          <button class="btn-secondary" @click="copyNewCodes">
            <template v-if="copied"><Check :size="14" /> Copied</template>
            <template v-else><Copy :size="14" /> Copy</template>
          </button>
          <span class="spacer"></span>
          <button class="btn-primary" @click="closeRegen">Done</button>
        </div>
      </template>
    </a-modal>

    <!-- Danger zone -->
    <div class="danger-zone">
      <div class="danger-zone__body">
        <div class="tile tile-err"><Trash2 :size="17" /></div>
        <div>
          <div class="danger-zone__title">Delete your account</div>
          <div class="danger-zone__desc">
            Permanently removes your account and personal data. You'll be signed out everywhere. As
            workspace owner, transfer ownership first. This can't be undone.
          </div>
        </div>
        <button class="btn-danger" @click="showDeleteConfirm = true">Delete account</button>
      </div>
    </div>

    <!-- Delete confirm dialog -->
    <a-modal
      v-model:open="showDeleteConfirm"
      title="Delete your account?"
      :footer="null"
      @cancel="closeDeleteConfirm"
    >
      <p class="modal-copy">
        This permanently removes your account and you'll be signed out everywhere. Type
        <strong>delete my account</strong> to confirm.
      </p>
      <a-input
        v-model:value="deleteConfirmText"
        placeholder="delete my account"
        aria-label="Type delete my account to confirm"
        class="modal-input modal-input--gap"
      />
      <div class="modal-actions">
        <button class="btn-ghost" @click="closeDeleteConfirm">Cancel</button>
        <button
          class="btn-danger"
          :disabled="!deleteEnabled || deletingAccount"
          @click="handleDeleteAccount"
        >
          {{ deletingAccount ? "Deleting…" : "Delete account" }}
        </button>
      </div>
    </a-modal>
  </div>
</template>

<style scoped>
.section-wrap {
  display: flex;
  flex-direction: column;
  gap: 26px;
}
.settings-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r);
  box-shadow: var(--shadow-1);
  overflow: hidden;
}
.card-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--line);
}
.tile {
  width: 36px;
  height: 36px;
  border-radius: var(--r);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.tile-neutral {
  background: var(--bg-2);
  color: var(--ink-3);
}
.tile-ok {
  background: var(--ok-bg);
  color: var(--ok);
}
.tile-err {
  background: var(--err-bg);
  color: var(--err);
}
.head-body {
  flex: 1;
  min-width: 0;
}
.head-title {
  font-size: var(--t-md);
  font-weight: 600;
  color: var(--ink);
}
.head-sub {
  font-size: var(--t-sm);
  color: var(--ink-3);
  margin-top: 2px;
}
.setting-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--line);
}
.setting-item--last {
  border-bottom: none;
}
.item-body {
  flex: 1;
  min-width: 0;
}
.item-body--grow {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.item-title {
  font-size: var(--t-base);
  font-weight: 600;
  color: var(--ink);
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.item-desc {
  font-size: var(--t-sm);
  color: var(--ink-3);
  margin-top: 3px;
  line-height: 1.5;
}
.item-right {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}
.mono-value {
  font-family: var(--font-mono);
  color: var(--ink-2);
}
.muted-note {
  font-size: var(--t-sm);
  color: var(--ink-4);
}
.badge-verified {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 20px;
  font-size: var(--t-xs);
  font-weight: 500;
  background: var(--ok-bg);
  color: var(--ok);
  border: 1px solid var(--ok-border);
}
.badge-off {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 20px;
  font-size: var(--t-xs);
  font-weight: 500;
  background: var(--bg);
  color: var(--ink-3);
  border: 1px solid var(--line-2);
}
.badge-brand {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 20px;
  font-size: var(--t-xs);
  font-weight: 600;
  background: var(--brand-tint);
  color: var(--brand-3);
  border: 1px solid rgba(255, 107, 53, 0.25);
}

.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
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
.btn-danger-ghost {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 13px;
  background: transparent;
  color: var(--err);
  border: 1px solid transparent;
  border-radius: var(--r-sm);
  font-size: var(--t-base);
  font-weight: 500;
  cursor: pointer;
}
.btn-danger-ghost:hover {
  background: var(--err-bg);
}

.info-note {
  display: flex;
  gap: 9px;
  align-items: flex-start;
  padding: 11px 14px;
  background: var(--bg-2);
  border: 1px solid var(--line);
  border-radius: var(--r);
  font-size: var(--t-sm);
  color: var(--ink-3);
  line-height: 1.5;
  margin-top: -14px;
}
.info-note svg {
  flex-shrink: 0;
  margin-top: 1px;
}

.password-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.form-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.form-label {
  font-size: var(--t-sm);
  font-weight: 500;
  color: var(--ink-2);
}
.field-error {
  font-size: var(--t-xs);
  color: var(--err);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
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

.modal-copy {
  color: var(--ink-2);
  margin-bottom: 14px;
  line-height: 1.55;
}
.modal-input {
  margin-bottom: 10px;
}
.modal-input--gap {
  margin-bottom: 14px;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
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
  align-items: center;
  gap: 8px;
}
.codes-actions .spacer {
  flex: 1;
}

.danger-zone {
  background: var(--surface);
  border: 1px solid var(--err-border);
  border-radius: var(--r);
  box-shadow: var(--shadow-1);
}
.danger-zone__body {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 20px;
}
.danger-zone__title {
  font-size: var(--t-base);
  font-weight: 600;
  color: var(--err);
}
.danger-zone__desc {
  font-size: var(--t-sm);
  color: var(--ink-3);
  margin-top: 3px;
  line-height: 1.5;
  max-width: 480px;
}
.btn-danger {
  display: inline-flex;
  align-items: center;
  padding: 7px 14px;
  background: var(--err);
  color: #fff;
  border: none;
  border-radius: var(--r-sm);
  font-size: var(--t-base);
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
}
.btn-danger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn-danger:not(:disabled):hover {
  background: var(--err-2);
}
</style>
