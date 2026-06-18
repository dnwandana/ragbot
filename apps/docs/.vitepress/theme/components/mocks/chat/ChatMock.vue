<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue"
import { LayoutGrid, History, Copy, File } from "lucide-vue-next"

const stage = ref(0) // 0 idle, 1 searching, 2 answered
let timers = []

function clearTimers() {
  timers.forEach(clearTimeout)
  timers = []
}
function run() {
  clearTimers()
  stage.value = 1
  timers.push(setTimeout(() => (stage.value = 2), 1500))
}
onMounted(() => {
  timers.push(setTimeout(run, 600))
})
onBeforeUnmount(clearTimers)
</script>

<template>
  <MockFrame
    label="ragbot — chat"
    caption="A real answer cites the exact passages it came from. Hover a number to preview the source."
  >
    <div class="chat-thread__inner">
      <!-- User message -->
      <div class="chat-message chat-message--user">
        <div class="chat-message__bubble chat-message__bubble--user">
          What was our refund policy window in the 2024 handbook?
        </div>
        <div class="chat-message__actions chat-message__actions--user">
          <span class="chat-message__role">you</span>
          <span class="chat-message__dot">·</span>
          <span class="chat-message__time">just now</span>
          <button class="chat-message__tool-btn" title="Copy">
            <Copy :size="16" />
          </button>
        </div>
      </div>

      <!-- Agent message — answered state -->
      <div v-if="stage >= 2" class="chat-message chat-message--agent">
        <div class="chat-message__bubble chat-message__bubble--agent fade-in">
          <!-- Message body with inline cite chips -->
          <p class="chat-message__body">
            Customers can request a refund within <strong>30 days</strong> of purchase<span
              class="cite-ref"
              title="employee-handbook-2024.pdf · p.42"
              >1</span
            >. Items must be unused and in original packaging<span
              class="cite-ref"
              title="returns-policy.docx · §3"
              >2</span
            >. Refunds are processed back to the original payment method within 5–7 business
            days<span class="cite-ref" title="employee-handbook-2024.pdf · p.42">1</span>.
          </p>

          <!-- Source citations footer -->
          <div class="chat-message__sources">
            <div class="source-citations">
              <div class="source-citations__sources">
                <span class="source-pill"
                  ><span class="source-pill__num">1</span
                  ><File :size="12" />employee-handbook-2024.pdf<span class="source-pill__loc"
                    >· p.42</span
                  ></span
                >
                <span class="source-pill"
                  ><span class="source-pill__num">2</span
                  ><File :size="12" />returns-policy.docx<span class="source-pill__loc"
                    >· §3</span
                  ></span
                >
              </div>
              <button class="source-toggle">
                <LayoutGrid :size="16" />
                2 sources
              </button>
            </div>
          </div>
        </div>

        <!-- Meta row -->
        <div class="chat-message__actions">
          <span class="chat-message__role">RAGBot</span>
          <span class="chat-message__dot">·</span>
          <span class="chat-message__time">just now</span>
          <button class="chat-message__tool-btn" title="Copy">
            <Copy :size="16" />
          </button>
        </div>
      </div>

      <!-- Searching / loading indicator -->
      <div v-else-if="stage === 1" class="chat-thread__searching">
        <div class="chat-thread__search-meta">
          <span class="chat-thread__search-role">RAGBot</span> · now
        </div>
        <div class="chat-thread__search-box">
          <span class="chat-thread__pulse" />
          <span class="chat-thread__search-label">Searching 3 sources…</span>
        </div>
      </div>
    </div>

    <!-- Replay button -->
    <div class="replay-row">
      <button class="replay-btn" @click="run">
        <History :size="13" />
        Replay
      </button>
    </div>
  </MockFrame>
</template>

<style scoped>
/* ── Thread inner ── */
.chat-thread__inner {
  display: flex;
  flex-direction: column;
  gap: 26px;
}

/* ── Message row ── */
.chat-message {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
}

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

/* ── Message body ── */
.chat-message__body {
  font-size: var(--t-md);
  line-height: 1.6;
  color: var(--ink);
  margin: 0;
}

/* ── Actions / meta row ── */
.chat-message__actions {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  font-size: 11.5px;
  font-family: var(--font-mono);
  color: var(--ink-4);
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

/* ── Tool button ── */
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
}

.chat-message__tool-btn:hover {
  background: var(--bg-2);
  color: var(--ink-2);
}

/* ── Inline citation ref chip ── */
.cite-ref {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 17px;
  height: 17px;
  padding: 0 4px;
  margin-left: 2px;
  border-radius: 4px;
  background: var(--brand-tint);
  color: var(--brand-3);
  font: 600 10.5px var(--font-mono);
  vertical-align: 1px;
  cursor: pointer;
  border: 1px solid rgba(255, 107, 53, 0.2);
  transition:
    background var(--dur) var(--ease),
    color var(--dur) var(--ease);
  position: relative;
  top: -1px;
}

.cite-ref:hover {
  background: var(--brand);
  color: #fff;
}

.dark .cite-ref {
  color: var(--brand);
}

/* ── Sources section ── */
.chat-message__sources {
  margin-top: 12px;
}

.source-citations {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.source-citations__sources {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

/* Source pills (individual file references) */
.source-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 9px 5px 7px;
  border-radius: var(--r-sm);
  background: var(--bg-2);
  border: 1px solid var(--line);
  font-size: 11.5px;
  color: var(--ink-2);
}

.source-pill__num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 15px;
  height: 15px;
  border-radius: 3px;
  background: var(--brand-tint);
  color: var(--brand-3);
  font: 600 9.5px/1 var(--font-mono);
}

.dark .source-pill__num {
  color: var(--brand);
}

.source-pill :deep(svg) {
  color: var(--ink-3);
}

.source-pill__loc {
  color: var(--ink-4);
  font-family: var(--font-mono);
  font-size: 10.5px;
}

/* ── Source toggle button (SourceCitations.vue style) ── */
.source-toggle {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 5px 10px 5px 8px;
  border-radius: var(--r-sm);
  background: transparent;
  border: 1px solid var(--line);
  color: var(--ink-3);
  font: 500 12px var(--font-sans);
  cursor: pointer;
  transition: all var(--dur) var(--ease);
}

.source-toggle:hover {
  border-color: var(--line-2);
  color: var(--ink-2);
}

/* ── Searching indicator (ChatThread style) ── */
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

/* ── Fade-in for answered state ── */
.fade-in {
  animation: chat-fade-in 0.3s var(--ease);
}

@keyframes chat-fade-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .fade-in {
    animation: none;
  }
}

/* ── Replay button ── */
.replay-row {
  display: flex;
  justify-content: center;
  margin-top: 16px;
}

.replay-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: var(--r-sm);
  background: var(--surface);
  border: 1px solid var(--line);
  font-size: 11.5px;
  color: var(--ink-2);
  cursor: pointer;
  transition: border-color var(--dur) var(--ease);
}

.replay-btn:hover {
  border-color: var(--line-2);
}
</style>
