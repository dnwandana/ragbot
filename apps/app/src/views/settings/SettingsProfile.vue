<script setup>
import { ref, computed, watch } from "vue"
import { useAuthStore } from "@/stores/auth"
import { useProfile } from "@/composables/useProfile"

const authStore = useAuthStore()
const { saving, saveProfile } = useProfile()

const TIMEZONE_GROUPS = Intl.supportedValuesOf("timeZone").reduce((groups, tz) => {
  const continent = tz.includes("/") ? tz.split("/")[0] : "Other"
  if (!groups[continent]) groups[continent] = []
  groups[continent].push(tz)
  return groups
}, {})

const currentUser = computed(() => authStore.currentUser)

const draft = ref({ full_name: "", timezone: "UTC" })

watch(
  currentUser,
  (u) => {
    if (u) draft.value = { full_name: u.full_name ?? "", timezone: u.timezone ?? "UTC" }
  },
  { immediate: true },
)

const dirty = computed(
  () =>
    draft.value.full_name !== (currentUser.value?.full_name ?? "") ||
    draft.value.timezone !== (currentUser.value?.timezone ?? "UTC"),
)

async function handleSave() {
  const success = await saveProfile({
    full_name: draft.value.full_name.trim(),
    timezone: draft.value.timezone,
  })
  if (!success) return
}

function handleDiscard() {
  draft.value = {
    full_name: currentUser.value?.full_name ?? "",
    timezone: currentUser.value?.timezone ?? "UTC",
  }
}
</script>

<template>
  <div class="section-wrap">
    <div class="section-hd">
      <div class="section-title">Profile</div>
      <div class="section-sub">How you appear to other members of this workspace.</div>
    </div>

    <div class="settings-card">
      <div class="card-row">
        <div class="row-label">
          <div class="label-text">Full name</div>
        </div>
        <div class="row-control">
          <a-input v-model:value="draft.full_name" placeholder="Your name" class="field-input" />
        </div>
      </div>
      <div class="card-row card-row--last">
        <div class="row-label">
          <div class="label-text">Timezone</div>
          <div class="label-hint">Used for timestamps across the app.</div>
        </div>
        <div class="row-control">
          <a-select
            v-model:value="draft.timezone"
            show-search
            :filter-option="
              (input, option) => option.value.toLowerCase().includes(input.toLowerCase())
            "
            class="field-input"
          >
            <a-select-opt-group
              v-for="(zones, continent) in TIMEZONE_GROUPS"
              :key="continent"
              :label="continent"
            >
              <a-select-option v-for="tz in zones" :key="tz" :value="tz">
                {{ tz }}
              </a-select-option>
            </a-select-opt-group>
          </a-select>
        </div>
      </div>
    </div>

    <div class="section-actions">
      <span v-if="dirty" class="dirty-hint">You have unsaved changes.</span>
      <button class="btn-ghost" :disabled="!dirty || saving" @click="handleDiscard">Discard</button>
      <button class="btn-primary" :disabled="!dirty || saving" @click="handleSave">
        {{ saving ? "Saving…" : "Save changes" }}
      </button>
    </div>
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
  width: 160px;
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
.field-input {
  width: 100%;
}

.section-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 14px;
  justify-content: flex-end;
}
.dirty-hint {
  font-size: var(--t-sm);
  color: var(--ink-3);
  margin-right: auto;
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
</style>
