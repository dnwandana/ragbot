<template>
  <div class="chat-container">
    <a-page-header
      class="chat-header"
      :title="conversation?.title || 'Untitled'"
      @back="$router.push(`/workspaces/${workspaceId}/conversations`)"
    >
      <template #extra>
        <a-tag v-for="did in conversation?.dataset_ids || []" :key="did" color="blue"
          >Dataset</a-tag
        >
      </template>
    </a-page-header>

    <div class="chat-body">
      <div ref="messagesEl" class="messages-col">
        <template v-for="msg in visibleMessages" :key="msg.id">
          <div class="message-row" :class="{ 'message-row--user': msg.role === 'user' }">
            <a-card
              class="message-bubble"
              :class="{ 'message-bubble--user': msg.role === 'user' }"
              size="small"
              :bordered="false"
            >
              <pre class="message-text">{{ msg.content }}</pre>
            </a-card>
          </div>
        </template>

        <template v-if="isStreaming">
          <div v-for="(thought, i) in thoughts" :key="`thought-${i}`" class="react-step">
            <a-collapse size="small" ghost>
              <a-collapse-panel :key="`t${i}`" header="▸ Thinking...">
                <pre class="react-step-text">{{ thought.content }}</pre>
              </a-collapse-panel>
            </a-collapse>
          </div>
          <div v-for="(obs, i) in observations" :key="`obs-${i}`" class="react-step">
            <a-collapse size="small" ghost>
              <a-collapse-panel :key="`o${i}`" header="▸ Found sources">
                <pre class="react-step-text">{{ obs.content }}</pre>
              </a-collapse-panel>
            </a-collapse>
          </div>
          <div v-if="currentContent" class="message-row">
            <a-card class="message-bubble" size="small" :bordered="false">
              <pre class="message-text">{{ currentContent }}<span class="cursor">▋</span></pre>
            </a-card>
          </div>
        </template>

        <a-alert v-if="chatError" class="chat-error" type="error" :message="chatError" />
      </div>

      <div v-if="citations.length" class="citations-panel">
        <h4>Citations</h4>
        <div v-for="c in citations" :key="c.citation_number" class="citation-card">
          <strong>[{{ c.citation_number }}]</strong>
          <a-tag size="small" :color="relevanceColor(c.relevance_score)" class="citation-score">{{
            c.relevance_score?.toFixed(2)
          }}</a-tag>
          <p class="citation-text">{{ c.cited_text }}</p>
        </div>
      </div>
    </div>

    <div class="input-bar">
      <a-input-group compact class="input-group">
        <a-textarea
          v-model:value="inputContent"
          class="input-textarea"
          :auto-size="{ minRows: 1, maxRows: 6 }"
          placeholder="Ask something about your documents..."
          :disabled="isStreaming"
          @keydown.enter.exact.prevent="handleSend"
        />
        <a-button
          class="input-send"
          type="primary"
          :loading="isStreaming"
          :disabled="!inputContent.trim()"
          @click="handleSend"
        >
          Send
        </a-button>
      </a-input-group>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from "vue"
import { useRoute } from "vue-router"
import { useConversationsStore } from "../../stores/conversations.js"
import { useChatStore } from "../../stores/chat.js"
import { useChat } from "../../composables/useChat.js"

const route = useRoute()
const workspaceId = route.params.workspaceId
const conversationId = route.params.conversationId

const conversationsStore = useConversationsStore()
const chatStore = useChatStore()
const { sendMessage, abort } = useChat(workspaceId, conversationId)

const conversation = computed(() => conversationsStore.currentConversation)
const visibleMessages = computed(() =>
  (conversation.value?.messages || []).filter((m) =>
    ["input", "final_answer"].includes(m.step_type),
  ),
)
const citations = computed(() => conversation.value?.citations || [])
const isStreaming = computed(() => chatStore.isStreaming)
const currentContent = computed(() => chatStore.currentContent)
const thoughts = computed(() => chatStore.thoughts)
const observations = computed(() => chatStore.observations)
const chatError = computed(() => chatStore.error)

const inputContent = ref("")
const messagesEl = ref(null)

const relevanceColor = (score) => {
  if (!score) return "default"
  if (score >= 0.8) return "green"
  if (score >= 0.6) return "orange"
  return "red"
}

async function handleSend() {
  const content = inputContent.value.trim()
  if (!content || isStreaming.value) return
  inputContent.value = ""
  await sendMessage(content)
}

// Auto-scroll to bottom when new content arrives
watch([visibleMessages, currentContent], async () => {
  await nextTick()
  if (messagesEl.value) {
    messagesEl.value.scrollTop = messagesEl.value.scrollHeight
  }
})

onMounted(async () => {
  chatStore.reset()
  await conversationsStore.fetchConversation(workspaceId, conversationId)
})

onUnmounted(() => {
  abort()
  chatStore.reset()
})
</script>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 0;
}
.chat-header {
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}
.chat-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}
.messages-col {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.message-row {
  align-self: flex-start;
  max-width: 70%;
}
.message-row--user {
  align-self: flex-end;
}
.message-bubble {
  background: #f5f5f5;
}
.message-bubble--user {
  background: #1890ff;
  color: #fff;
}
.message-text {
  white-space: pre-wrap;
  margin: 0;
  font-family: inherit;
}
.react-step {
  align-self: flex-start;
  max-width: 70%;
}
.react-step-text {
  font-size: 12px;
  color: #888;
}
.chat-error {
  align-self: center;
}
.citations-panel {
  width: 300px;
  border-left: 1px solid #f0f0f0;
  overflow-y: auto;
  padding: 16px;
  flex-shrink: 0;
}
.citation-card {
  margin-bottom: 12px;
  padding: 8px;
  background: #fafafa;
  border-radius: 4px;
}
.citation-score {
  margin-left: 4px;
}
.citation-text {
  font-size: 12px;
  color: #666;
  margin: 4px 0 0;
}
.input-bar {
  padding: 16px;
  border-top: 1px solid #f0f0f0;
  flex-shrink: 0;
}
.input-group {
  display: flex;
}
.input-textarea {
  flex: 1;
  resize: none;
}
.input-send {
  height: auto;
}
.cursor {
  animation: blink 1s step-end infinite;
}
@keyframes blink {
  50% {
    opacity: 0;
  }
}
</style>
