<template>
  <div class="chat-composer">
    <div ref="innerRef" class="chat-composer__inner">
      <div class="chat-composer__card" :class="{ 'chat-composer__card--focused': focused }">
        <a-textarea
          v-model:value="value"
          class="chat-composer__textarea"
          aria-label="Message"
          :placeholder="
            busy ? 'Searching…' : 'Ask anything across your sources…  (Shift+Enter for newline)'
          "
          :disabled="busy"
          :bordered="false"
          :auto-size="{ minRows: 1, maxRows: 9 }"
          @keydown="onKey"
          @focus="focused = true"
          @blur="focused = false"
        />

        <div class="chat-composer__row">
          <!-- Agent popover — only shown when an agents list is provided. Mirrors the
               dataset popover so both selectors share Ant's open/close behaviour. -->
          <a-popover
            v-if="agents.length"
            :open="agentPickerOpen"
            placement="topLeft"
            trigger="click"
            overlay-class-name="agent-popover-overlay"
            :get-popup-container="getAgentPopupContainer"
            @open-change="
              (open) => {
                if (!open) agentPickerOpen = false
              }
            "
          >
            <template #content>
              <AgentDrawer
                :agents="agents"
                :selected-agent-id="selectedAgentId"
                :selected-agent="selectedAgent"
                :total="agentTotal"
                :loading="agentLoading"
                @select="selectAgent"
                @search="(q) => emit('agent-search', q)"
                @close="agentPickerOpen = false"
              />
            </template>

            <button
              data-agent
              class="chat-composer__icon-btn"
              :class="{ 'chat-composer__icon-btn--active': agentPickerOpen || selectedAgentId }"
              :title="agentLabel"
              :disabled="!agentPickerInteractive"
              @click.stop="agentPickerInteractive && (agentPickerOpen = !agentPickerOpen)"
            >
              <Bot :size="15" />
            </button>
          </a-popover>

          <!-- Dataset popover: wraps both trigger buttons so either one opens the panel -->
          <a-popover
            :open="drawerOpen"
            placement="topLeft"
            trigger="click"
            overlay-class-name="dataset-popover-overlay"
            :get-popup-container="getDatasetPopupContainer"
            @open-change="
              (open) => {
                if (!open) drawerOpen = false
              }
            "
          >
            <template #content>
              <DatasetDrawer
                :datasets="datasetOptions"
                :selected-ids="selectedDatasetIds"
                :selected-datasets="selectedDatasets"
                :total="datasetTotal"
                :loading="datasetLoading"
                :interactive="datasetPickerInteractive"
                @toggle="onToggleDataset"
                @search="(q) => emit('dataset-search', q)"
                @close="drawerOpen = false"
              />
            </template>

            <span class="dataset-trigger-wrap">
              <button
                data-attach
                class="chat-composer__icon-btn"
                :class="{ 'chat-composer__icon-btn--active': drawerOpen || selCount > 0 }"
                title="Choose sources to search"
                @click.stop="drawerOpen = !drawerOpen"
              >
                <Paperclip :size="16" />
              </button>

              <button
                v-if="selCount > 0"
                data-sources
                class="chat-composer__chip"
                @click.stop="drawerOpen = !drawerOpen"
              >
                <LayoutGrid :size="16" />
                {{ selCount }} {{ selCount === 1 ? "source" : "sources" }}
                <ChevronDown :size="16" />
              </button>
            </span>
          </a-popover>

          <span v-if="value.length > 0" class="chat-composer__meter" :style="{ color: meterColor }">
            {{ tokens.toLocaleString() }}/{{ MAX_TOKENS.toLocaleString() }}
          </span>

          <a-button v-if="streaming" class="chat-composer__stop" @click="emit('abort')">
            <Ban :size="16" /> Stop
          </a-button>
          <a-button
            v-else
            type="primary"
            class="chat-composer__send"
            :class="{ 'chat-composer__send--disabled': !canSend }"
            :disabled="!canSend"
            @click="submit"
          >
            {{ loading ? "Searching…" : "Send" }}
            <ArrowUp v-if="!loading" :size="16" />
          </a-button>
        </div>
      </div>

      <div class="chat-composer__hint">
        RAGBot is AI and can make mistakes. Please double-check responses.
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from "vue"
import { Paperclip, LayoutGrid, ChevronDown, ArrowUp, Ban, Bot } from "lucide-vue-next"
import DatasetDrawer from "./DatasetDrawer.vue"
import AgentDrawer from "./AgentDrawer.vue"

const MAX_TOKENS = 8000

const props = defineProps({
  streaming: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  /** All datasets available in the workspace (id, name, file_count). */
  datasetOptions: { type: Array, default: () => [] },
  /** IDs of datasets selected/linked for this conversation. */
  selectedDatasetIds: { type: Array, default: () => [] },
  /** When true, the dataset drawer is editable; otherwise read-only. */
  datasetPickerInteractive: { type: Boolean, default: false },
  /** Resolved dataset objects for the selected ids (pinned group / read-only list). */
  selectedDatasets: { type: Array, default: () => [] },
  /** Total datasets available for the current query (drives the truncation hint). */
  datasetTotal: { type: Number, default: 0 },
  /** When true, the dataset picker is fetching results. */
  datasetLoading: { type: Boolean, default: false },
  agents: { type: Array, default: () => [] },
  selectedAgentId: { type: [String, null], default: null },
  /** Resolved object for the current agent (pinned "Current" row + button label). */
  selectedAgent: { type: [Object, null], default: null },
  /** Total agents available for the current query (drives the truncation hint). */
  agentTotal: { type: Number, default: 0 },
  /** When true, the agent picker is fetching results. */
  agentLoading: { type: Boolean, default: false },
  agentPickerInteractive: { type: Boolean, default: false },
  /** Optional text to seed the composer with (e.g. from an exploration question). */
  initialText: { type: String, default: "" },
})

const emit = defineEmits([
  "send",
  "abort",
  "agent-change",
  "dataset-change",
  "dataset-search",
  "agent-search",
])

const value = ref("")
const focused = ref(false)
const drawerOpen = ref(false)
const agentPickerOpen = ref(false)
const innerRef = ref(null)

/**
 * Resolve the container the dataset/agent popovers mount into.
 * Must live in script (not the template) so `innerRef.value` is the DOM node —
 * in the template `innerRef` is auto-unwrapped and `.value` is undefined, which
 * made Ant's Portal render nothing. Falls back to <body> as a safety net.
 * @returns {HTMLElement} the composer inner element, or document.body.
 */
function getDatasetPopupContainer() {
  return innerRef.value || document.body
}

/** Mount the agent popover in the same container as the dataset popover. */
const getAgentPopupContainer = getDatasetPopupContainer

const busy = computed(() => props.streaming || props.loading)
const tokens = computed(() => Math.ceil(value.value.length / 4))
const over = computed(() => tokens.value > MAX_TOKENS)
const selCount = computed(() => props.selectedDatasetIds.length)
const canSend = computed(() => value.value.trim().length > 0 && !over.value && !busy.value)
const meterColor = computed(() =>
  over.value ? "var(--err)" : tokens.value > MAX_TOKENS * 0.8 ? "var(--warn)" : "var(--ink-4)",
)
const agentLabel = computed(() => props.selectedAgent?.name || "Agent")

function onKey(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault()
    submit()
  }
}

function submit() {
  if (!canSend.value) return
  emit("send", value.value.trim())
  value.value = ""
}

function selectAgent(agentId) {
  emit("agent-change", agentId)
  agentPickerOpen.value = false
}

function onToggleDataset(id) {
  const next = new Set(props.selectedDatasetIds)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  emit("dataset-change", Array.from(next))
}

let seeded = false

/** Seed the textarea from `initialText` once, without clobbering user input. */
function seedInitialText() {
  if (seeded || !props.initialText || value.value) return
  seeded = true
  value.value = props.initialText
}

onMounted(seedInitialText)
watch(() => props.initialText, seedInitialText)
</script>

<style scoped>
.chat-composer {
  padding: 14px 24px 22px;
  background: linear-gradient(to bottom, transparent, var(--bg) 28px);
  position: sticky;
  bottom: 0;
  flex-shrink: 0;
}

.chat-composer__inner {
  margin: 0 auto;
  max-width: 720px;
  position: relative;
}

.chat-composer__card {
  background: var(--surface);
  border: 1px solid var(--line-2);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-2);
  padding: 10px 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition:
    border-color var(--dur) var(--ease),
    box-shadow var(--dur) var(--ease);
}

.chat-composer__card--focused {
  border-color: var(--brand);
  box-shadow:
    0 0 0 2px rgba(255, 107, 53, 0.18),
    var(--shadow-2);
}

/* a-textarea renders <textarea class="ant-input chat-composer__textarea">; combine
   classes to outrank Ant's .ant-input defaults and keep the borderless, padless look. */
.chat-composer__textarea.ant-input,
.chat-composer__textarea {
  border: none;
  outline: none;
  resize: none;
  padding: 0;
  box-shadow: none;
  font: 400 15px var(--font-sans);
  color: var(--ink);
  width: 100%;
  background: transparent;
  min-height: 24px;
  max-height: 220px;
  line-height: 1.5;
}
.chat-composer__textarea.ant-input:focus,
.chat-composer__textarea.ant-input-focused {
  border: none;
  box-shadow: none;
}

.chat-composer__row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.chat-composer__icon-btn {
  width: 32px;
  height: 32px;
  border-radius: var(--r-sm);
  background: transparent;
  border: 1px solid transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ink-3);
  cursor: pointer;
  transition: all var(--dur) var(--ease);
  font-size: 17px;
}

.chat-composer__icon-btn--active {
  background: var(--brand-tint);
  color: var(--brand-3);
}

.chat-composer__chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: var(--r-sm);
  background: var(--bg-2);
  border: 1px solid var(--line);
  font-size: var(--t-sm);
  color: var(--ink-2);
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
}

.chat-composer__meter {
  font-size: 11.5px;
  font-family: var(--font-mono);
  margin-left: 6px;
}

/* send/stop are now a-button (<button class="ant-btn chat-composer__send">); the
   combined .ant-btn selector outranks Ant's button defaults to preserve the look. */
.chat-composer__send.ant-btn,
.chat-composer__send {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: auto;
  padding: 7px 13px;
  border-radius: var(--r-sm);
  background: var(--brand);
  color: #fff;
  font: 600 13px var(--font-sans);
  border: none;
  box-shadow: none;
  cursor: pointer;
  transition: background var(--dur) var(--ease);
}
.chat-composer__send.ant-btn-primary:not(:disabled):hover {
  background: var(--brand-2);
  color: #fff;
}

.chat-composer__send--disabled.ant-btn,
.chat-composer__send--disabled,
.chat-composer__send.ant-btn:disabled {
  background: var(--bg-2);
  color: var(--ink-4);
  cursor: not-allowed;
}

.chat-composer__stop.ant-btn,
.chat-composer__stop {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: auto;
  padding: 7px 13px;
  border-radius: var(--r-sm);
  background: var(--surface);
  color: var(--ink);
  font: 600 13px var(--font-sans);
  border: 1px solid var(--line-2);
  box-shadow: none;
  cursor: pointer;
}

.chat-composer__hint {
  text-align: center;
  margin-top: 8px;
  font-size: 11px;
  color: var(--ink-4);
}

.dataset-trigger-wrap {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
</style>

<!--
  Non-scoped: the dataset/agent popovers are portaled out of this component, so their
  chrome must be styled globally (namespaced by overlay-class-name). Each drawer paints
  its own card surface (background, border, radius, shadow), so Ant's default
  .ant-popover-inner padding + background + shadow rendered a double-container frame
  around the rounded panel. Strip that chrome and the drawer becomes the sole surface.
-->
<style>
.dataset-popover-overlay .ant-popover-inner,
.agent-popover-overlay .ant-popover-inner {
  padding: 0;
  background: transparent;
  box-shadow: none;
  border-radius: var(--r-lg);
}
.dataset-popover-overlay .ant-popover-arrow,
.agent-popover-overlay .ant-popover-arrow {
  display: none;
}
</style>
