<template>
  <div class="chat-shell" :class="{ 'chat-shell--sources': showSources }">

    <!-- Left sidebar: conversation history -->
    <aside class="chat-sidebar">
      <div class="csb-hd">
        <button class="btn-new-chat" @click="$router.push(`/workspaces/${workspaceId}/conversations`)">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M8 3v10M3 8h10" stroke-linecap="round"/>
          </svg>
          New conversation
          <span class="kbd">⌘N</span>
        </button>
      </div>
      <div class="csb-body">
        <div class="csb-label">Recent</div>
        <div
          v-for="c in recentConversations"
          :key="c.id"
          class="csb-item"
          :class="{ active: c.id === conversationId }"
          @click="$router.push(`/workspaces/${workspaceId}/conversations/${c.id}`)"
        >
          <div class="csb-item__title">{{ c.title || "Untitled" }}</div>
          <div class="csb-item__time">{{ relativeTime(c.last_message_at || c.created_at) }}</div>
        </div>
      </div>
    </aside>

    <!-- Chat area -->
    <div class="chat-area">

      <!-- Header -->
      <div class="chat-header">
        <button class="back-btn" @click="$router.push(`/workspaces/${workspaceId}/conversations`)">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M10 4L6 8l4 4" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <div class="chat-header__info">
          <div class="chat-title">{{ conversation?.title || "Untitled" }}</div>
          <div class="chat-datasets">
            <span v-for="did in conversation?.dataset_ids || []" :key="did" class="ds-chip">Dataset</span>
          </div>
        </div>
        <button
          class="sources-toggle"
          :class="{ active: showSources }"
          @click="showSources = !showSources"
          v-if="citations.length"
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7">
            <path d="M3 2h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1zM8 5v6M5 8h6" stroke-linecap="round"/>
          </svg>
          Sources
          <span class="src-count">{{ citations.length }}</span>
        </button>
      </div>

      <!-- Message thread -->
      <div ref="messagesEl" class="chat-thread">

        <template v-for="msg in visibleMessages" :key="msg.id">
          <div class="msg-row" :class="{ 'msg-row--user': msg.role === 'user' }">
            <div class="msg-bubble" :class="msg.role === 'user' ? 'msg-bubble--user' : 'msg-bubble--ai'">
              <pre class="msg-text">{{ msg.content }}</pre>
            </div>
            <div class="msg-meta">{{ msg.role === "user" ? "You" : "RAGbot" }}</div>
          </div>
        </template>

        <!-- Streaming: ReAct steps -->
        <template v-if="isStreaming">
          <div v-for="(thought, i) in thoughts" :key="`t${i}`" class="react-step">
            <span class="react-dot" />
            <details class="react-details">
              <summary>Thinking…</summary>
              <pre class="react-content">{{ thought.content }}</pre>
            </details>
          </div>
          <div v-for="(obs, i) in observations" :key="`o${i}`" class="react-step">
            <span class="react-dot" />
            <details class="react-details">
              <summary>Found sources</summary>
              <pre class="react-content">{{ obs.content }}</pre>
            </details>
          </div>
          <div v-if="currentContent" class="msg-row">
            <div class="msg-bubble msg-bubble--ai">
              <pre class="msg-text">{{ currentContent }}<span class="blink">▋</span></pre>
            </div>
          </div>
        </template>

        <a-alert v-if="chatError" type="error" :message="chatError" style="margin: 8px 0" />
      </div>

      <!-- Mobile sources pill -->
      <div v-if="citations.length && !showSources" class="mobile-pill" @click="isMobileSourcesOpen = true">
        📎 {{ citations.length }} source{{ citations.length !== 1 ? "s" : "" }}
      </div>

      <!-- Composer -->
      <div class="chat-composer">
        <div class="composer-box" :class="{ focused: isInputFocused }">
          <textarea
            ref="inputEl"
            v-model="inputContent"
            class="composer-textarea"
            placeholder="Ask something about your documents…"
            rows="1"
            :disabled="isStreaming"
            @keydown.enter.exact.prevent="handleSend"
            @focus="isInputFocused = true"
            @blur="isInputFocused = false"
            @input="autoResize"
          />
          <button
            class="send-btn"
            :class="{ 'send-btn--ready': inputContent.trim() && !isStreaming }"
            :disabled="!inputContent.trim() || isStreaming"
            @click="handleSend"
          >
            <svg v-if="!isStreaming" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M7 12V2M3 6l4-4 4 4" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <svg v-else width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="4" y="4" width="6" height="6" rx="1" fill="currentColor"/>
            </svg>
          </button>
        </div>
        <p class="composer-hint">↵ Enter to send · Shift+↵ for new line</p>
      </div>
    </div>

    <!-- Sources panel (layout C) -->
    <aside class="sources-panel" v-if="showSources">
      <div class="sp-hd">
        <span>Sources</span>
        <span class="src-count">{{ citations.length }}</span>
        <button class="icon-btn-sm" style="margin-left:auto" @click="showSources = false">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M4 4l8 8M12 4l-8 8" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
      <div v-for="c in citations" :key="c.citation_number" class="sp-item">
        <div class="sp-num">[{{ c.citation_number }}] · {{ c.relevance_score?.toFixed(2) }}</div>
        <p class="sp-text">{{ c.cited_text }}</p>
        <span class="sp-badge" :class="relevanceBadgeClass(c.relevance_score)">
          {{ relevanceLabel(c.relevance_score) }}
        </span>
      </div>
    </aside>

    <!-- Mobile sources bottom sheet -->
    <Transition name="sheet">
      <div v-if="isMobileSourcesOpen" class="sheet-overlay" @click="isMobileSourcesOpen = false">
        <div class="sheet" @click.stop>
          <div class="sheet-handle" />
          <div class="sp-hd" style="padding: 0 0 12px">
            Sources
            <span class="src-count">{{ citations.length }}</span>
          </div>
          <div v-for="c in citations" :key="c.citation_number" class="sp-item">
            <div class="sp-num">[{{ c.citation_number }}] · {{ c.relevance_score?.toFixed(2) }}</div>
            <p class="sp-text">{{ c.cited_text }}</p>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from "vue"
import { useRoute } from "vue-router"
import { useConversationsStore } from "@/stores/conversations"
import { useChatStore } from "@/stores/chat"
import { useChat } from "@/composables/useChat"

const route = useRoute()
const workspaceId = route.params.workspaceId
const conversationId = route.params.conversationId

const conversationsStore = useConversationsStore()
const chatStore = useChatStore()
const { sendMessage, abort } = useChat(workspaceId, conversationId)

const conversation = computed(() => conversationsStore.currentConversation)
const recentConversations = computed(() => conversationsStore.conversations.slice(0, 20))
const visibleMessages = computed(() =>
  (conversation.value?.messages || []).filter((m) => ["input", "final_answer"].includes(m.step_type)),
)
const citations = computed(() => conversation.value?.citations || [])
const isStreaming = computed(() => chatStore.isStreaming)
const currentContent = computed(() => chatStore.currentContent)
const thoughts = computed(() => chatStore.thoughts)
const observations = computed(() => chatStore.observations)
const chatError = computed(() => chatStore.error)

const inputContent = ref("")
const messagesEl = ref(null)
const inputEl = ref(null)
const isInputFocused = ref(false)
const isMobileSourcesOpen = ref(false)
const showSources = ref(false)

function relevanceBadgeClass(score) {
  if (!score) return "sp-badge--gray"
  if (score >= 0.8) return "sp-badge--ok"
  if (score >= 0.6) return "sp-badge--warn"
  return "sp-badge--err"
}

function relevanceLabel(score) {
  if (!score) return "Unknown"
  if (score >= 0.8) return "High"
  if (score >= 0.6) return "Medium"
  return "Low"
}

/** @param {string} dateStr */
function relativeTime(dateStr) {
  if (!dateStr) return ""
  const diff = (Date.now() - new Date(dateStr)) / 1000
  if (diff < 60) return "Just now"
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  const d = new Date(dateStr)
  return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()]
}

function autoResize() {
  if (!inputEl.value) return
  inputEl.value.style.height = "auto"
  inputEl.value.style.height = Math.min(inputEl.value.scrollHeight, 144) + "px"
}

async function handleSend() {
  const content = inputContent.value.trim()
  if (!content || isStreaming.value) return
  inputContent.value = ""
  if (inputEl.value) inputEl.value.style.height = "auto"
  await sendMessage(content)
}

watch([visibleMessages, currentContent], async () => {
  await nextTick()
  if (messagesEl.value) messagesEl.value.scrollTop = messagesEl.value.scrollHeight
})

onMounted(async () => {
  chatStore.reset()
  await Promise.all([
    conversationsStore.fetchConversation(workspaceId, conversationId),
    conversationsStore.fetchConversations(workspaceId),
  ])
})

onUnmounted(() => {
  abort()
  chatStore.reset()
})
</script>

<style scoped>
/* Shell grid */
.chat-shell {
  display: grid;
  grid-template-columns: 260px 1fr;
  height: 100vh;
  overflow: hidden;
  background: var(--bg);
}
.chat-shell--sources {
  grid-template-columns: 260px 1fr 340px;
}

/* Left sidebar */
.chat-sidebar {
  background: var(--bg-2);
  border-right: 1px solid var(--line);
  display: flex; flex-direction: column;
  overflow: hidden;
}
.csb-hd { padding: 12px 10px; border-bottom: 1px solid var(--line); flex-shrink: 0; }
.btn-new-chat {
  display: flex; align-items: center; gap: 6px; width: 100%;
  padding: 8px 10px; background: var(--brand); color: #fff;
  border: none; border-radius: var(--r-sm); font-size: 13px; font-weight: 500; cursor: pointer;
  justify-content: flex-start;
}
.btn-new-chat:hover { background: var(--brand-2); }
.kbd {
  margin-left: auto; background: rgba(255,255,255,0.2); color: rgba(255,255,255,0.9);
  border: 1px solid rgba(255,255,255,0.3); border-radius: 4px;
  font-size: 10.5px; padding: 1px 5px;
}
.csb-body { flex: 1; overflow-y: auto; padding: 6px 6px; }
.csb-label { font-size: 10px; font-weight: 600; letter-spacing: 0.07em; text-transform: uppercase; color: var(--ink-4); padding: 6px 8px 3px; }
.csb-item {
  display: flex; align-items: baseline; gap: 6px;
  padding: 6px 8px; border-radius: var(--r-sm); cursor: pointer;
}
.csb-item:hover { background: rgba(24,18,12,0.05); }
.csb-item.active { background: var(--surface); box-shadow: var(--shadow-1); border: 1px solid var(--line); }
.csb-item__title { flex: 1; font-size: 12.5px; color: var(--ink-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.csb-item.active .csb-item__title { font-weight: 500; color: var(--ink); }
.csb-item__time { font-size: 11px; color: var(--ink-4); flex-shrink: 0; }

/* Chat area */
.chat-area {
  display: flex; flex-direction: column;
  min-width: 0; overflow: hidden;
}

.chat-header {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 18px;
  background: var(--surface); border-bottom: 1px solid var(--line);
  flex-shrink: 0;
}
.back-btn {
  display: flex; align-items: center; justify-content: center;
  width: 30px; height: 30px; border: 1px solid var(--line-2);
  background: var(--surface); border-radius: var(--r-sm); cursor: pointer;
  color: var(--ink-3); flex-shrink: 0;
}
.back-btn:hover { border-color: var(--brand); color: var(--brand); background: var(--brand-tint); }
.chat-header__info { flex: 1; min-width: 0; }
.chat-title { font-size: 14px; font-weight: 600; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.chat-datasets { display: flex; gap: 5px; margin-top: 2px; }
.ds-chip { display: inline-block; padding: 1px 7px; background: var(--brand-tint); border: 1px solid rgba(255,107,53,0.2); border-radius: 20px; font-size: 11px; color: var(--brand-3); }

.sources-toggle {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 5px 10px; border: 1px solid var(--line-2);
  border-radius: var(--r-sm); background: var(--surface);
  font-size: 12.5px; font-weight: 500; color: var(--ink-3); cursor: pointer; flex-shrink: 0;
}
.sources-toggle:hover { border-color: var(--brand); color: var(--brand); }
.sources-toggle.active { background: var(--brand-tint); border-color: rgba(255,107,53,0.3); color: var(--brand-3); }
.src-count {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 18px; height: 18px; padding: 0 5px;
  background: var(--brand); color: #fff;
  font-size: 10px; font-weight: 700; border-radius: 9px;
}

/* Message thread */
.chat-thread {
  flex: 1; overflow-y: auto;
  padding: 20px 24px;
  display: flex; flex-direction: column; gap: 14px;
}
.msg-row { display: flex; flex-direction: column; align-self: flex-start; max-width: 75%; }
.msg-row--user { align-self: flex-end; }
.msg-bubble { border-radius: 12px; padding: 10px 14px; font-size: 13.5px; line-height: 1.6; }
.msg-bubble--ai { background: var(--surface); border: 1px solid var(--line); color: var(--ink); box-shadow: var(--shadow-1); border-bottom-left-radius: 4px; }
.msg-bubble--user { background: var(--brand); color: #fff; border-bottom-right-radius: 4px; }
.msg-text { white-space: pre-wrap; margin: 0; font-family: inherit; }
.msg-meta { font-size: 11px; color: var(--ink-4); margin-top: 4px; padding: 0 4px; }
.blink { animation: blink 1s step-end infinite; }
@keyframes blink { 50% { opacity: 0; } }

/* ReAct steps */
.react-step {
  display: flex; align-items: flex-start; gap: 8px;
  background: var(--brand-tint); border: 1px solid rgba(255,107,53,0.2);
  border-radius: var(--r-sm); padding: 8px 12px;
  max-width: 65%; align-self: flex-start;
}
.react-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: var(--brand); flex-shrink: 0; margin-top: 3px;
  animation: pulse 1.4s infinite;
}
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
.react-details { flex: 1; }
.react-details summary { font-size: 12.5px; color: var(--brand-3); cursor: pointer; font-weight: 500; }
.react-content { font-size: 11.5px; color: var(--ink-3); margin-top: 6px; white-space: pre-wrap; }

/* Mobile sources pill */
.mobile-pill {
  display: none; margin: 0 16px 8px;
  padding: 7px 14px; background: var(--brand-tint);
  border: 1px solid rgba(255,107,53,0.25); border-radius: 20px;
  font-size: 13px; font-weight: 500; color: var(--brand-3);
  cursor: pointer; text-align: center; flex-shrink: 0;
}

/* Composer */
.chat-composer { padding: 10px 14px 14px; background: var(--surface); border-top: 1px solid var(--line); flex-shrink: 0; }
.composer-box {
  display: flex; align-items: flex-end; gap: 8px;
  background: var(--bg); border: 1.5px solid var(--line-2);
  border-radius: var(--r-lg); padding: 8px 8px 8px 14px;
  transition: border-color var(--dur), box-shadow var(--dur);
}
.composer-box.focused { border-color: var(--brand); box-shadow: 0 0 0 3px rgba(255,107,53,0.10); }
.composer-textarea {
  flex: 1; border: none; background: transparent; resize: none;
  font-size: 13.5px; color: var(--ink); outline: none;
  line-height: 1.5; min-height: 22px; max-height: 144px; overflow-y: auto;
  font-family: var(--font-family);
}
.composer-textarea::placeholder { color: var(--ink-4); }
.composer-textarea:disabled { opacity: 0.5; cursor: not-allowed; }
.send-btn {
  width: 34px; height: 34px; border-radius: 9px; border: none;
  background: var(--line); color: var(--ink-4);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; flex-shrink: 0; transition: background var(--dur), color var(--dur);
}
.send-btn--ready { background: var(--brand); color: #fff; }
.send-btn:disabled { cursor: not-allowed; }
.composer-hint { font-size: 11px; color: var(--ink-4); text-align: center; margin: 6px 0 0; }

/* Sources panel */
.sources-panel {
  background: var(--surface); border-left: 1px solid var(--line);
  display: flex; flex-direction: column; overflow: hidden;
}
.sp-hd {
  display: flex; align-items: center; gap: 7px;
  padding: 12px 16px; border-bottom: 1px solid var(--line);
  font-size: 13px; font-weight: 600; color: var(--ink);
  position: sticky; top: 0; background: var(--surface); flex-shrink: 0;
}
.sp-item { padding: 12px 16px; border-bottom: 1px solid var(--line); }
.sp-num { font-size: 11.5px; font-weight: 700; color: var(--brand); margin-bottom: 5px; }
.sp-text { font-size: 12px; color: var(--ink-3); line-height: 1.5; margin: 0 0 6px; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
.sp-badge { display: inline-block; font-size: 10px; font-weight: 600; padding: 2px 7px; border-radius: 20px; }
.sp-badge--ok  { background: var(--ok-bg);   color: var(--ok); }
.sp-badge--warn { background: var(--warn-bg); color: var(--warn); }
.sp-badge--err { background: var(--err-bg);  color: var(--err); }
.sp-badge--gray { background: var(--bg-2); color: var(--ink-4); }
.icon-btn-sm { display: flex; align-items: center; justify-content: center; width: 26px; height: 26px; border: none; background: transparent; cursor: pointer; color: var(--ink-4); border-radius: var(--r-sm); }
.icon-btn-sm:hover { background: var(--bg-2); color: var(--ink); }

/* Mobile sheet */
.sheet-overlay { position: fixed; inset: 0; background: rgba(24,18,12,0.35); z-index: 80; display: flex; flex-direction: column; justify-content: flex-end; }
.sheet { background: var(--surface); border-radius: 20px 20px 0 0; padding: 16px 20px 32px; max-height: 70vh; overflow-y: auto; }
.sheet-handle { width: 36px; height: 4px; background: var(--line-2); border-radius: 2px; margin: 0 auto 16px; }

/* Transitions */
.sheet-enter-active, .sheet-leave-active { transition: opacity 0.2s; }
.sheet-enter-from, .sheet-leave-to { opacity: 0; }
.sheet-enter-active .sheet, .sheet-leave-active .sheet { transition: transform 0.25s var(--ease); }
.sheet-enter-from .sheet, .sheet-leave-to .sheet { transform: translateY(100%); }

/* Breakpoints */
@media (max-width: 1100px) {
  .chat-shell { grid-template-columns: 1fr; }
  .chat-sidebar { display: none; }
  .chat-shell--sources { grid-template-columns: 1fr; }
  .sources-panel { display: none; }
  .mobile-pill { display: block; }
}
</style>
