<script setup>
import { ChevronRight } from "lucide-vue-next"
import { category, entityIcon, verb, resourceLabel, timeOfDay } from "@/components/audit/auditMaps"
import { auditIcon } from "@/components/audit/auditIcons"
import { relativeTime } from "@/utils/time"

defineProps({
  events: { type: Array, default: () => [] },
  actorFor: { type: Function, required: true },
  selectedId: { type: String, default: null },
})
const emit = defineEmits(["open"])
</script>

<template>
  <div class="at" role="table">
    <div class="at-head at-cols" role="row">
      <div>Actor</div>
      <div>Action</div>
      <div>Category</div>
      <div>Timestamp</div>
      <div />
    </div>

    <div
      v-for="e in events"
      :key="e.id"
      class="at-row at-cols"
      :class="{ 'at-row--sel': selectedId === e.id }"
      role="row"
      tabindex="0"
      @click="emit('open', e)"
      @keydown.enter.prevent="emit('open', e)"
      @keydown.space.prevent="emit('open', e)"
    >
      <!-- Actor -->
      <div class="at-actor">
        <span class="at-avatar" :style="{ background: actorFor(e.user_id).color }">{{
          actorFor(e.user_id).initials
        }}</span>
        <div class="at-actor-text">
          <div class="at-actor-name">{{ actorFor(e.user_id).name }}</div>
          <div class="at-actor-email">{{ actorFor(e.user_id).email }}</div>
        </div>
      </div>

      <!-- Action -->
      <div class="at-action">
        <span class="at-verb">{{ verb(e.action, e.entity_type) }}</span>
        <span class="at-respill">
          <component :is="auditIcon(entityIcon(e.entity_type))" :size="16" />
          <span class="at-res-text">{{ resourceLabel(e) }}</span>
        </span>
      </div>

      <!-- Category -->
      <div>
        <span
          class="at-badge"
          :style="{
            background: category(e.entity_type).softBg,
            color: category(e.entity_type).text,
          }"
        >
          <component :is="auditIcon(category(e.entity_type).icon)" :size="16" />
          {{ category(e.entity_type).label }}
        </span>
      </div>

      <!-- Timestamp -->
      <div class="at-ts">
        <div class="at-rel">{{ relativeTime(e.created_at) }}</div>
        <div class="at-abs">{{ timeOfDay(e.created_at) }}</div>
      </div>

      <!-- Caret -->
      <div class="at-caret"><ChevronRight :size="16" /></div>
    </div>
  </div>
</template>

<style scoped>
.at {
  display: flex;
  flex-direction: column;
}
.at-cols {
  display: grid;
  grid-template-columns: minmax(220px, 1.2fr) minmax(280px, 1.9fr) 190px 180px 34px;
  align-items: center;
  column-gap: 14px;
  padding: 13px 18px;
}
.at-head {
  padding: 10px 18px;
  background: var(--bg-2);
  border-bottom: 1px solid var(--line-2);
  position: sticky;
  top: 0;
  z-index: 2;
  font-size: var(--t-xs);
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink-3);
  border-radius: var(--r-lg) var(--r-lg) 0 0;
}
.at-row {
  border-bottom: 1px solid var(--line);
  cursor: pointer;
  outline: none;
  transition: background var(--dur) var(--ease);
}
.at-row:hover {
  background: var(--bg-2);
}
.at-row:focus-visible {
  background: var(--bg-2);
  box-shadow: inset 0 0 0 2px var(--brand-tint);
}
.at-row--sel {
  background: var(--brand-tint);
  box-shadow: inset 2px 0 0 var(--brand);
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
.at-row:hover .at-caret,
.at-row--sel .at-caret {
  color: var(--brand);
}
</style>
