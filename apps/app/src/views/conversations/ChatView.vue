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
      :highlight="chatActions.highlightedSource.value"
      @send="onSend"
      @copy="chatActions.copyMessage"
      @rate="onRate"
      @cite="onCite"
    />

    <ChatComposer
      :streaming="chatStore.isStreaming"
      :loading="chatStore.isStreaming && !hasStreamingContent"
      :datasets="linkedDatasetIds"
      @send="onSend"
      @abort="chat.abort"
    />

    <!-- Sources panel (right overlay) -->
    <Transition name="slide">
      <div v-if="sourcesPanelOpen" class="chat-view__sources">
        <div class="chat-view__sources-header">
          <span class="chat-view__sources-title">Sources</span>
          <button class="chat-view__sources-close" @click="sourcesPanelOpen = false">
            <CloseOutlined />
          </button>
        </div>
        <div class="chat-view__sources-list">
          <div
            v-for="source in allCitations"
            :key="source.n"
            class="chat-view__source-card"
            :class="{ 'chat-view__source-card--highlight': highlightedN === source.n }"
          >
            <div class="chat-view__source-meta">
              <span class="chat-view__source-badge" :class="relevanceClass(source.relevance)">{{
                source.relevanceLabel
              }}</span>
              <span class="chat-view__source-score">{{ source.relevance?.toFixed(2) }}</span>
            </div>
            <div class="chat-view__source-title">{{ source.title }}</div>
            <div class="chat-view__source-url">{{ source.url }}</div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, watch } from "vue"
import { useRoute } from "vue-router"
import { CloseOutlined } from "@ant-design/icons-vue"
import { useConversationsStore } from "@/stores/conversations"
import { useChatStore } from "@/stores/chat"
import { useChat } from "@/composables/useChat"
import { useChatActions } from "@/composables/useChatActions"
import { useTheme } from "@/composables/useTheme"
import ChatThread from "@/components/chat/ChatThread.vue"
import ChatComposer from "@/components/chat/ChatComposer.vue"

const route = useRoute()
const conversationsStore = useConversationsStore()
const chatStore = useChatStore()
const workspaceId = computed(() => route.params.workspaceId)
const conversationId = computed(() => route.params.conversationId)
const chat = useChat(workspaceId, conversationId)
const chatActions = useChatActions()
const { theme } = useTheme()

// Local state
const sourcesPanelOpen = ref(false)
const highlightedN = ref(null)

// Load conversation when route changes
watch(
  conversationId,
  (id) => {
    if (id && workspaceId.value) {
      chatStore.reset()
      conversationsStore.fetchConversation(workspaceId.value, id)
    }
  },
  { immediate: true },
)

const conversation = computed(() => conversationsStore.currentConversation)
const linkedDatasetIds = computed(() => conversationsStore.currentConversation?.dataset_ids || [])
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
    sources: citationsByMsgId.value.get(m.id) || [],
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

const allCitations = computed(() => conversationsStore.currentConversation?.citations || [])

// Actions
async function onSend(text) {
  await chat.sendMessage(text)
}

function onRate(msg, rating) {
  chatActions.rateMessage(msg, rating)
}

function onCite(msgId, n) {
  chatActions.setHighlight(msgId, n)
  highlightedN.value = n
  sourcesPanelOpen.value = true
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
  position: absolute;
  top: 0;
  right: 0;
  width: 340px;
  height: 100%;
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

.chat-view__source-score {
  font-size: 11px;
  color: var(--ink-3);
}

.chat-view__source-title {
  font-weight: 500;
  font-size: 12px;
  color: var(--ink);
}

.chat-view__source-url {
  font-size: 11px;
  color: var(--ink-3);
  margin-top: 2px;
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
