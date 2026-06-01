<script setup>
import { ref, computed, watch } from "vue"
import {
  UsergroupAddOutlined,
  MailOutlined,
  DownOutlined,
  PlusOutlined,
  CloseOutlined,
  ArrowLeftOutlined,
  LoadingOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons-vue"

const props = defineProps({
  ctx: { type: Object, required: true },
})
const ctx = props.ctx

const draft = ref("")
const selectedRoleId = ref(null)
const localErr = ref(null)
const roleSelectOpen = ref(false)

watch(
  () => ctx.roles,
  (roles) => {
    if (roles.length && !selectedRoleId.value) {
      selectedRoleId.value = roles[0].id
    }
  },
  { immediate: true },
)

const selectedRole = computed(
  () => ctx.roles.find((r) => r.id === selectedRoleId.value) ?? ctx.roles[0],
)

/**
 * @param {string} s
 * @returns {boolean}
 */
function isEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((s || "").trim())
}

/**
 * @param {string} email
 * @returns {string}
 */
function avatarInitials(email) {
  const name = (email || "")
    .split("@")[0]
    .replace(/[._-]+/g, " ")
    .trim()
  const parts = name.split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?"
}

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
  const existing = new Set(ctx.formData.invites.map((i) => i.email.toLowerCase()))
  const next = [...ctx.formData.invites]
  parts.forEach((p) => {
    if (!existing.has(p.toLowerCase())) {
      next.push({ email: p, role_id: selectedRoleId.value })
    }
  })
  ctx.formData.invites = next
  draft.value = ""
  localErr.value = null
}

/**
 * @param {string} email
 */
function removeInvite(email) {
  ctx.formData.invites = ctx.formData.invites.filter((i) => i.email !== email)
}

/**
 * @param {string} roleId
 */
function pickRole(roleId) {
  selectedRoleId.value = roleId
  roleSelectOpen.value = false
}

/**
 * @param {string} roleId
 * @returns {string}
 */
function roleName(roleId) {
  return ctx.roles.find((r) => r.id === roleId)?.name ?? "—"
}

const inviteCount = computed(() => ctx.formData.invites.length)
</script>

<template>
  <div class="ob-head">
    <div class="ob-head-icon"><UsergroupAddOutlined /></div>
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
        <div class="ob-input-wrap has-prefix" style="flex: 1">
          <span class="ob-input-prefix"><MailOutlined /></span>
          <input
            class="ob-input"
            :class="{ 'is-error': localErr }"
            v-model="draft"
            placeholder="teammate@acme.com"
            @keydown.enter.prevent="addInvite"
            @input="localErr = null"
          />
        </div>

        <div v-if="roleSelectOpen" class="ob-dropdown-backdrop" @click="roleSelectOpen = false" />
        <div v-if="ctx.roles.length" class="ob-select">
          <button
            type="button"
            class="ob-select-btn"
            :class="{ 'is-open': roleSelectOpen }"
            @click="roleSelectOpen = !roleSelectOpen"
          >
            <span>{{ selectedRole?.name ?? "Role" }}</span>
            <DownOutlined style="color: var(--ink-4); font-size: 11px" />
          </button>
          <div v-if="roleSelectOpen" class="ob-select-menu">
            <div
              v-for="role in ctx.roles"
              :key="role.id"
              class="ob-select-item"
              :class="{ 'is-active': role.id === selectedRoleId }"
              @click="pickRole(role.id)"
            >
              {{ role.name }}
            </div>
          </div>
        </div>

        <button type="button" class="ob-btn ob-btn-icon" title="Add" @click="addInvite">
          <PlusOutlined />
        </button>
      </div>
      <div v-if="localErr" class="ob-error-text"><ExclamationCircleOutlined /> {{ localErr }}</div>
      <div v-else class="ob-hint">
        Type an email and press Enter. Paste several — separate with commas.
      </div>
    </div>

    <div v-if="inviteCount" class="ob-invite-list">
      <div class="ob-invite-listhead">
        <span>{{ inviteCount }} {{ inviteCount === 1 ? "person" : "people" }} to invite</span>
        <button class="ob-link" @click="ctx.formData.invites = []">Clear all</button>
      </div>
      <div v-for="inv in ctx.formData.invites" :key="inv.email" class="ob-invite-item">
        <span class="ob-avatar">{{ avatarInitials(inv.email) }}</span>
        <span class="ob-invite-email">{{ inv.email }}</span>
        <span style="font-size: var(--t-sm); color: var(--ink-3); flex-shrink: 0">
          {{ roleName(inv.role_id) }}
        </span>
        <button class="ob-icon-btn" title="Remove" @click="removeInvite(inv.email)">
          <CloseOutlined />
        </button>
      </div>
    </div>
    <div v-else class="ob-invite-empty">
      <UsergroupAddOutlined />
      <span>No invites yet. Add a few teammates, or skip and invite later.</span>
    </div>
  </div>

  <div class="ob-actions">
    <div class="ob-actions-left">
      <button class="ob-btn ob-btn-ghost" @click="ctx.back()"><ArrowLeftOutlined /> Back</button>
    </div>
    <div class="ob-actions-right">
      <button class="ob-btn ob-btn-secondary" @click="ctx.skip()">Skip for now</button>
      <button
        class="ob-btn ob-btn-primary"
        :disabled="inviteCount === 0 || ctx.busy === 'invites'"
        @click="ctx.runAction('invites')"
      >
        <LoadingOutlined v-if="ctx.busy === 'invites'" class="ob-spin" />
        Send {{ inviteCount > 0 ? inviteCount : "" }} {{ inviteCount === 1 ? "invite" : "invites" }}
      </button>
    </div>
  </div>
</template>
