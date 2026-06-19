<script setup>
import { computed } from "vue"
import { Funnel, Zap, Users, X } from "lucide-vue-next"
import {
  ENTITY_TYPE_OPTIONS,
  ACTION_OPTIONS,
  entityTypeLabel,
  actionLabel,
  memberFilterOptions,
} from "@/components/audit/auditMaps"

const props = defineProps({
  entityType: { type: String, default: null },
  action: { type: String, default: null },
  userId: { type: String, default: null },
  members: { type: Array, default: () => [] },
  count: { type: Number, default: 0 },
  hasFilters: { type: Boolean, default: false },
})
const emit = defineEmits(["update:entityType", "update:action", "update:userId", "clear"])

const memberOptions = computed(() => memberFilterOptions(props.members))
const actorLabel = computed(
  () => memberOptions.value.find((o) => o.value === props.userId)?.label || props.userId,
)

/**
 * Handle a-select change for a given filter field. Emits null when the selection
 * is cleared (allowClear fires with undefined).
 * @param {string} field - The prop/emit field name (entityType | action | userId)
 * @param {string|null|undefined} value - New value from a-select onChange
 */
function onChange(field, value) {
  emit(`update:${field}`, value ?? null)
}

const popupContainer = (trigger) => trigger.parentElement
</script>

<template>
  <div class="afb">
    <div class="afb-row">
      <!-- Event type -->
      <div class="afb-select-wrap" :class="{ active: entityType }">
        <span class="afb-select-icon"><Funnel :size="14" /></span>
        <a-select
          :value="entityType"
          :options="ENTITY_TYPE_OPTIONS"
          :allow-clear="true"
          :get-popup-container="popupContainer"
          placeholder="Event type"
          class="afb-select"
          @change="(v) => onChange('entityType', v)"
        />
      </div>

      <!-- Action -->
      <div class="afb-select-wrap" :class="{ active: action }">
        <span class="afb-select-icon"><Zap :size="14" /></span>
        <a-select
          :value="action"
          :options="ACTION_OPTIONS"
          :allow-clear="true"
          :get-popup-container="popupContainer"
          placeholder="Action"
          class="afb-select"
          @change="(v) => onChange('action', v)"
        />
      </div>

      <!-- Actor -->
      <div class="afb-select-wrap" :class="{ active: userId }">
        <span class="afb-select-icon"><Users :size="14" /></span>
        <a-select
          :value="userId"
          :options="memberOptions"
          :allow-clear="true"
          :get-popup-container="popupContainer"
          placeholder="Actor"
          class="afb-select"
          @change="(v) => onChange('userId', v)"
        />
      </div>
    </div>

    <!-- Active filters row -->
    <div v-if="hasFilters" class="afb-row">
      <span class="afb-count">{{ count }} event{{ count === 1 ? "" : "s" }}</span>
      <span class="afb-vsep" />
      <span v-if="entityType" class="afb-chip">
        <span class="afb-chip-pre">Event type:</span>
        <span class="afb-chip-val">{{ entityTypeLabel(entityType) }}</span>
        <button class="afb-chip-x" aria-label="Remove" @click="emit('update:entityType', null)">
          <X :size="16" />
        </button>
      </span>
      <span v-if="action" class="afb-chip">
        <span class="afb-chip-pre">Action:</span>
        <span class="afb-chip-val">{{ actionLabel(action) }}</span>
        <button class="afb-chip-x" aria-label="Remove" @click="emit('update:action', null)">
          <X :size="16" />
        </button>
      </span>
      <span v-if="userId" class="afb-chip">
        <span class="afb-chip-pre">Actor:</span>
        <span class="afb-chip-val">{{ actorLabel }}</span>
        <button class="afb-chip-x" aria-label="Remove" @click="emit('update:userId', null)">
          <X :size="16" />
        </button>
      </span>
      <button class="afb-clear" @click="emit('clear')"><X :size="16" /> Clear all</button>
    </div>
  </div>
</template>

<style scoped>
.afb {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.afb-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

/* Select wrapper: positions the leading icon beside the a-select */
.afb-select-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
}
.afb-select-icon {
  position: absolute;
  left: 9px;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  color: var(--ink-3);
  pointer-events: none;
}
.afb-select-wrap.active .afb-select-icon {
  color: var(--brand-3);
}

/* a-select override: match the original afb-btn look */
.afb-select-wrap :deep(.ant-select) {
  min-width: 130px;
}
.afb-select-wrap :deep(.ant-select-selector) {
  height: 34px !important;
  padding: 0 28px 0 30px !important;
  background: var(--surface) !important;
  border: 1px solid var(--line-2) !important;
  border-radius: var(--r-sm) !important;
  font-size: var(--t-base) !important;
  font-weight: 500 !important;
  color: var(--ink-2) !important;
  box-shadow: none !important;
  cursor: pointer !important;
  display: flex !important;
  align-items: center !important;
}
.afb-select-wrap :deep(.ant-select-selector:hover),
.afb-select-wrap :deep(.ant-select:hover .ant-select-selector) {
  background: var(--bg-2) !important;
  border-color: var(--line-2) !important;
}
.afb-select-wrap :deep(.ant-select-focused .ant-select-selector),
.afb-select-wrap :deep(.ant-select-selector:focus) {
  box-shadow: none !important;
  border-color: var(--brand) !important;
}
.afb-select-wrap :deep(.ant-select-selection-placeholder) {
  color: var(--ink-2) !important;
  font-weight: 500 !important;
  line-height: 34px !important;
}
.afb-select-wrap :deep(.ant-select-selection-item) {
  line-height: 34px !important;
  font-weight: 500 !important;
}
.afb-select-wrap :deep(.ant-select-arrow) {
  color: var(--ink-3);
  opacity: 0.6;
  font-size: 10px;
}
.afb-select-wrap :deep(.ant-select-clear) {
  color: var(--ink-3);
}

/* Active state: mirrors original .afb-btn.active */
.afb-select-wrap.active :deep(.ant-select-selector) {
  background: var(--brand-tint) !important;
  border-color: rgba(255, 107, 53, 0.25) !important;
  color: var(--brand-3) !important;
}
.afb-select-wrap.active :deep(.ant-select-selection-placeholder) {
  color: var(--brand-3) !important;
}
.afb-select-wrap.active :deep(.ant-select-selection-item) {
  color: var(--brand-3) !important;
}
.afb-select-wrap.active :deep(.ant-select-arrow) {
  color: var(--brand-3);
  opacity: 1;
}

/* Chips row */
.afb-count {
  font-size: var(--t-sm);
  color: var(--ink-3);
}
.afb-vsep {
  width: 1px;
  height: 16px;
  background: var(--line);
  margin: 0 2px;
}
.afb-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 26px;
  padding: 0 5px 0 9px;
  background: var(--surface);
  border: 1px solid var(--line-2);
  border-radius: var(--r-sm);
  font-size: var(--t-sm);
  color: var(--ink-2);
  white-space: nowrap;
}
.afb-chip-pre {
  color: var(--ink-3);
}
.afb-chip-val {
  font-weight: 500;
  color: var(--ink);
}
.afb-chip-x {
  width: 17px;
  height: 17px;
  border-radius: 4px;
  border: none;
  background: transparent;
  color: var(--ink-3);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
}
.afb-chip-x:hover {
  background: var(--bg-2);
  color: var(--err);
}
.afb-clear {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 26px;
  padding: 0 9px;
  background: transparent;
  border: none;
  border-radius: var(--r-sm);
  font-size: var(--t-sm);
  font-weight: 500;
  color: var(--brand-3);
  cursor: pointer;
}
.afb-clear:hover {
  background: var(--bg-2);
}
</style>
