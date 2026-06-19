<script setup>
import { ref, computed, watch, onUnmounted } from "vue"
import { X, Copy, Check, Code, ArrowRight } from "lucide-vue-next"
import {
  category,
  entityIcon,
  verb,
  resourceLabel,
  diffRows,
  keyValueRows,
} from "@/components/audit/auditMaps"
import { auditIcon } from "@/components/audit/auditIcons"
import { useFormattedTime } from "@/composables/useFormattedTime"

const props = defineProps({
  event: { type: Object, default: null },
  actor: { type: Object, default: null },
})
const emit = defineEmits(["close"])

const { absoluteDateTime } = useFormattedTime()

const tab = ref("details")
watch(
  () => props.event?.id,
  () => {
    tab.value = "details"
  },
)

const open = computed(() => props.event != null)

const cat = computed(() => (props.event ? category(props.event.entity_type) : null))
const title = computed(() => (props.event ? verb(props.event.action, props.event.entity_type) : ""))
const resource = computed(() => (props.event ? resourceLabel(props.event) : ""))
const diff = computed(() => (props.event ? diffRows(props.event.changes) : null))
const contextRows = computed(() => (props.event ? keyValueRows(props.event.context) : []))

const rawJson = computed(() => (props.event ? JSON.stringify(props.event, null, 2) : ""))

const copiedId = ref(false)
const copiedRaw = ref(false)
let idTimer = null
let rawTimer = null

/**
 * Copy text to the clipboard, flipping a transient "copied" flag only on success.
 * @param {string} text - text to write to the clipboard
 * @param {import("vue").Ref<boolean>} flag - ref toggled to true for 1400ms on success
 * @param {"id"|"raw"} which - selects which debounce timer to reset
 */
async function copy(text, flag, which) {
  try {
    await navigator.clipboard?.writeText(text)
  } catch {
    return
  }
  flag.value = true
  if (which === "id") {
    clearTimeout(idTimer)
    idTimer = setTimeout(() => (flag.value = false), 1400)
  } else {
    clearTimeout(rawTimer)
    rawTimer = setTimeout(() => (flag.value = false), 1400)
  }
}

onUnmounted(() => {
  clearTimeout(idTimer)
  clearTimeout(rawTimer)
})
</script>

<template>
  <a-drawer
    :open="open"
    placement="right"
    :width="460"
    :closable="false"
    :mask="true"
    root-class-name="ad-drawer-root"
    :body-style="{ padding: 0 }"
    :header-style="{ display: 'none' }"
    @close="emit('close')"
  >
    <div v-if="event" class="ad-panel">
      <!-- Header -->
      <div class="ad-head">
        <div class="ad-head-top">
          <span class="ad-icon"
            ><component :is="auditIcon(entityIcon(event.entity_type))" :size="16"
          /></span>
          <div class="ad-titlewrap">
            <div class="ad-title">{{ title }}</div>
            <div class="ad-res">{{ resource }}</div>
          </div>
          <button class="ad-iconbtn" aria-label="Close" @click="emit('close')">
            <X :size="16" />
          </button>
        </div>
        <div class="ad-meta">
          <span class="ad-badge" :style="{ background: cat.softBg, color: cat.text }">
            <component :is="auditIcon(cat.icon)" :size="16" />
            {{ cat.label }}
          </span>
          <span style="flex: 1" />
          <button class="ad-idpill" @click="copy(event.id, copiedId, 'id')">
            <Check v-if="copiedId" :size="16" />
            <Copy v-else :size="16" />
            {{ copiedId ? "Copied" : event.id }}
          </button>
        </div>
        <div class="ad-tabs">
          <button class="ad-tab" :class="{ on: tab === 'details' }" @click="tab = 'details'">
            Details
          </button>
          <button class="ad-tab" :class="{ on: tab === 'raw' }" @click="tab = 'raw'">
            <Code :size="16" /> Raw JSON
          </button>
        </div>
      </div>

      <!-- Body -->
      <div class="ad-body">
        <template v-if="tab === 'details'">
          <div class="ad-seclabel">Event</div>
          <div class="ad-field">
            <div class="ad-fl">Action</div>
            <div class="ad-fv">{{ title }}</div>
          </div>
          <div class="ad-field">
            <div class="ad-fl">Resource</div>
            <div class="ad-fv mono">{{ resource }}</div>
          </div>
          <div class="ad-field">
            <div class="ad-fl">Entity type</div>
            <div class="ad-fv mono">{{ event.entity_type }}</div>
          </div>
          <div class="ad-field">
            <div class="ad-fl">Category</div>
            <div class="ad-fv">{{ cat.label }}</div>
          </div>
          <div class="ad-field">
            <div class="ad-fl">Occurred</div>
            <div class="ad-fv">{{ absoluteDateTime(event.created_at) }}</div>
          </div>

          <template v-if="diff">
            <div class="ad-divider" />
            <div class="ad-seclabel">
              Changes
              <span class="ad-note">{{ diff.length }} field{{ diff.length > 1 ? "s" : "" }}</span>
            </div>
            <div v-for="row in diff" :key="row.field" class="ad-diffbox">
              <div class="ad-diffhd">{{ row.field }}</div>
              <div class="ad-diffrow">
                <span class="ad-old">{{ row.before }}</span>
                <ArrowRight :size="16" style="color: var(--ink-4)" />
                <span class="ad-new">{{ row.after }}</span>
              </div>
            </div>
          </template>

          <div class="ad-divider" />
          <div class="ad-seclabel">Actor</div>
          <div v-if="actor" class="ad-actorcard">
            <span class="ad-avatar" :style="{ background: actor.color }">{{ actor.initials }}</span>
            <div>
              <div class="ad-actorname">{{ actor.name }}</div>
              <div class="ad-actoremail">{{ actor.email }}</div>
            </div>
          </div>

          <template v-if="contextRows.length">
            <div class="ad-divider" />
            <div class="ad-seclabel">Context</div>
            <div class="ad-kvtable">
              <div v-for="[k, v] in contextRows" :key="k" class="ad-kvrow">
                <span class="ad-k">{{ k }}</span>
                <span class="ad-v">{{ v }}</span>
              </div>
            </div>
          </template>
        </template>

        <template v-else>
          <div class="ad-rawwrap">
            <button class="ad-copybtn" @click="copy(rawJson, copiedRaw, 'raw')">
              <Check v-if="copiedRaw" :size="16" /><Copy v-else :size="16" />
              {{ copiedRaw ? "Copied" : "Copy" }}
            </button>
            <pre class="ad-pre">{{ rawJson }}</pre>
          </div>
        </template>
      </div>
    </div>
  </a-drawer>
</template>

<style>
.ad-drawer-root .ad-panel {
  height: 100%;
  background: var(--surface);
  display: flex;
  flex-direction: column;
}
.ad-drawer-root .ad-head {
  padding: 16px 20px 14px;
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
}
.ad-drawer-root .ad-head-top {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.ad-drawer-root .ad-icon {
  width: 36px;
  height: 36px;
  border-radius: var(--r);
  background: var(--brand-tint);
  color: var(--brand-3);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.ad-drawer-root .ad-titlewrap {
  flex: 1;
  min-width: 0;
}
.ad-drawer-root .ad-title {
  font-size: var(--t-lg);
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.25;
  color: var(--ink);
}
.ad-drawer-root .ad-res {
  font-size: var(--t-sm);
  color: var(--ink-3);
  margin-top: 2px;
  font-family: var(--font-mono);
  word-break: break-all;
}
.ad-drawer-root .ad-iconbtn {
  width: 30px;
  height: 30px;
  border-radius: var(--r-sm);
  background: transparent;
  border: none;
  color: var(--ink-3);
  cursor: pointer;
  flex-shrink: 0;
}
.ad-drawer-root .ad-iconbtn:hover {
  background: var(--bg-2);
  color: var(--ink);
}
.ad-drawer-root .ad-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
  flex-wrap: wrap;
}
.ad-drawer-root .ad-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--t-xs);
  font-weight: 500;
  padding: 4px 9px;
  border-radius: var(--r-sm);
}
.ad-drawer-root .ad-idpill {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 28px;
  padding: 0 9px;
  background: var(--bg-2);
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  font-family: var(--font-mono);
  font-size: var(--t-sm);
  color: var(--ink-2);
  cursor: pointer;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ad-drawer-root .ad-tabs {
  display: flex;
  gap: 2px;
  margin-top: 14px;
  background: var(--bg-2);
  padding: 3px;
  border-radius: var(--r-sm);
  width: fit-content;
}
.ad-drawer-root .ad-tab {
  height: 28px;
  padding: 0 14px;
  border-radius: var(--r-sm);
  border: none;
  background: transparent;
  font-size: var(--t-sm);
  color: var(--ink-3);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.ad-drawer-root .ad-tab.on {
  background: var(--surface);
  box-shadow: var(--shadow-1);
  font-weight: 600;
  color: var(--ink);
}
.ad-drawer-root .ad-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px 20px 24px;
}
.ad-drawer-root .ad-seclabel {
  font-size: var(--t-xs);
  font-weight: 600;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--ink-3);
  padding: 10px 0 4px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.ad-drawer-root .ad-note {
  font-size: var(--t-xs);
  color: var(--ink-4);
  text-transform: none;
  letter-spacing: 0;
}
.ad-drawer-root .ad-field {
  display: grid;
  grid-template-columns: 118px 1fr;
  gap: 12px;
  align-items: baseline;
  padding: 8px 0;
}
.ad-drawer-root .ad-fl {
  font-size: var(--t-sm);
  color: var(--ink-3);
}
.ad-drawer-root .ad-fv {
  font-size: var(--t-base);
  color: var(--ink);
  line-height: 1.5;
  word-break: break-word;
}
.ad-drawer-root .ad-fv.mono {
  font-family: var(--font-mono);
}
.ad-drawer-root .ad-divider {
  height: 1px;
  background: var(--line);
  margin: 10px 0;
}
.ad-drawer-root .ad-diffbox {
  border: 1px solid var(--line);
  border-radius: var(--r);
  overflow: hidden;
  background: var(--bg);
  margin-bottom: 8px;
}
.ad-drawer-root .ad-diffhd {
  padding: 7px 11px;
  border-bottom: 1px solid var(--line);
  font-family: var(--font-mono);
  font-size: var(--t-sm);
  color: var(--ink-2);
  background: var(--bg-2);
}
.ad-drawer-root .ad-diffrow {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 11px;
  flex-wrap: wrap;
}
.ad-drawer-root .ad-old {
  font-family: var(--font-mono);
  font-size: var(--t-sm);
  padding: 3px 8px;
  border-radius: var(--r-sm);
  background: var(--err-bg);
  color: var(--err);
  border: 1px solid var(--err-border);
  text-decoration: line-through;
}
.ad-drawer-root .ad-new {
  font-family: var(--font-mono);
  font-size: var(--t-sm);
  padding: 3px 8px;
  border-radius: var(--r-sm);
  background: var(--ok-bg);
  color: var(--ok);
  border: 1px solid var(--ok-border);
  font-weight: 500;
}
.ad-drawer-root .ad-actorcard {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 6px 0 10px;
}
.ad-drawer-root .ad-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.12);
}
.ad-drawer-root .ad-actorname {
  font-size: var(--t-md);
  font-weight: 600;
  color: var(--ink);
}
.ad-drawer-root .ad-actoremail {
  font-size: var(--t-sm);
  color: var(--ink-3);
  font-family: var(--font-mono);
}
.ad-drawer-root .ad-kvtable {
  border: 1px solid var(--line);
  border-radius: var(--r);
  overflow: hidden;
  margin-top: 4px;
}
.ad-drawer-root .ad-kvrow {
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 10px;
  padding: 8px 11px;
  border-bottom: 1px solid var(--line);
}
.ad-drawer-root .ad-kvrow:last-child {
  border-bottom: none;
}
.ad-drawer-root .ad-k {
  font-family: var(--font-mono);
  font-size: var(--t-sm);
  color: var(--ink-3);
}
.ad-drawer-root .ad-v {
  font-family: var(--font-mono);
  font-size: var(--t-sm);
  color: var(--ink-2);
  word-break: break-word;
}
.ad-drawer-root .ad-rawwrap {
  position: relative;
  margin-top: 10px;
}
.ad-drawer-root .ad-copybtn {
  position: absolute;
  top: 10px;
  right: 10px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 10px;
  background: var(--surface);
  border: 1px solid var(--line-2);
  border-radius: var(--r-sm);
  font-size: var(--t-sm);
  color: var(--ink-2);
  cursor: pointer;
}
.ad-drawer-root .ad-pre {
  margin: 0;
  padding: 14px 16px;
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: var(--r);
  overflow-x: auto;
  font-family: var(--font-mono);
  font-size: var(--t-sm);
  line-height: 1.65;
  color: var(--ink-2);
  white-space: pre;
}
</style>
