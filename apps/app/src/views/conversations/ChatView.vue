<template>
  <div class="chat-view">
    <ChatThread
      :messages="displayMessages"
      :loading="chatStore.isStreaming && !hasStreamingContent"
      :loading-label="loadingLabel"
      :streaming="chatStore.isStreaming"
      :re-act-steps="{ thoughts: chatStore.thoughts, observations: chatStore.observations }"
      :prompts="suggestedPrompts"
      :source-label="sourceLabel"
      :theme="theme"
      @send="onSend"
      @copy="chatActions.copyMessage"
      @cite="onCite"
      @open-panel="onOpenPanel"
    />

    <ChatComposer
      :streaming="chatStore.isStreaming"
      :loading="chatStore.isStreaming && !hasStreamingContent"
      :dataset-options="datasetResults"
      :selected-dataset-ids="linkedDatasetIds"
      :selected-datasets="isNew ? selectedDatasetObjects : linkedDatasets"
      :dataset-total="datasetTotal"
      :dataset-loading="datasetLoading"
      :dataset-picker-interactive="isNew"
      :agents="agentResults"
      :selected-agent-id="isNew ? pendingAgentId : conversation?.agent_id"
      :selected-agent="selectedAgentObject"
      :agent-total="agentTotal"
      :agent-loading="agentLoading"
      :agent-picker-interactive="isNew"
      @send="onSend"
      @abort="chat.abort"
      @agent-change="onAgentChange"
      @agent-search="onAgentSearch"
      @dataset-change="onDatasetChange"
      @dataset-search="onDatasetSearch"
    />

    <!-- Sources panel (right overlay) — scoped to the active message -->
    <Transition name="slide">
      <div v-if="sourcesPanelOpen" class="chat-view__sources">
        <div class="chat-view__sources-header">
          <div>
            <span class="chat-view__sources-title">Sources</span>
            <span v-if="activeMsgIndex != null" class="chat-view__sources-meta">
              · Response {{ activeMsgIndex }} · {{ activeCitationCount }}
              {{ activeCitationCount === 1 ? "citation" : "citations" }}
            </span>
          </div>
          <button class="chat-view__sources-close" @click="closePanel">
            <X :size="16" />
          </button>
        </div>
        <div class="chat-view__sources-list">
          <div v-for="group in activeSources" :key="group.title" class="chat-view__source-group">
            <div class="chat-view__source-group-header">
              <span class="chat-view__source-group-title">{{ group.title }}</span>
              <span class="chat-view__source-group-count">
                {{ group.citations.length }}
                {{ group.citations.length === 1 ? "excerpt" : "excerpts" }}
              </span>
            </div>
            <div
              v-for="citation in group.citations"
              :key="citation.n"
              class="chat-view__source-card"
              :class="{ 'chat-view__source-card--highlight': citation.n === highlightedN }"
            >
              <div class="chat-view__source-meta">
                <span class="chat-view__source-badge" :class="relevanceClass(citation.relevance)">{{
                  citation.relevanceLabel
                }}</span>
                <span class="chat-view__source-num">[{{ citation.n }}]</span>
              </div>
              <div v-if="citation.cited_text" class="chat-view__source-excerpt">
                <MarkdownRenderer :text="citation.cited_text" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted } from "vue"
import { useRoute, useRouter } from "vue-router"
import { X } from "lucide-vue-next"
import { useConversationsStore } from "@/stores/conversations"
import { useChatStore } from "@/stores/chat"
import * as agentsApi from "@/api/agents"
import * as datasetsApi from "@/api/datasets"
import { useChat } from "@/composables/useChat"
import { useChatActions } from "@/composables/useChatActions"
import { useTheme } from "@/composables/useTheme"
import ChatThread from "@/components/chat/ChatThread.vue"
import ChatComposer from "@/components/chat/ChatComposer.vue"
import MarkdownRenderer from "@/components/chat/MarkdownRenderer.vue"

const route = useRoute()
const router = useRouter()
const conversationsStore = useConversationsStore()
const chatStore = useChatStore()
const workspaceId = computed(() => route.params.workspaceId)
const conversationId = computed(() => route.params.conversationId)
const chat = useChat(workspaceId, conversationId)
const chatActions = useChatActions()
const { theme } = useTheme()

const isNew = computed(() => route.name === "NewChat")
const pendingAgentId = ref(null)

const PICKER_LIMIT = 10

// Agent picker (owned here — decoupled from the shared agents store)
const agentResults = ref([])
const agentTotal = ref(0)
const agentLoading = ref(false)
const currentAgent = ref(null)
const linkedAgent = ref(null)
let agentSearchTimer = null

async function fetchAgentResults(search = "") {
  agentLoading.value = true
  try {
    const res = await agentsApi.listAgents(workspaceId.value, {
      ...(search.trim() && { search: search.trim() }),
      sort_by: "created_at",
      sort_order: "desc",
      limit: PICKER_LIMIT,
    })
    agentResults.value = res.data.data
    agentTotal.value = res.data.pagination?.total ?? res.data.data.length
  } catch {
    agentResults.value = []
    agentTotal.value = 0
  } finally {
    agentLoading.value = false
  }
}

function onAgentSearch(q) {
  clearTimeout(agentSearchTimer)
  agentSearchTimer = setTimeout(() => fetchAgentResults(q), 300)
}

function onAgentChange(id) {
  pendingAgentId.value = id
  currentAgent.value = agentResults.value.find((a) => a.id === id) || currentAgent.value
}

async function resolveLinkedAgent(id) {
  linkedAgent.value = await agentsApi
    .getAgent(workspaceId.value, id)
    .then((r) => r.data.data)
    .catch(() => null)
}

const selectedAgentObject = computed(() => (isNew.value ? currentAgent.value : linkedAgent.value))

const pendingDatasetIds = ref([])

// Dataset picker (owned here — decoupled from the shared datasets store)
const datasetResults = ref([])
const datasetTotal = ref(0)
const datasetLoading = ref(false)
const selectedDatasetObjects = ref([])
const linkedDatasets = ref([])
let datasetSearchTimer = null

async function fetchDatasetResults(search = "") {
  datasetLoading.value = true
  try {
    const res = await datasetsApi.listDatasets(workspaceId.value, {
      ...(search.trim() && { search: search.trim() }),
      sort_by: "created_at",
      sort_order: "desc",
      limit: PICKER_LIMIT,
    })
    datasetResults.value = res.data.data
    datasetTotal.value = res.data.pagination?.total ?? res.data.data.length
  } catch {
    datasetResults.value = []
    datasetTotal.value = 0
  } finally {
    datasetLoading.value = false
  }
}

function onDatasetSearch(q) {
  clearTimeout(datasetSearchTimer)
  datasetSearchTimer = setTimeout(() => fetchDatasetResults(q), 300)
}

function onDatasetChange(ids) {
  pendingDatasetIds.value = ids
  const known = new Map(selectedDatasetObjects.value.map((d) => [d.id, d]))
  for (const d of datasetResults.value) known.set(d.id, d)
  selectedDatasetObjects.value = ids.map((id) => known.get(id)).filter(Boolean)
}

async function resolveSelectedDatasets(ids) {
  const res = await Promise.all(
    ids.map((id) =>
      datasetsApi
        .getDataset(workspaceId.value, id)
        .then((r) => ({ id, data: r.data.data }))
        .catch(() => ({ id, data: null })),
    ),
  )
  const resolved = res.filter((r) => r.data !== null)
  selectedDatasetObjects.value = resolved.map((r) => r.data)
  pendingDatasetIds.value = resolved.map((r) => r.id)
}

async function resolveLinkedDatasets(ids) {
  const res = await Promise.all(
    ids.map((id) =>
      datasetsApi
        .getDataset(workspaceId.value, id)
        .then((r) => r.data.data)
        .catch(() => null),
    ),
  )
  linkedDatasets.value = res.filter(Boolean)
}

function initPendingConfig() {
  chatStore.reset()
  const defaultAgent = agentResults.value.find((a) => a.is_default) || agentResults.value[0] || null
  pendingAgentId.value = defaultAgent?.id || null
  currentAgent.value = defaultAgent
  const q = route.query.dataset
  pendingDatasetIds.value = q ? [].concat(q) : []
  if (pendingDatasetIds.value.length) resolveSelectedDatasets(pendingDatasetIds.value)
  else selectedDatasetObjects.value = []
}

// Local state
const sourcesPanelOpen = ref(false)
const highlightedN = ref(null)
const activeMsgId = ref(null)

// Load conversation when route changes
watch(
  conversationId,
  (id) => {
    sourcesPanelOpen.value = false
    activeMsgId.value = null
    highlightedN.value = null
    if (id && workspaceId.value) {
      chatStore.reset()
      conversationsStore.fetchConversation(workspaceId.value, id)
    } else {
      // No conversation id → "new conversation" view. The component instance is
      // reused across the Chat/NewChat routes, so the previously loaded
      // conversation lingers in the store and would render here. Clear it.
      chatStore.reset()
      conversationsStore.clearCurrentConversation()
    }
  },
  { immediate: true },
)

onMounted(async () => {
  if (isNew.value) {
    await Promise.all([fetchDatasetResults(), fetchAgentResults()])
    initPendingConfig()
  }
})

watch(
  isNew,
  async (val) => {
    if (!val) return
    await Promise.all([fetchDatasetResults(), fetchAgentResults()])
    initPendingConfig()
  },
  { immediate: false },
)

const conversation = computed(() => conversationsStore.currentConversation)
const linkedDatasetIds = computed(() =>
  isNew.value ? pendingDatasetIds.value : conversation.value?.dataset_ids || [],
)

watch(
  () => (isNew.value ? null : conversation.value?.dataset_ids),
  (ids) => {
    if (ids?.length) resolveLinkedDatasets(ids)
    else linkedDatasets.value = []
  },
  { immediate: true },
)

watch(
  () => (isNew.value ? null : conversation.value?.agent_id),
  (id) => {
    if (id) resolveLinkedAgent(id)
    else linkedAgent.value = null
  },
  { immediate: true },
)
const messages = computed(() => conversation.value?.messages || [])

// Filter to input + final_answer only (matching current behavior)
const filteredMessages = computed(() =>
  messages.value.filter(
    (m) => m.step_type === "input" || m.step_type === "final_answer" || !m.step_type,
  ),
)

const citationsByMsgId = computed(() => {
  const map = new Map()
  const all = conversationsStore.currentConversation?.citations || []
  all.forEach((c) => {
    if (!map.has(c.message_id)) map.set(c.message_id, [])
    map.get(c.message_id).push(c)
  })
  return map
})

const hasStreamingContent = computed(() => (chatStore.currentContent || "").length > 0)

const loadingLabel = computed(() => {
  const n = linkedDatasetIds.value.length || 3
  return `Searching ${n} sources…`
})

// Build streaming message from chatStore state
const streamingMessage = computed(() => {
  if (!chatStore.isStreaming || !chatStore.currentContent) return null
  return {
    id: "streaming",
    role: "assistant",
    text: chatStore.currentContent,
    streaming: true,
    sources: [],
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  }
})

// Merge persisted messages with streaming message — pass THIS to ChatThread.
// Normalises API field names: content→text, created_at→time, and injects
// per-message citations from the conversation-level citations array.
const displayMessages = computed(() => {
  const base = filteredMessages.value.map((m) => ({
    ...m,
    text: m.text || m.content || "",
    time:
      m.time ||
      (m.created_at
        ? new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : ""),
    sources: [
      ...new Set(
        (citationsByMsgId.value.get(m.id) || []).map(
          (c) => c.filename || `Source ${c.citation_number}`,
        ),
      ),
    ],
  }))
  if (streamingMessage.value) return [...base, streamingMessage.value]
  return base
})

// Source label for welcome screen
const sourceLabel = computed(() => {
  // TODO: Use linked datasets when API provides them
  return "your sources"
})

// Suggested prompts for welcome screen
const suggestedPrompts = [
  { icon: "key", text: "How do I authenticate and what are the rate limits?" },
  { icon: "code", text: "Show me how to run a search query." },
  { icon: "table", text: "Compare the available plans." },
  { icon: "book", text: "What changed in the latest release?" },
]

const activeSources = computed(() => {
  if (!activeMsgId.value) return []
  const citations = citationsByMsgId.value.get(activeMsgId.value) || []
  const groupMap = new Map()
  for (const c of citations) {
    const title = c.filename || `Source ${c.citation_number}`
    if (!groupMap.has(title)) groupMap.set(title, [])
    groupMap.get(title).push({
      n: c.citation_number,
      relevance: c.relevance_score,
      relevanceLabel: c.relevance_score >= 0.85 ? "High" : c.relevance_score >= 0.6 ? "Med" : "Low",
      cited_text: c.cited_text || "",
    })
  }
  return Array.from(groupMap.entries()).map(([title, cits]) => ({ title, citations: cits }))
})

const activeCitationCount = computed(() =>
  activeSources.value.reduce((sum, g) => sum + g.citations.length, 0),
)

const activeMsgIndex = computed(() => {
  if (!activeMsgId.value) return null
  const aiMessages = filteredMessages.value.filter((m) => m.role === "assistant")
  const idx = aiMessages.findIndex((m) => m.id === activeMsgId.value)
  return idx === -1 ? null : idx + 1
})

// Actions
async function onSend(text) {
  if (isNew.value) {
    const conv = await conversationsStore.createConversation(workspaceId.value, {
      agent_id: pendingAgentId.value,
      dataset_ids: pendingDatasetIds.value,
    })
    await router.replace({
      name: "Chat",
      params: { workspaceId: workspaceId.value, conversationId: conv.id },
    })
    await nextTick()
  }
  await chat.sendMessage(text)
}

function onCite(msgId, n) {
  highlightedN.value = n
  activeMsgId.value = msgId
  sourcesPanelOpen.value = true
}

function onOpenPanel(msgId) {
  if (msgId === "streaming") return
  if (sourcesPanelOpen.value && activeMsgId.value === msgId) {
    closePanel()
  } else {
    activeMsgId.value = msgId
    highlightedN.value = null
    sourcesPanelOpen.value = true
  }
}

function closePanel() {
  sourcesPanelOpen.value = false
  activeMsgId.value = null
  highlightedN.value = null
}

function relevanceClass(relevance) {
  if (relevance >= 0.85) return "chat-view__source-badge--high"
  if (relevance >= 0.6) return "chat-view__source-badge--medium"
  return "chat-view__source-badge--low"
}
</script>

<style scoped>
.chat-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  position: relative;
}

/* ── Sources panel ── */
.chat-view__sources {
  position: fixed;
  top: 0;
  right: 0;
  width: 340px;
  height: 100vh;
  background: var(--surface);
  border-left: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  z-index: 20;
}

.chat-view__sources-header {
  padding: 12px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--line);
}

.chat-view__sources-title {
  font-weight: 600;
  font-size: var(--t-base);
  color: var(--ink);
}

.chat-view__sources-meta {
  font-size: var(--t-sm);
  color: var(--ink-3);
  margin-left: 2px;
}

.chat-view__source-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 3px;
  border-radius: 3px;
  background: var(--brand-tint);
  color: var(--brand-3);
  font: 600 10.5px var(--font-mono);
  flex-shrink: 0;
  margin-right: 4px;
}

.chat-view__sources-close {
  background: transparent;
  border: none;
  color: var(--ink-3);
  cursor: pointer;
  font-size: 16px;
  display: flex;
}

.chat-view__sources-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.chat-view__source-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.chat-view__source-group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 2px;
}

.chat-view__source-group-title {
  font-weight: 600;
  font-size: 12px;
  color: var(--ink);
}

.chat-view__source-group-count {
  font-size: 11px;
  color: var(--ink-3);
}

.chat-view__source-card {
  padding: 8px;
  border-radius: var(--r-sm);
  border: 1px solid var(--line);
  background: var(--surface);
}

.chat-view__source-card--highlight {
  border-color: var(--brand);
  background: var(--brand-tint);
}

.chat-view__source-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 3px;
}

.chat-view__source-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 1px 5px;
  border-radius: 3px;
}

.chat-view__source-badge--high {
  color: var(--ok);
  background: var(--ok-bg);
}
.chat-view__source-badge--medium {
  color: var(--brand);
  background: var(--brand-tint);
}
.chat-view__source-badge--low {
  color: var(--ink-3);
  background: var(--bg-2);
}

.chat-view__source-excerpt {
  font-size: 11px;
  color: var(--ink-3);
  margin-top: 4px;
  line-height: 1.5;
}

/* ── Slide transition ── */
.slide-enter-active,
.slide-leave-active {
  transition: transform var(--dur) var(--ease);
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}
</style>
