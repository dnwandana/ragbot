<template>
  <!-- User message -->
  <div v-if="isUser" class="chat-message chat-message--user">
    <div class="chat-message__bubble chat-message__bubble--user">{{ msg.text }}</div>
    <div
      v-if="!msg.streaming && !msg.error"
      class="chat-message__actions chat-message__actions--user"
    >
      <span class="chat-message__role">you</span>
      <span class="chat-message__dot">·</span>
      <span class="chat-message__time">{{ msg.time }}</span>
      <button class="chat-message__tool-btn" title="Copy" @click="handleCopy">
        <Check v-if="copyActive" :size="16" />
        <Copy v-else :size="16" />
      </button>
    </div>
  </div>

  <!-- Agent message -->
  <div v-else class="chat-message chat-message--agent">
    <div class="chat-message__bubble chat-message__bubble--agent">
      <MarkdownRenderer
        :text="msg.text"
        :streaming="msg.streaming"
        :citation-numbers="citationNumbers"
        @cite="(n) => emit('cite', n)"
      />

      <!-- ReAct steps during streaming -->
      <div
        v-if="
          msg.streaming &&
          reActSteps &&
          (reActSteps.thoughts.length || reActSteps.observations.length)
        "
        class="chat-message__react"
      >
        <details
          v-for="(thought, i) in reActSteps.thoughts"
          :key="'t' + i"
          class="chat-message__react-step"
        >
          <summary class="chat-message__react-summary">
            <span class="chat-message__react-dot" /> Thought
          </summary>
          <div class="chat-message__react-content">{{ thought.content }}</div>
          <div v-if="thought.tool_call" class="chat-message__react-tool">
            {{ thought.tool_call }}
          </div>
        </details>
        <details
          v-for="(obs, i) in reActSteps.observations"
          :key="'o' + i"
          class="chat-message__react-step"
        >
          <summary class="chat-message__react-summary">
            <span class="chat-message__react-dot chat-message__react-dot--obs" /> Observation
          </summary>
          <div class="chat-message__react-content">{{ obs.content }}</div>
        </details>
      </div>

      <!-- Error card -->
      <div v-if="msg.error" class="chat-message__error">
        <span class="chat-message__error-icon"><CircleAlert :size="16" /></span>
        <div>
          <div class="chat-message__error-title">Generation interrupted</div>
          <div class="chat-message__error-msg">
            {{
              msg.errorMsg ||
              "The connection dropped while streaming. Your partial answer is kept above."
            }}
          </div>
        </div>
      </div>

      <!-- Source citations (only when not streaming and no error) -->
      <div
        v-if="!msg.streaming && !msg.error && msg.sources && msg.sources.length > 0"
        class="chat-message__sources"
      >
        <SourceCitations :sources="msg.sources" @open-panel="emit('open-panel')" />
      </div>
    </div>

    <!-- Meta + copy (hover-revealed, not during streaming/error) -->
    <div v-if="!msg.streaming && !msg.error" class="chat-message__actions">
      <span class="chat-message__role">RAGBot</span>
      <span class="chat-message__dot">·</span>
      <span class="chat-message__time">{{ msg.time }}</span>
      <button class="chat-message__tool-btn" title="Copy" @click="handleCopy">
        <Check v-if="copyActive" :size="16" />
        <Copy v-else :size="16" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onUnmounted } from "vue"
import { Check, Copy, CircleAlert } from "lucide-vue-next"
import MarkdownRenderer from "./MarkdownRenderer.vue"
import SourceCitations from "./SourceCitations.vue"

const props = defineProps({
  /** Message object: { id, role, text, time, sources, streaming, error, errorMsg } */
  msg: { type: Object, required: true },
  /** ReAct steps for streaming state: { thoughts: [], observations: [] } */
  reActSteps: { type: Object, default: null },
  /** Citation numbers backed by a source for this message (null while streaming) */
  citationNumbers: { type: Array, default: null },
})

const emit = defineEmits(["copy", "cite", "open-panel"])

const isUser = props.msg.role === "user"

const copyActive = ref(false)
let copyTimer = null

function handleCopy() {
  emit("copy", props.msg)
  copyActive.value = true
  clearTimeout(copyTimer)
  copyTimer = setTimeout(() => {
    copyActive.value = false
  }, 1500)
}

onUnmounted(() => clearTimeout(copyTimer))
</script>

<style scoped>
.chat-message {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
}

/* ── User message ── */
.chat-message--user {
  align-items: flex-end;
}

.chat-message--agent {
  align-items: flex-start;
}

/* ── Bubbles ── */
.chat-message__bubble--user {
  max-width: 560px;
  padding: 10px 14px;
  border-radius: var(--r-lg);
  font-size: var(--t-md);
  line-height: 1.55;
  color: var(--ink);
  background: var(--brand-tint);
  border: 1px solid rgba(255, 107, 53, 0.18);
  white-space: pre-wrap;
}

.chat-message__bubble--agent {
  width: 100%;
  padding: 14px 18px;
  border-radius: var(--r-lg);
  background: var(--surface);
  border: 1px solid var(--line);
}

/* ── Tool buttons ── */
.chat-message__tool-btn {
  width: 28px;
  height: 28px;
  border-radius: var(--r-sm);
  background: transparent;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ink-4);
  cursor: pointer;
  transition: all var(--dur) var(--ease);
  font-size: 14px;
}

.chat-message__tool-btn:hover {
  background: var(--bg-2);
  color: var(--ink-2);
}

/* ── Meta + actions row (hover-revealed) ── */
.chat-message__actions {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  font-size: 11.5px;
  font-family: var(--font-mono);
  color: var(--ink-4);
  opacity: 0;
  transition: opacity var(--dur) var(--ease);
}

.chat-message:hover .chat-message__actions,
.chat-message:has(:focus-visible) .chat-message__actions {
  opacity: 1;
}

.chat-message--agent .chat-message__actions {
  margin-left: -4px;
}

.chat-message__actions--user {
  justify-content: flex-end;
  margin-right: -4px;
}

.chat-message__role {
  font-weight: 600;
  color: var(--ink-3);
}

.chat-message__dot,
.chat-message__time {
  color: var(--ink-4);
}

/* ── ReAct steps ── */
.chat-message__react {
  margin-top: 10px;
}

.chat-message__react-step {
  margin-bottom: 4px;
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  overflow: hidden;
}

.chat-message__react-summary {
  padding: 6px 10px;
  font-size: var(--t-sm);
  font-weight: 500;
  color: var(--ink-2);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--bg-2);
}

.chat-message__react-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--brand);
  animation: ragbot-pulse 1.2s ease-in-out infinite;
}

.chat-message__react-dot--obs {
  background: var(--ok);
}

.chat-message__react-content {
  padding: 8px 10px;
  font-size: var(--t-sm);
  color: var(--ink-3);
  line-height: 1.5;
}

.chat-message__react-tool {
  padding: 4px 10px 8px;
  font-size: var(--t-xs);
  font-family: var(--font-mono);
  color: var(--ink-4);
}

@keyframes ragbot-pulse {
  0%,
  100% {
    opacity: 0.35;
    transform: scale(0.8);
  }

  50% {
    opacity: 1;
    transform: scale(1);
  }
}

/* ── Error card ── */
.chat-message__error {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-top: 10px;
  padding: 12px 14px;
  border-radius: var(--r);
  background: var(--err-bg);
  border: 1px solid var(--err-border);
  max-width: 580px;
}

.chat-message__error-icon {
  color: var(--err);
  flex-shrink: 0;
}

.chat-message__error-title {
  font-size: var(--t-base);
  font-weight: 600;
  color: var(--err-2);
}

.chat-message__error-msg {
  font-size: var(--t-sm);
  color: var(--ink-2);
  margin-top: 2px;
  line-height: 1.5;
}

/* ── Sources section ── */
.chat-message__sources {
  margin-top: 12px;
}
</style>
