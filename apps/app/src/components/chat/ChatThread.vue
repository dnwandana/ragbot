<template>
  <div ref="scrollRef" class="chat-thread">
    <!-- Welcome state: empty conversation -->
    <div v-if="messages.length === 0 && !loading" class="chat-thread__welcome">
      <img
        :src="theme === 'dark' ? emptyThreadDark : emptyThreadLight"
        alt=""
        class="chat-thread__welcome-img"
      />
      <div class="chat-thread__greeting">{{ greetingText }}</div>
      <div class="chat-thread__sub">
        Ask anything and I'll search across {{ sourceLabel }}, then cite every passage I draw from.
        Start with one of these, or write your own.
      </div>
      <div class="chat-thread__prompts">
        <button
          v-for="(prompt, i) in prompts"
          :key="i"
          class="chat-thread__prompt"
          @click="emit('send', prompt.text)"
        >
          <span class="chat-thread__prompt-icon">
            <component :is="promptIcon(prompt.icon)" />
          </span>
          <span>{{ prompt.text }}</span>
        </button>
      </div>
    </div>

    <!-- Message list -->
    <div
      v-else
      class="chat-thread__inner"
      :style="{ gap: density === 'compact' ? '16px' : '26px' }"
    >
      <ChatMessage
        v-for="m in messages"
        :key="m.id"
        :msg="m"
        :re-act-steps="m.streaming ? reActSteps : null"
        @copy="emit('copy', $event)"
        @cite="(n) => emit('cite', m.id, n)"
        @open-panel="emit('open-panel', m.id)"
      />

      <!-- Searching / loading indicator -->
      <div v-if="loading" class="chat-thread__searching">
        <div class="chat-thread__search-meta">
          <span class="chat-thread__search-role">RAGBot</span> · now
        </div>
        <div class="chat-thread__search-box">
          <span class="chat-thread__pulse" />
          <span class="chat-thread__search-label">{{ loadingLabel }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from "vue"
import {
  KeyOutlined,
  CodeOutlined,
  TableOutlined,
  BookOutlined,
  MessageOutlined,
} from "@ant-design/icons-vue"
import ChatMessage from "./ChatMessage.vue"

const ICON_MAP = { key: KeyOutlined, code: CodeOutlined, table: TableOutlined, book: BookOutlined }

const props = defineProps({
  messages: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  loadingLabel: { type: String, default: "Searching…" },
  streaming: { type: Boolean, default: false },
  reActSteps: { type: Object, default: () => ({ thoughts: [], observations: [] }) },
  prompts: { type: Array, default: () => [] },
  sourceLabel: { type: String, default: "your sources" },
  theme: { type: String, default: "light" },
  density: { type: String, default: "comfortable" },
})

const emit = defineEmits(["send", "copy", "cite", "open-panel"])

const scrollRef = ref(null)

const emptyThreadLight = "/assets/empty-thread.svg"
const emptyThreadDark = "/assets/empty-thread-dark.svg"

const greetingText = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 18) return "Good afternoon"
  return "Good evening"
})

function promptIcon(icon) {
  return ICON_MAP[icon] || MessageOutlined
}

watch(
  () => [
    props.messages.length,
    props.loading,
    props.messages.map((m) => (m.text || "").length).join(","),
  ],
  async () => {
    await nextTick()
    if (scrollRef.value) {
      scrollRef.value.scrollTop = scrollRef.value.scrollHeight
    }
  },
)
</script>

<style scoped>
.chat-thread {
  flex: 1;
  overflow-y: auto;
  padding: 28px 24px 8px;
  display: flex;
  flex-direction: column;
}

.chat-thread__inner {
  display: flex;
  flex-direction: column;
  flex: 0 0 auto;
}

/* ── Welcome ── */
.chat-thread__welcome {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 40px 24px;
  min-height: 360px;
  margin: auto 0;
}

.chat-thread__welcome-img {
  width: 150px;
  height: 120px;
  margin-bottom: 8px;
  opacity: 0.95;
}

.chat-thread__greeting {
  font-size: 26px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--ink);
  text-align: center;
  line-height: 1.2;
}

.chat-thread__sub {
  font-size: var(--t-md);
  color: var(--ink-3);
  text-align: center;
  max-width: 420px;
  line-height: 1.55;
  margin-top: 2px;
}

.chat-thread__prompts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  max-width: 560px;
  width: 100%;
  margin-top: 22px;
}

.chat-thread__prompt {
  display: flex;
  align-items: flex-start;
  gap: 11px;
  padding: 13px 15px;
  border: 1px solid var(--line);
  border-radius: var(--r);
  background: var(--surface);
  font-size: var(--t-base);
  color: var(--ink-2);
  cursor: pointer;
  text-align: left;
  line-height: 1.45;
  transition: all var(--dur) var(--ease);
}

.chat-thread__prompt:hover {
  background: var(--bg-2);
  border-color: var(--line-2);
}

.chat-thread__prompt-icon {
  color: var(--brand);
  flex-shrink: 0;
  margin-top: 1px;
  display: flex;
  font-size: 17px;
}

/* ── Searching indicator ── */
.chat-thread__searching {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
}

.chat-thread__search-meta {
  font-size: 11.5px;
  color: var(--ink-4);
  font-family: var(--font-mono);
  padding-left: 2px;
}

.chat-thread__search-role {
  font-weight: 600;
  color: var(--ink-3);
}

.chat-thread__search-box {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: var(--r);
  background: var(--bg-2);
  border: 1px solid var(--line);
}

.chat-thread__pulse {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--brand);
  animation: ragbot-pulse 1.2s ease-in-out infinite;
  flex-shrink: 0;
}

.chat-thread__search-label {
  font-size: var(--t-sm);
  color: var(--ink-3);
  font-family: var(--font-mono);
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
</style>
