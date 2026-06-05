<script setup>
import { computed } from "vue"
import { Funnel, Zap, Users, ChevronDown, Check, X } from "lucide-vue-next"
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

/** @param {string} field @param {string} value */
function toggle(field, value) {
  emit(`update:${field}`, props[field] === value ? null : value)
}

const popupContainer = (trigger) => trigger.parentElement
</script>

<template>
  <div class="afb">
    <div class="afb-row">
      <!-- Event type -->
      <a-dropdown :trigger="['click']" :get-popup-container="popupContainer">
        <button class="afb-btn" :class="{ active: entityType }">
          <Funnel :size="16" />
          {{ entityType ? entityTypeLabel(entityType) : "Event type" }}
          <ChevronDown :size="16" class="afb-caret" />
        </button>
        <template #overlay>
          <div class="afb-menu">
            <button
              v-for="o in ENTITY_TYPE_OPTIONS"
              :key="o.value"
              class="afb-item"
              :class="{ on: entityType === o.value }"
              @click="toggle('entityType', o.value)"
            >
              <span class="afb-item-label">{{ o.label }}</span>
              <Check v-if="entityType === o.value" :size="16" class="afb-check" />
            </button>
          </div>
        </template>
      </a-dropdown>

      <!-- Action -->
      <a-dropdown :trigger="['click']" :get-popup-container="popupContainer">
        <button class="afb-btn" :class="{ active: action }">
          <Zap :size="16" />
          {{ action ? actionLabel(action) : "Action" }}
          <ChevronDown :size="16" class="afb-caret" />
        </button>
        <template #overlay>
          <div class="afb-menu">
            <button
              v-for="o in ACTION_OPTIONS"
              :key="o.value"
              class="afb-item"
              :class="{ on: action === o.value }"
              @click="toggle('action', o.value)"
            >
              <span class="afb-item-label">{{ o.label }}</span>
              <Check v-if="action === o.value" :size="16" class="afb-check" />
            </button>
          </div>
        </template>
      </a-dropdown>

      <!-- Actor -->
      <a-dropdown :trigger="['click']" :get-popup-container="popupContainer">
        <button class="afb-btn" :class="{ active: userId }">
          <Users :size="16" />
          {{ userId ? actorLabel : "Actor" }}
          <ChevronDown :size="16" class="afb-caret" />
        </button>
        <template #overlay>
          <div class="afb-menu afb-menu--scroll">
            <button
              v-for="o in memberOptions"
              :key="o.value"
              class="afb-item"
              :class="{ on: userId === o.value }"
              @click="toggle('userId', o.value)"
            >
              <span class="afb-item-label">{{ o.label }}</span>
              <Check v-if="userId === o.value" :size="16" class="afb-check" />
            </button>
            <div v-if="!memberOptions.length" class="afb-empty">No members</div>
          </div>
        </template>
      </a-dropdown>
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
.afb-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 34px;
  padding: 0 11px;
  background: var(--surface);
  border: 1px solid var(--line-2);
  border-radius: var(--r-sm);
  font-size: var(--t-base);
  font-weight: 500;
  color: var(--ink-2);
  cursor: pointer;
  white-space: nowrap;
}
.afb-btn:hover {
  background: var(--bg-2);
}
.afb-btn.active {
  background: var(--brand-tint);
  border-color: rgba(255, 107, 53, 0.25);
  color: var(--brand-3);
}
.afb-caret {
  opacity: 0.6;
  font-size: 10px;
}
.afb-menu {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r);
  box-shadow: var(--shadow-2);
  padding: 6px;
  min-width: 200px;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.afb-menu--scroll {
  max-height: 300px;
  overflow-y: auto;
}
.afb-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 9px;
  width: 100%;
  padding: 7px 8px;
  border: none;
  background: transparent;
  border-radius: var(--r-sm);
  font-size: var(--t-base);
  color: var(--ink);
  cursor: pointer;
  text-align: left;
}
.afb-item:hover {
  background: var(--bg-2);
}
.afb-item.on {
  background: var(--brand-tint);
}
.afb-check {
  color: var(--brand);
  font-size: 12px;
}
.afb-empty {
  padding: 8px;
  font-size: var(--t-sm);
  color: var(--ink-4);
  text-align: center;
}
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
