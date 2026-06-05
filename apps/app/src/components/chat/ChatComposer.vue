<template>
  <div class="chat-composer">
    <div class="chat-composer__inner">
      <!-- Dataset drawer (floating above) -->
      <DatasetDrawer
        v-if="drawerOpen"
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

      <div
        class="chat-composer__card"
        :class="{ 'chat-composer__card--focused': focused }"
        @click="agentPickerOpen = false"
      >
        <textarea
          ref="textareaRef"
          v-model="value"
          class="chat-composer__textarea"
          :placeholder="
            busy ? 'Searching…' : 'Ask anything across your sources…  (Shift+Enter for newline)'
          "
          :disabled="busy"
          rows="1"
          @input="autoGrow"
          @keydown="onKey"
          @focus="focused = true"
          @blur="focused = false"
        />

        <div class="chat-composer__row">
          <!-- Agent selector — only shown when agents list is provided -->
          <template v-if="agents.length">
            <div class="agent-picker-wrap" @click.stop>
              <button
                data-agent
                class="chat-composer__icon-btn"
                :class="{ 'chat-composer__icon-btn--active': selectedAgentId }"
                :title="agentLabel"
                :disabled="!agentPickerInteractive"
                @click="agentPickerInteractive && (agentPickerOpen = !agentPickerOpen)"
              >
                <Bot :size="15" />
              </button>

              <!-- Agent picker popup -->
              <div v-if="agentPickerOpen && agentPickerInteractive" class="agent-picker-popup">
                <div class="agent-picker-header">Select agent</div>
                <div class="agent-search" @click.stop>
                  <Search :size="14" class="agent-search__icon" />
                  <input
                    v-model="agentQuery"
                    class="agent-search__input"
                    placeholder="Search agents…"
                    @input="emit('agent-search', agentQuery)"
                  />
                </div>

                <!-- Pinned: current agent (stays visible during search) -->
                <template v-if="selectedAgent">
                  <div class="agent-picker-group">Current</div>
                  <button
                    class="agent-picker-row agent-picker-row--active"
                    @click="selectAgent(selectedAgent.id)"
                  >
                    <div class="agent-picker-info">
                      <div class="agent-picker-name">{{ selectedAgent.name }}</div>
                      <div class="agent-picker-sub">{{ agentSub(selectedAgent) }}</div>
                    </div>
                    <Check :size="13" />
                  </button>
                  <div class="agent-picker-divider" />
                </template>

                <div v-if="otherAgents.length" class="agent-picker-group">All agents</div>
                <button
                  v-for="a in otherAgents"
                  :key="a.id"
                  class="agent-picker-row"
                  @click="selectAgent(a.id)"
                >
                  <div class="agent-picker-info">
                    <div class="agent-picker-name">{{ a.name }}</div>
                    <div class="agent-picker-sub">{{ agentSub(a) }}</div>
                  </div>
                </button>

                <p v-if="agentLoading" class="agent-picker-hint">Searching…</p>
                <p v-else-if="agentQuery.trim() && !otherAgents.length" class="agent-picker-hint">
                  No agents match "{{ agentQuery.trim() }}".
                </p>
                <p v-else-if="agentTotal > agents.length" class="agent-picker-hint">
                  Showing {{ agents.length }} of {{ agentTotal }} — search to find more.
                </p>
              </div>
            </div>
          </template>

          <button
            data-attach
            class="chat-composer__icon-btn"
            :class="{ 'chat-composer__icon-btn--active': drawerOpen || selCount > 0 }"
            title="Choose sources to search"
            @click="drawerOpen = !drawerOpen"
          >
            <Paperclip :size="16" />
          </button>

          <button data-sources class="chat-composer__chip" @click="drawerOpen = !drawerOpen">
            <LayoutGrid :size="16" />
            {{ selCount }} {{ selCount === 1 ? "source" : "sources" }}
            <ChevronDown :size="16" />
          </button>

          <span v-if="value.length > 0" class="chat-composer__meter" :style="{ color: meterColor }">
            {{ tokens.toLocaleString() }}/{{ MAX_TOKENS.toLocaleString() }}
          </span>

          <button v-if="streaming" class="chat-composer__stop" @click="emit('abort')">
            <Ban :size="16" /> Stop
          </button>
          <button
            v-else
            class="chat-composer__send"
            :class="{ 'chat-composer__send--disabled': !canSend }"
            :disabled="!canSend"
            @click="submit"
          >
            {{ loading ? "Searching…" : "Send" }}
            <ArrowUp v-if="!loading" :size="16" />
          </button>
        </div>
      </div>

      <div class="chat-composer__hint">
        RAGBot is AI and can make mistakes. Please double-check responses.
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from "vue"
import {
  Paperclip,
  LayoutGrid,
  ChevronDown,
  ArrowUp,
  Ban,
  Bot,
  Check,
  Search,
} from "lucide-vue-next"
import DatasetDrawer from "./DatasetDrawer.vue"

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
const textareaRef = ref(null)

const busy = computed(() => props.streaming || props.loading)
const tokens = computed(() => Math.ceil(value.value.length / 4))
const over = computed(() => tokens.value > MAX_TOKENS)
const selCount = computed(() => props.selectedDatasetIds.length)
const canSend = computed(() => value.value.trim().length > 0 && !over.value && !busy.value)
const meterColor = computed(() =>
  over.value ? "var(--err)" : tokens.value > MAX_TOKENS * 0.8 ? "var(--warn)" : "var(--ink-4)",
)
const agentQuery = ref("")
watch(agentPickerOpen, (open) => {
  if (!open) agentQuery.value = ""
})
const agentLabel = computed(() => props.selectedAgent?.name || "Agent")
const otherAgents = computed(() => props.agents.filter((a) => a.id !== props.selectedAgentId))

function agentSub(a) {
  return a.is_default ? "Default" : a.is_system ? "System" : a.model_config?.model?.split("/").pop()
}

function autoGrow(e) {
  const el = e.target
  el.style.height = "auto"
  el.style.height = Math.min(el.scrollHeight, 220) + "px"
}

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
  if (textareaRef.value) textareaRef.value.style.height = "auto"
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

.chat-composer__textarea {
  border: none;
  outline: none;
  resize: none;
  font: 400 15px var(--font-sans);
  color: var(--ink);
  width: 100%;
  background: transparent;
  min-height: 24px;
  max-height: 220px;
  line-height: 1.5;
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

.chat-composer__send {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 13px;
  border-radius: var(--r-sm);
  background: var(--brand);
  color: #fff;
  font: 600 13px var(--font-sans);
  border: none;
  cursor: pointer;
  transition: background var(--dur) var(--ease);
}

.chat-composer__send--disabled {
  background: var(--bg-2);
  color: var(--ink-4);
  cursor: not-allowed;
}

.chat-composer__stop {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 13px;
  border-radius: var(--r-sm);
  background: var(--surface);
  color: var(--ink);
  font: 600 13px var(--font-sans);
  border: 1px solid var(--line-2);
  cursor: pointer;
}

.chat-composer__hint {
  text-align: center;
  margin-top: 8px;
  font-size: 11px;
  color: var(--ink-4);
}

.agent-picker-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.agent-picker-popup {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 0;
  background: var(--surface);
  border: 1px solid var(--line-2);
  border-radius: var(--r);
  box-shadow: var(--shadow-2);
  min-width: 240px;
  padding: 6px;
  z-index: 30;
}

.agent-picker-header {
  font-size: 10.5px;
  font-weight: 700;
  color: var(--ink-3);
  text-transform: uppercase;
  letter-spacing: 0.07em;
  padding: 4px 8px 8px;
}

.agent-search {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 0 4px 8px;
  padding: 7px 10px;
  border: 1px solid var(--line-2);
  border-radius: var(--r-sm);
  background: var(--bg);
}

.agent-search__icon {
  color: var(--ink-4);
  flex-shrink: 0;
}

.agent-search__input {
  border: none;
  outline: none;
  background: transparent;
  font: 400 12.5px var(--font-sans);
  color: var(--ink);
  width: 100%;
}

.agent-picker-group {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--ink-4);
  padding: 6px 8px 3px;
}

.agent-picker-divider {
  height: 1px;
  background: var(--line);
  margin: 6px 6px;
}

.agent-picker-hint {
  font-size: 11.5px;
  color: var(--ink-4);
  margin: 8px 8px 4px;
  line-height: 1.5;
}

.agent-picker-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding: 9px 10px;
  border: none;
  background: transparent;
  border-radius: var(--r-sm);
  cursor: pointer;
  text-align: left;
}

.agent-picker-row:hover {
  background: var(--bg-2);
}

.agent-picker-row--active {
  background: var(--brand-tint);
}

.agent-picker-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--ink);
}

.agent-picker-sub {
  font-size: 11px;
  color: var(--ink-3);
  margin-top: 1px;
}
</style>
