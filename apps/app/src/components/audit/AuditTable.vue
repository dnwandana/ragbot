<script setup>
/**
 * AuditTable — Displays audit-log events in an Ant Design table.
 *
 * Features:
 *   - Actor column with avatar, name, and email
 *   - Action column with verb label and resource pill (icon + label)
 *   - Category column with soft-color badge and category icon
 *   - Timestamp column with relative and absolute time
 *   - Row click and keyboard activation (Enter / Space) emit "open"
 *   - Selected row highlighted via at-row--sel class
 *
 * Props:
 *   - events: array of raw audit-log objects from the API
 *   - actorFor: function(userId) → { name, email, initials, color }
 *   - selectedId: id of the currently open event (or null)
 *
 * Emits:
 *   - open(event) — when a row is clicked or keyboard-activated
 */

import { Table } from "ant-design-vue"
import { ChevronRight } from "lucide-vue-next"
import { category, entityIcon, verb, resourceLabel } from "@/components/audit/auditMaps"
import { auditIcon } from "@/components/audit/auditIcons"
import { useFormattedTime } from "@/composables/useFormattedTime"

const props = defineProps({
  events: { type: Array, default: () => [] },
  actorFor: { type: Function, required: true },
  selectedId: { type: String, default: null },
})

const emit = defineEmits(["open"])

const { relativeTime, timeOfDay } = useFormattedTime()

/**
 * Table column definitions — matches the original five columns.
 * Cell content is rendered via the #bodyCell slot.
 */
const columns = [
  { title: "Actor", key: "actor" },
  { title: "Action", key: "action" },
  { title: "Category", key: "category" },
  { title: "Timestamp", key: "timestamp" },
  { title: "", key: "caret" },
]

/**
 * Build Ant Design customRow attributes for a row, attaching click and
 * keyboard handlers that emit "open" — preserving the original a11y semantics
 * (focusable row, Enter and Space both activate).
 * @param {Object} record - Audit-log event row
 * @returns {Object} Attribute/event object spread onto the <tr>
 */
function customRow(record) {
  return {
    tabindex: 0,
    class: props.selectedId === record.id ? "at-row--sel" : "",
    onClick: () => emit("open", record),
    onKeydown: (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        emit("open", record)
      }
    },
  }
}
</script>

<template>
  <Table
    :columns="columns"
    :data-source="events"
    :row-key="(record) => record.id"
    :pagination="false"
    :custom-row="customRow"
  >
    <template #bodyCell="{ column, record }">
      <!-- Actor -->
      <template v-if="column.key === 'actor'">
        <div class="at-actor">
          <span class="at-avatar" :style="{ background: actorFor(record.user_id).color }">{{
            actorFor(record.user_id).initials
          }}</span>
          <div class="at-actor-text">
            <div class="at-actor-name">{{ actorFor(record.user_id).name }}</div>
            <div class="at-actor-email">{{ actorFor(record.user_id).email }}</div>
          </div>
        </div>
      </template>

      <!-- Action -->
      <template v-else-if="column.key === 'action'">
        <div class="at-action">
          <span class="at-verb">{{ verb(record.action, record.entity_type) }}</span>
          <span class="at-respill">
            <component :is="auditIcon(entityIcon(record.entity_type))" :size="16" />
            <span class="at-res-text">{{ resourceLabel(record) }}</span>
          </span>
        </div>
      </template>

      <!-- Category -->
      <template v-else-if="column.key === 'category'">
        <span
          class="at-badge"
          :style="{
            background: category(record.entity_type).softBg,
            color: category(record.entity_type).text,
          }"
        >
          <component :is="auditIcon(category(record.entity_type).icon)" :size="16" />
          {{ category(record.entity_type).label }}
        </span>
      </template>

      <!-- Timestamp -->
      <template v-else-if="column.key === 'timestamp'">
        <div class="at-ts">
          <div class="at-rel">{{ relativeTime(record.created_at) }}</div>
          <div class="at-abs">{{ timeOfDay(record.created_at) }}</div>
        </div>
      </template>

      <!-- Caret -->
      <template v-else-if="column.key === 'caret'">
        <div class="at-caret"><ChevronRight :size="16" /></div>
      </template>
    </template>
  </Table>
</template>

<style scoped>
:deep(.ant-table) {
  border-radius: var(--r-lg);
  overflow: hidden;
}
:deep(.ant-table-thead > tr > th) {
  background: var(--bg-2);
  font-size: var(--t-xs);
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink-3);
  border-bottom: 1px solid var(--line-2);
}
:deep(.ant-table-tbody > tr > td) {
  border-bottom: 1px solid var(--line);
  padding: 13px 18px;
  cursor: pointer;
}
:deep(.ant-table-tbody > tr:hover > td) {
  background: var(--bg-2) !important;
}
:deep(.ant-table-tbody > tr.at-row--sel > td) {
  background: var(--brand-tint);
  box-shadow: inset 2px 0 0 var(--brand);
}
:deep(.ant-table-tbody > tr:focus-visible > td) {
  background: var(--bg-2);
  box-shadow: inset 0 0 0 2px var(--brand-tint);
}
:deep(.ant-table-tbody > tr) {
  outline: none;
  transition: background var(--dur) var(--ease);
}
:deep(.ant-table-tbody > tr:hover .at-caret),
:deep(.ant-table-tbody > tr.at-row--sel .at-caret) {
  color: var(--brand);
}

.at-actor {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.at-avatar {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: 50%;
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11.5px;
  font-weight: 600;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.12);
}
.at-actor-text {
  min-width: 0;
}
.at-actor-name {
  font-size: var(--t-base);
  font-weight: 500;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.at-actor-email {
  font-size: var(--t-xs);
  color: var(--ink-3);
  font-family: var(--font-mono);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.at-action {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.at-verb {
  font-size: var(--t-base);
  font-weight: 500;
  color: var(--ink);
}
.at-respill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  max-width: 100%;
  padding: 2px 7px;
  background: var(--bg-2);
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  font-family: var(--font-mono);
  font-size: var(--t-xs);
  color: var(--ink-2);
  white-space: nowrap;
  overflow: hidden;
}
.at-respill > :first-child {
  color: var(--ink-3);
  flex-shrink: 0;
}
.at-res-text {
  overflow: hidden;
  text-overflow: ellipsis;
}
.at-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--t-xs);
  font-weight: 500;
  padding: 4px 9px;
  border-radius: var(--r-sm);
  white-space: nowrap;
}
.at-ts {
  line-height: 1.3;
  min-width: 0;
}
.at-rel {
  font-size: var(--t-sm);
  color: var(--ink-2);
  font-weight: 500;
  white-space: nowrap;
}
.at-abs {
  font-size: var(--t-xs);
  color: var(--ink-4);
  font-family: var(--font-mono);
  white-space: nowrap;
}
.at-caret {
  display: flex;
  justify-content: flex-end;
  color: var(--ink-4);
}
</style>
