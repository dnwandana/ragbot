<script setup>
/**
 * RolesTable — pixel-faithful static reproduction of SettingsRoles.vue.
 *
 * Layout reproduced (from real source apps/app/src/views/settings/SettingsRoles.vue):
 *   Built-in roles section  : grid of role cards (name, description, member count chip,
 *                             ShieldCheck icon, Lock icon, "View" link button)
 *   Custom roles section    : list row (ShieldCheck icon tile, name, description,
 *                             member count, System/Custom badge)
 *
 * Ant Design controls recreated with plain HTML:
 *   <Button>               → .rt-link-btn (View button in card footer)
 *   <ShieldCheck> / <Lock> → lucide-vue-next icons
 *
 * Prefix scheme: `rt-` (roles-table) on every new class to avoid bleed with
 * global utilities (.chip, .tablewrap, .spill, .tag, .avatar, etc.).
 * Member-count chip uses scoped `.rt-chip` (matches real app's scoped .chip:
 * neutral pill, --bg-2 bg, --ink-4 text, --line border, 2px 8px padding).
 *
 * Badge color scheme:
 *   System  → neutral/locked: --bg-2 bg, --ink-3 text, --line border
 *   Custom  → brand tint:     --brand-tint bg, --brand-3 text, --color-accent-border border
 *   (dark)  → Custom badge:   --brand text (no tint bg on dark, falls through to --brand-tint
 *             which is already low-contrast-safe; explicit dark override added for text only)
 *
 * Dark selector: .dark (VitePress convention; never [data-theme="dark"]).
 *
 * MockFrame: ADDED (source file had no MockFrame wrapper).
 *   label="ragbot — settings / roles"
 *   caption="Built-in roles are locked; custom roles let you grant a precise set of permissions."
 */
import { ShieldCheck, Lock, Eye } from "lucide-vue-next"

const builtinRoles = [
  { name: "Owner", description: "Full control of the workspace", memberCount: 1 },
  { name: "Admin", description: "Manage members, datasets, and agents", memberCount: 2 },
  { name: "Member", description: "Use agents and chat", memberCount: 5 },
]

const customRoles = [
  { name: "Analyst", description: "Read-only access to datasets and audit log", memberCount: 3 },
]

function memberLabel(count) {
  return `${count} ${count === 1 ? "member" : "members"}`
}
</script>

<template>
  <MockFrame
    label="ragbot — settings / roles"
    caption="Built-in roles are locked; custom roles let you grant a precise set of permissions."
  >
    <!-- ── Section header ── -->
    <div class="rt-section-hd">
      <div class="rt-section-title">Roles</div>
      <div class="rt-section-sub">Define what members with each role can do in this workspace.</div>
    </div>

    <!-- ── Built-in roles ── -->
    <div class="rt-block-hd">Built-in roles</div>
    <div class="rt-roles-grid">
      <div v-for="role in builtinRoles" :key="role.name" class="rt-role-card">
        <div class="rt-card-hd">
          <ShieldCheck :size="16" class="rt-role-icon" />
          <div class="rt-role-name">{{ role.name }}</div>
          <Lock :size="16" class="rt-role-lock" />
        </div>
        <p class="rt-role-desc">{{ role.description }}</p>
        <div class="rt-card-foot">
          <span class="rt-chip">{{ memberLabel(role.memberCount) }}</span>
          <button class="rt-link-btn" type="button"><Eye :size="15" /> View</button>
        </div>
      </div>
    </div>

    <!-- ── Custom roles ── -->
    <div class="rt-block-hd rt-block-hd--spaced">
      <span>Custom roles</span>
      <span class="rt-badge rt-badge--custom">1 custom role</span>
    </div>

    <div class="rt-custom-list">
      <div v-for="role in customRoles" :key="role.name" class="rt-custom-row">
        <span class="rt-custom-icon">
          <ShieldCheck :size="16" />
        </span>
        <div class="rt-custom-text">
          <div class="rt-role-name">{{ role.name }}</div>
          <div class="rt-custom-desc">{{ role.description }}</div>
        </div>
        <div class="rt-custom-count">
          <div class="rt-count-num">{{ role.memberCount }}</div>
          <div class="rt-count-label">members</div>
        </div>
        <div class="rt-custom-actions">
          <span class="rt-badge rt-badge--custom">Custom</span>
          <button class="rt-action-btn" type="button"><Eye :size="14" /> View</button>
        </div>
      </div>
    </div>
  </MockFrame>
</template>

<style scoped>
/* ── section header ── */
.rt-section-hd {
  margin-bottom: 16px;
}
.rt-section-title {
  font-size: var(--t-md);
  font-weight: 600;
  color: var(--ink);
  margin-bottom: 3px;
}
.rt-section-sub {
  font-size: var(--t-sm);
  color: var(--ink-3);
}

/* ── block headings ── */
.rt-block-hd {
  font-size: var(--t-base);
  font-weight: 600;
  color: var(--ink);
  margin-bottom: 10px;
}
.rt-block-hd--spaced {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 24px;
}

/* ── built-in role cards grid ── */
.rt-roles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px;
}
.rt-role-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r);
  padding: 14px;
  box-shadow: var(--shadow-1);
}
.rt-card-hd {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 7px;
}
.rt-role-icon {
  color: var(--ink-3);
  flex: none;
}
.rt-role-name {
  font-size: var(--t-base);
  font-weight: 600;
  color: var(--ink);
  text-transform: capitalize;
  flex: 1;
}
.rt-role-lock {
  color: var(--ink-4);
  flex: none;
}
.rt-role-desc {
  font-size: var(--t-sm);
  color: var(--ink-3);
  line-height: 1.5;
  margin: 0 0 12px;
  min-height: 36px;
}
.rt-card-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.rt-link-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  color: var(--brand-3, var(--brand));
  cursor: pointer;
  font-size: var(--t-sm);
  font-weight: 600;
  padding: 0;
}

/* ── custom roles list ── */
.rt-custom-list {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r);
  overflow: hidden;
  margin-top: 10px;
}
.rt-custom-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 14px;
  border-bottom: 1px solid var(--line);
}
.rt-custom-row:last-child {
  border-bottom: none;
}
.rt-custom-icon {
  width: 32px;
  height: 32px;
  border-radius: var(--r);
  background: var(--brand-tint);
  color: var(--brand);
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
}
.rt-custom-text {
  flex: 1;
  min-width: 0;
}
.rt-custom-desc {
  font-size: var(--t-sm);
  color: var(--ink-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 360px;
  margin-top: 2px;
}
.rt-custom-count {
  text-align: right;
  flex: none;
}
.rt-count-num {
  font-size: var(--t-base);
  font-weight: 600;
  color: var(--ink);
}
.rt-count-label {
  font-size: var(--t-xs);
  color: var(--ink-4);
}
.rt-custom-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: none;
}
.rt-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font: 500 var(--t-sm)/1 var(--font-sans);
  padding: 5px 10px;
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  background: var(--surface);
  color: var(--ink);
  cursor: pointer;
}

/* ── member-count chip (matches SettingsRoles.vue scoped .chip) ── */
.rt-chip {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 20px;
  font-size: var(--t-xs);
  font-weight: 500;
  background: var(--bg-2);
  color: var(--ink-4);
  border: 1px solid var(--line);
}

/* ── System / Custom badges ── */
.rt-badge {
  display: inline-flex;
  align-items: center;
  font: 500 var(--t-xs)/1 var(--font-sans);
  padding: 3px 8px;
  border-radius: 999px;
  white-space: nowrap;
}
.rt-badge--custom {
  background: var(--brand-tint);
  color: var(--brand-3);
  border: 1px solid var(--color-accent-border);
}

/* ── dark overrides ── */
.dark .rt-badge--custom {
  color: var(--brand);
}
.dark .rt-link-btn {
  color: var(--brand);
}
</style>
