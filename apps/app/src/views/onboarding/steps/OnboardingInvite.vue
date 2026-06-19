<script setup>
import { ref, computed, watch } from "vue"
import { UserPlus, Mail, Plus, X, ArrowLeft, LoaderCircle, CircleAlert } from "lucide-vue-next"

const props = defineProps({
  ctx: { type: Object, required: true },
  invites: { type: Array, default: () => [] },
})
const emit = defineEmits(["update:invites"])
const ctx = props.ctx

/** @type {import("vue").Ref<string>} */
const draft = ref("")

/** @type {import("vue").Ref<string|null>} */
const selectedRoleId = ref(null)

/** @type {import("vue").Ref<string|null>} */
const localErr = ref(null)

watch(
  () => ctx.roles,
  (roles) => {
    if (roles.length && !selectedRoleId.value) {
      selectedRoleId.value = roles[0].id
    }
  },
  { immediate: true },
)

/**
 * Validate that a string looks like an email address.
 * @param {string} s - String to test
 * @returns {boolean}
 */
function isEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((s || "").trim())
}

/**
 * Derive avatar initials from an email address.
 * @param {string} email - The invitee's email
 * @returns {string} One or two uppercase letters, or "?"
 */
function avatarInitials(email) {
  const name = (email || "")
    .split("@")[0]
    .replace(/[._-]+/g, " ")
    .trim()
  const parts = name.split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?"
}

/**
 * Parse the draft field, validate each part as an email, and emit the updated
 * invite list. Clears the draft on success or sets a localErr on the first
 * invalid token.
 */
function addInvite() {
  const parts = draft.value
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
  if (!parts.length) return
  const bad = parts.find((p) => !isEmail(p))
  if (bad) {
    localErr.value = `"${bad}" doesn't look like an email.`
    return
  }
  const existing = new Set(props.invites.map((i) => i.email.toLowerCase()))
  const next = [...props.invites]
  parts.forEach((p) => {
    if (!existing.has(p.toLowerCase())) {
      next.push({ email: p, role_id: selectedRoleId.value })
    }
  })
  emit("update:invites", next)
  draft.value = ""
  localErr.value = null
}

/**
 * Remove a single invite from the list by email address.
 * @param {string} email - Email of the invite to remove
 */
function removeInvite(email) {
  emit(
    "update:invites",
    props.invites.filter((i) => i.email !== email),
  )
}

/**
 * Look up the display name for a role by id.
 * @param {string} roleId - The role id to look up
 * @returns {string} The role name, or "—" if not found
 */
function roleName(roleId) {
  return ctx.roles.find((r) => r.id === roleId)?.name ?? "—"
}

/** @type {import("vue").ComputedRef<number>} */
const inviteCount = computed(() => props.invites.length)

/** @type {import("vue").ComputedRef<Array<{value:string, label:string}>>} */
const roleOptions = computed(() => ctx.roles.map((r) => ({ value: r.id, label: r.name })))
</script>

<template>
  <div class="ob-head">
    <div class="ob-head-icon"><UserPlus :size="16" /></div>
    <div class="ob-eyebrow">Step 2 · Optional</div>
    <h1 class="ob-title">Invite your team</h1>
    <p class="ob-subtitle">
      Add teammates by email and pick a role. They'll get an invite to this workspace.
    </p>
  </div>

  <div class="ob-body-inner">
    <div class="ob-field">
      <label class="ob-label">Email addresses</label>
      <div class="ob-invite-row">
        <!-- Email input: a-input with Mail prefix icon -->
        <div class="ob-input-wrap has-prefix invite-email-wrap">
          <span class="ob-input-prefix"><Mail :size="16" /></span>
          <a-input
            v-model:value="draft"
            class="invite-email-input"
            :class="{ 'is-error': localErr }"
            placeholder="teammate@acme.com"
            :status="localErr ? 'error' : ''"
            @pressEnter="addInvite"
            @change="localErr = null"
          />
        </div>

        <!-- Role selector: a-select -->
        <a-select
          v-if="ctx.roles.length"
          v-model:value="selectedRoleId"
          class="invite-role-select"
          :options="roleOptions"
        />

        <button type="button" class="ob-btn ob-btn-icon" title="Add" @click="addInvite">
          <Plus :size="16" />
        </button>
      </div>
      <div v-if="localErr" class="ob-error-text"><CircleAlert :size="16" /> {{ localErr }}</div>
      <div v-else class="ob-hint">
        Type an email and press Enter. Paste several — separate with commas.
      </div>
    </div>

    <div v-if="inviteCount" class="ob-invite-list">
      <div class="ob-invite-listhead">
        <span>{{ inviteCount }} {{ inviteCount === 1 ? "person" : "people" }} to invite</span>
        <button class="ob-link" @click="emit('update:invites', [])">Clear all</button>
      </div>
      <div v-for="inv in props.invites" :key="inv.email" class="ob-invite-item">
        <span class="ob-avatar">{{ avatarInitials(inv.email) }}</span>
        <span class="ob-invite-email">{{ inv.email }}</span>
        <span style="font-size: var(--t-sm); color: var(--ink-3); flex-shrink: 0">
          {{ roleName(inv.role_id) }}
        </span>
        <button class="ob-icon-btn" title="Remove" @click="removeInvite(inv.email)">
          <X :size="16" />
        </button>
      </div>
    </div>
    <div v-else class="ob-invite-empty">
      <UserPlus :size="16" />
      <span>No invites yet. Add a few teammates, or skip and invite later.</span>
    </div>
  </div>

  <div class="ob-actions">
    <div class="ob-actions-left">
      <button class="ob-btn ob-btn-ghost" @click="ctx.back()"><ArrowLeft :size="16" /> Back</button>
    </div>
    <div class="ob-actions-right">
      <button class="ob-btn ob-btn-secondary" @click="ctx.skip()">Skip for now</button>
      <button
        class="ob-btn ob-btn-primary"
        :disabled="inviteCount === 0 || ctx.busy === 'invites'"
        @click="ctx.runAction('invites')"
      >
        <LoaderCircle v-if="ctx.busy === 'invites'" class="ob-spin" :size="16" />
        Send {{ inviteCount > 0 ? inviteCount : "" }} {{ inviteCount === 1 ? "invite" : "invites" }}
      </button>
    </div>
  </div>
</template>

<style scoped>
/* ── Email input: remove Ant border/background so the ob-input-wrap chrome
   wraps the field correctly, matching the other onboarding steps. ─────────── */
/* Email a-input has a #prefix slot, so Ant wraps it in .ant-input-affix-wrapper.
   The surrounding .ob-input-wrap chrome supplies the visible border, so strip
   Ant's border/background from both the wrapper and the inner input. */
.invite-email-wrap :deep(.ant-input-affix-wrapper),
.invite-email-wrap :deep(.ant-input) {
  border: none;
  box-shadow: none;
  background: transparent;
  flex: 1;
}

.invite-email-wrap.ob-input-wrap.has-prefix {
  flex: 1;
  display: flex;
  align-items: center;
}

/* ── Role select: match the ob-select-btn look ─────────────────────────────── */
.invite-role-select {
  min-width: 110px;
}
.invite-role-select :deep(.ant-select-selector) {
  height: 36px;
  border-radius: var(--r);
  border-color: var(--line-2);
  background: var(--surface);
  color: var(--ink);
  font-size: var(--t-sm);
}
.invite-role-select :deep(.ant-select-selection-item) {
  line-height: 34px;
  color: var(--ink);
}

/* Error state: Ant applies a red border via status="error". */
.invite-email-wrap.is-error :deep(.ant-input-affix-wrapper),
.invite-email-wrap :deep(.ant-input-status-error) {
  border-color: var(--err);
}
</style>
