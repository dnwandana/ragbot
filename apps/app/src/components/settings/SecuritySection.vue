<!-- apps/app/src/components/settings/SecuritySection.vue -->
<script setup>
import { ref, computed, onMounted } from "vue"
import { useAuthStore } from "@/stores/auth"
import { useAccount } from "@/composables/useAccount"
import { useSessions } from "@/composables/useSessions"
import { useFormattedTime } from "@/composables/useFormattedTime"
import StrengthMeter from "@/components/StrengthMeter.vue"

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

const { relativeTime } = useFormattedTime()

onMounted(fetchSessions)

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
    <div class="section-hd">
      <div class="section-title">Security</div>
      <div class="section-sub">Your sign-in credentials and account settings.</div>
    </div>

    <!-- Email -->
    <div class="settings-card" style="margin-bottom: 14px">
      <div class="card-row card-row--last">
        <div class="row-label">
          <div class="label-text">Email address</div>
          <div class="label-hint">Used to sign in. Cannot be changed.</div>
        </div>
        <div class="row-control">
          <div class="email-display">
            <span class="email-value">{{ currentUser?.email }}</span>
            <span class="badge-verified">Verified</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Password -->
    <div class="settings-card" style="margin-bottom: 24px">
      <div class="card-row card-row--last">
        <div class="row-label">
          <div class="label-text">Password</div>
        </div>
        <div class="row-control">
          <template v-if="!showPasswordForm">
            <button class="btn-secondary" @click="showPasswordForm = true">Change password</button>
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
      </div>
    </div>

    <!-- Active sessions -->
    <div class="section-hd" style="margin-top: 8px">
      <div style="display: flex; justify-content: space-between; align-items: flex-end; gap: 16px">
        <div>
          <div class="section-title">Active sessions</div>
          <div class="section-sub">Devices and browsers currently signed in to your account.</div>
        </div>
        <button
          v-if="hasOtherSessions"
          class="btn-secondary"
          style="color: var(--err); border-color: var(--err-border)"
          @click="openRevokeAll"
        >
          Log out all other sessions
        </button>
      </div>
    </div>

    <div class="settings-card" style="margin-bottom: 24px">
      <a-table
        :data-source="sessions"
        :loading="sessionsLoading"
        :pagination="false"
        row-key="id"
        size="middle"
      >
        <a-table-column key="device" title="Device" data-index="device">
          <template #default="{ record }">
            <span>{{ record.device }}</span>
            <span v-if="record.is_current" class="badge-verified" style="margin-left: 8px">
              This device
            </span>
          </template>
        </a-table-column>
        <a-table-column
          key="where"
          :title="sessions.some((s) => s.location) ? 'Location' : 'IP address'"
        >
          <template #default="{ record }">
            <div v-if="record.location">
              {{ record.location }}
              <div
                style="font-family: var(--font-mono); font-size: var(--t-xs); color: var(--ink-3)"
              >
                {{ record.ip_address }}
              </div>
            </div>
            <span v-else style="font-family: var(--font-mono)">{{ record.ip_address || "—" }}</span>
          </template>
        </a-table-column>
        <a-table-column key="last_used_at" title="Last active" data-index="last_used_at">
          <template #default="{ record }">{{ relativeTime(record.last_used_at) }}</template>
        </a-table-column>
        <a-table-column key="action" title="" align="right">
          <template #default="{ record }">
            <a-popconfirm
              v-if="!record.is_current"
              title="Revoke this session? The device will be signed out immediately and must log in again."
              ok-text="Revoke"
              cancel-text="Cancel"
              :ok-button-props="{ danger: true }"
              @confirm="confirmRevoke(record.id)"
            >
              <button class="btn-secondary" :disabled="revokingId === record.id">
                {{ revokingId === record.id ? "Revoking…" : "Revoke" }}
              </button>
            </a-popconfirm>
          </template>
        </a-table-column>
      </a-table>
    </div>

    <!-- Log out all other sessions confirm -->
    <a-modal
      v-model:open="showRevokeAll"
      title="Log out all other sessions?"
      :footer="null"
      @cancel="closeRevokeAll"
    >
      <p style="color: var(--ink-2); margin-bottom: 14px">
        This signs out every other device immediately. This device stays signed in. Anyone using
        those devices will need to log in again.
      </p>
      <div style="display: flex; justify-content: flex-end; gap: 8px">
        <button class="btn-ghost" @click="closeRevokeAll">Cancel</button>
        <button class="btn-danger" :disabled="revokingAll" @click="confirmRevokeAll">
          {{ revokingAll ? "Signing out…" : "Log out other sessions" }}
        </button>
      </div>
    </a-modal>

    <!-- Danger zone -->
    <div class="danger-zone">
      <div class="danger-zone__body">
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
      <p style="color: var(--ink-2); margin-bottom: 14px">
        This permanently removes your account and you'll be signed out everywhere. Type
        <strong>delete my account</strong> to confirm.
      </p>
      <a-input
        v-model:value="deleteConfirmText"
        placeholder="delete my account"
        aria-label="Type delete my account to confirm"
        style="margin-bottom: 14px"
      />
      <div style="display: flex; justify-content: flex-end; gap: 8px">
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
.section-hd {
  margin-bottom: 14px;
}
.section-title {
  font-size: var(--t-md);
  font-weight: 600;
  color: var(--ink);
  margin-bottom: 3px;
}
.section-sub {
  font-size: var(--t-sm);
  color: var(--ink-3);
}

.settings-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r);
  box-shadow: var(--shadow-1);
  overflow: hidden;
}
.card-row {
  display: flex;
  gap: 20px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--line);
  align-items: flex-start;
}
.card-row--last {
  border-bottom: none;
}
.row-label {
  width: 140px;
  flex-shrink: 0;
  padding-top: 4px;
}
.label-text {
  font-size: var(--t-base);
  font-weight: 500;
  color: var(--ink);
}
.label-hint {
  font-size: var(--t-xs);
  color: var(--ink-3);
  margin-top: 2px;
}
.row-control {
  flex: 1;
}

.email-display {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.email-value {
  font-family: var(--font-mono);
  font-size: var(--t-base);
  color: var(--ink);
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

.btn-secondary {
  display: inline-flex;
  align-items: center;
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
