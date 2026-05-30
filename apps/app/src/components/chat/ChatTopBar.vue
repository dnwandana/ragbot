<template>
  <div class="chat-topbar">
    <input
      v-if="editing"
      ref="inputRef"
      class="chat-topbar__title-input"
      :value="draft"
      @input="draft = $event.target.value"
      @keydown.enter="commit"
      @keydown.escape="cancel"
      @blur="commit"
    />
    <div
      v-else
      class="chat-topbar__title"
      title="Click to rename"
      @click="startEditing"
      @mouseenter="$event.currentTarget.style.background = 'var(--bg-2)'"
      @mouseleave="$event.currentTarget.style.background = 'transparent'"
    >
      {{ title }}
    </div>

    <div v-if="messageCount > 0" class="chat-topbar__meta">
      · {{ messageCount }} {{ messageCount === 1 ? "message" : "messages" }}
    </div>

    <div class="chat-topbar__spacer" />

    <div
      class="chat-topbar__ctx"
      :title="`${contextUsed.toLocaleString()} of ${contextMax.toLocaleString()} tokens used`"
    >
      <div class="chat-topbar__ctx-bar">
        <div
          class="chat-topbar__ctx-fill"
          :style="{
            width: pct + '%',
            background: pct > 85 ? 'var(--err)' : pct > 60 ? 'var(--warn)' : 'var(--brand)',
          }"
        />
      </div>
      <span class="chat-topbar__ctx-label"
        >{{ fmtTokens(contextUsed) }}/{{ fmtTokens(contextMax) }}</span
      >
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from "vue"

const props = defineProps({
  title: { type: String, required: true },
  messageCount: { type: Number, default: 0 },
  contextUsed: { type: Number, default: 0 },
  contextMax: { type: Number, default: 200000 },
})

const emit = defineEmits(["rename"])

const editing = ref(false)
const draft = ref(props.title)
const inputRef = ref(null)

watch(
  () => props.title,
  (t) => {
    draft.value = t
  },
)

const pct = computed(() => Math.min(100, Math.round((props.contextUsed / props.contextMax) * 100)))

async function startEditing() {
  editing.value = true
  await nextTick()
  if (inputRef.value) {
    inputRef.value.focus()
    inputRef.value.select()
  }
}

function commit() {
  if (!editing.value) return
  editing.value = false
  const trimmed = draft.value.trim()
  if (trimmed && trimmed !== props.title) {
    emit("rename", trimmed)
  } else {
    draft.value = props.title
  }
}

function cancel() {
  draft.value = props.title
  editing.value = false
}

function fmtTokens(n) {
  return n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "K" : String(n)
}
</script>

<style scoped>
.chat-topbar {
  height: 52px;
  border-bottom: 1px solid var(--line);
  background: var(--bg);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 16px;
  flex-shrink: 0;
}

.chat-topbar__title {
  font-size: var(--t-md);
  font-weight: 600;
  color: var(--ink);
  letter-spacing: -0.005em;
  padding: 4px 6px;
  border-radius: var(--r-sm);
  cursor: text;
  max-width: 360px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-topbar__title-input {
  font-size: var(--t-md);
  font-weight: 600;
  color: var(--ink);
  letter-spacing: -0.005em;
  padding: 4px 6px;
  border-radius: var(--r-sm);
  border: 1px solid var(--brand);
  outline: none;
  background: var(--surface);
  box-shadow: 0 0 0 2px rgba(255, 107, 53, 0.16);
  font: 600 15px var(--font-sans);
  width: 320px;
}

.chat-topbar__meta {
  font-size: var(--t-sm);
  color: var(--ink-4);
  font-family: var(--font-mono);
}

.chat-topbar__spacer {
  flex: 1;
}

.chat-topbar__ctx {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 5px 11px;
  border-radius: var(--r-sm);
  font-size: var(--t-sm);
  color: var(--ink-3);
}

.chat-topbar__ctx-bar {
  width: 48px;
  height: 5px;
  border-radius: 3px;
  background: var(--line);
  overflow: hidden;
}

.chat-topbar__ctx-fill {
  height: 100%;
  transition: width var(--dur) var(--ease);
}

.chat-topbar__ctx-label {
  font-family: var(--font-mono);
  font-size: 11.5px;
}
</style>
