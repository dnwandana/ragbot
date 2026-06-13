<script setup>
import { ref, computed, watch, onUnmounted, nextTick } from "vue"
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

const drawerEl = ref(null)
const closeBtnEl = ref(null)
let lastFocused = null

// Drawer opens/closes via v-if="event", so props.event toggles null<->object.
// Focus-on-open and restore-on-close only handle those transitions; there is no
// next/prev navigation that would swap one event for another while open.
watch(
  () => props.event,
  (event, prev) => {
    if (event && !prev) {
      lastFocused = document.activeElement
      nextTick(() => closeBtnEl.value?.focus())
    } else if (!event && prev) {
      lastFocused?.focus?.()
      lastFocused = null
    }
  },
)

/**
 * Trap Tab focus inside the drawer so keyboard users can't reach the page behind the scrim.
 * @param {KeyboardEvent} e
 */
function onKeydown(e) {
  if (e.key !== "Tab" || !drawerEl.value) return
  // Tabs use v-if/v-else, so inactive tab content is absent from the DOM and won't
  // be matched here. If switched to v-show, add a visibility filter to the selector.
  const focusables = drawerEl.value.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
  )
  if (!focusables.length) return
  const first = focusables[0]
  const last = focusables[focusables.length - 1]
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault()
    first.focus()
  }
}

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
  <Teleport to="body">
    <div v-if="event" class="ad-overlay">
      <div class="ad-scrim" @click="emit('close')" />
      <aside
        ref="drawerEl"
        class="ad-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Audit event details"
        @keydown="onKeydown"
      >
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
            <button ref="closeBtnEl" class="ad-iconbtn" aria-label="Close" @click="emit('close')">
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
              <span class="ad-avatar" :style="{ background: actor.color }">{{
                actor.initials
              }}</span>
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
      </aside>
    </div>
  </Teleport>
</template>

<style scoped>
.ad-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  justify-content: flex-end;
  overflow: hidden;
}
.ad-scrim {
  position: absolute;
  inset: 0;
  background: rgba(24, 18, 12, 0.45);
}
@keyframes ad-in {
  from {
    transform: translateX(20px);
  }
  to {
    transform: translateX(0);
  }
}
.ad-drawer {
  position: relative;
  width: 460px;
  max-width: 92vw;
  height: 100%;
  background: var(--surface);
  box-shadow: var(--shadow-3);
  display: flex;
  flex-direction: column;
  animation: ad-in 0.22s var(--ease);
}
.ad-head {
  padding: 16px 20px 14px;
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
}
.ad-head-top {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.ad-icon {
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
.ad-titlewrap {
  flex: 1;
  min-width: 0;
}
.ad-title {
  font-size: var(--t-lg);
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.25;
  color: var(--ink);
}
.ad-res {
  font-size: var(--t-sm);
  color: var(--ink-3);
  margin-top: 2px;
  font-family: var(--font-mono);
  word-break: break-all;
}
.ad-iconbtn {
  width: 30px;
  height: 30px;
  border-radius: var(--r-sm);
  background: transparent;
  border: none;
  color: var(--ink-3);
  cursor: pointer;
  flex-shrink: 0;
}
.ad-iconbtn:hover {
  background: var(--bg-2);
  color: var(--ink);
}
.ad-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
  flex-wrap: wrap;
}
.ad-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--t-xs);
  font-weight: 500;
  padding: 4px 9px;
  border-radius: var(--r-sm);
}
.ad-idpill {
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
.ad-tabs {
  display: flex;
  gap: 2px;
  margin-top: 14px;
  background: var(--bg-2);
  padding: 3px;
  border-radius: var(--r-sm);
  width: fit-content;
}
.ad-tab {
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
.ad-tab.on {
  background: var(--surface);
  box-shadow: var(--shadow-1);
  font-weight: 600;
  color: var(--ink);
}
.ad-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px 20px 24px;
}
.ad-seclabel {
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
.ad-note {
  font-size: var(--t-xs);
  color: var(--ink-4);
  text-transform: none;
  letter-spacing: 0;
}
.ad-field {
  display: grid;
  grid-template-columns: 118px 1fr;
  gap: 12px;
  align-items: baseline;
  padding: 8px 0;
}
.ad-fl {
  font-size: var(--t-sm);
  color: var(--ink-3);
}
.ad-fv {
  font-size: var(--t-base);
  color: var(--ink);
  line-height: 1.5;
  word-break: break-word;
}
.ad-fv.mono {
  font-family: var(--font-mono);
}
.ad-divider {
  height: 1px;
  background: var(--line);
  margin: 10px 0;
}
.ad-diffbox {
  border: 1px solid var(--line);
  border-radius: var(--r);
  overflow: hidden;
  background: var(--bg);
  margin-bottom: 8px;
}
.ad-diffhd {
  padding: 7px 11px;
  border-bottom: 1px solid var(--line);
  font-family: var(--font-mono);
  font-size: var(--t-sm);
  color: var(--ink-2);
  background: var(--bg-2);
}
.ad-diffrow {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 11px;
  flex-wrap: wrap;
}
.ad-old {
  font-family: var(--font-mono);
  font-size: var(--t-sm);
  padding: 3px 8px;
  border-radius: var(--r-sm);
  background: var(--err-bg);
  color: var(--err);
  border: 1px solid var(--err-border);
  text-decoration: line-through;
}
.ad-new {
  font-family: var(--font-mono);
  font-size: var(--t-sm);
  padding: 3px 8px;
  border-radius: var(--r-sm);
  background: var(--ok-bg);
  color: var(--ok);
  border: 1px solid var(--ok-border);
  font-weight: 500;
}
.ad-actorcard {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 6px 0 10px;
}
.ad-avatar {
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
.ad-actorname {
  font-size: var(--t-md);
  font-weight: 600;
  color: var(--ink);
}
.ad-actoremail {
  font-size: var(--t-sm);
  color: var(--ink-3);
  font-family: var(--font-mono);
}
.ad-kvtable {
  border: 1px solid var(--line);
  border-radius: var(--r);
  overflow: hidden;
  margin-top: 4px;
}
.ad-kvrow {
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 10px;
  padding: 8px 11px;
  border-bottom: 1px solid var(--line);
}
.ad-kvrow:last-child {
  border-bottom: none;
}
.ad-k {
  font-family: var(--font-mono);
  font-size: var(--t-sm);
  color: var(--ink-3);
}
.ad-v {
  font-family: var(--font-mono);
  font-size: var(--t-sm);
  color: var(--ink-2);
  word-break: break-word;
}
.ad-rawwrap {
  position: relative;
  margin-top: 10px;
}
.ad-copybtn {
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
.ad-pre {
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
