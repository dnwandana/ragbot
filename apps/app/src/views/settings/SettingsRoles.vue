<!-- apps/app/src/views/settings/SettingsRoles.vue -->
<script setup>
import { computed, onMounted } from "vue"
import RoleFormModal from "@/components/RoleFormModal.vue"
import { useRoles } from "@/composables/useRoles"

const props = defineProps({
  workspaceId: { type: String, required: true },
})

const { roles, fetchRoles } = useRoles()

onMounted(() => fetchRoles(props.workspaceId))

const displayRoles = computed(() => roles.value ?? [])
</script>

<template>
  <div class="section-wrap">
    <div class="section-hd">
      <div class="section-title">Roles</div>
      <div class="section-sub">Define what members with each role can do in this workspace.</div>
    </div>

    <div class="roles-grid">
      <div v-for="role in displayRoles" :key="role.id" class="role-card">
        <div class="role-card__hd">
          <div class="role-icon">
            <svg
              width="15"
              height="15"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              stroke-width="1.7"
            >
              <path d="M8 1l1.8 4L14 5.8l-3 3 .7 4.2L8 11l-3.7 2 .7-4.2-3-3 4.2-.8z" />
            </svg>
          </div>
          <div>
            <div class="role-name">{{ role.name }}</div>
            <div class="role-sub">{{ role.is_system ? "System role" : "Custom role" }}</div>
          </div>
        </div>
        <p class="role-desc">{{ role.description || "No description." }}</p>
        <div class="role-card__foot">
          <span class="chip">{{ role.member_count ?? 0 }} members</span>
        </div>
      </div>
    </div>

    <div class="cta-row">
      <div class="cta-icon">✦</div>
      <div class="cta-body">
        <div class="cta-title">Need more granular permissions?</div>
        <div class="cta-sub">Custom roles let you define exact permission sets for your team.</div>
      </div>
      <RoleFormModal trigger-label="Create custom role" :workspace-id="workspaceId" />
    </div>
  </div>
</template>

<style scoped>
.section-wrap {
  padding: 28px 36px 60px;
  max-width: 900px;
}
.section-hd {
  margin-bottom: 18px;
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

.roles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}

.role-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r);
  padding: 16px;
  box-shadow: var(--shadow-1);
}
.role-card__hd {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.role-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--bg-2);
  color: var(--ink-3);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.role-name {
  font-size: var(--t-base);
  font-weight: 600;
  color: var(--ink);
}
.role-sub {
  font-size: var(--t-xs);
  color: var(--ink-4);
}
.role-desc {
  font-size: var(--t-sm);
  color: var(--ink-3);
  line-height: 1.5;
  margin: 0 0 12px;
}
.role-card__foot {
  display: flex;
  gap: 6px;
}
.chip {
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

.cta-row {
  display: flex;
  align-items: center;
  gap: 14px;
  background: var(--brand-tint);
  border: 1px solid rgba(255, 107, 53, 0.2);
  border-radius: var(--r);
  padding: 14px 18px;
}
.cta-icon {
  font-size: 20px;
  flex-shrink: 0;
}
.cta-body {
  flex: 1;
}
.cta-title {
  font-size: var(--t-base);
  font-weight: 600;
  color: var(--ink);
}
.cta-sub {
  font-size: var(--t-sm);
  color: var(--ink-3);
  margin-top: 2px;
}
</style>
