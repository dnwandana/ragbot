<script setup>
import { Bot, Paperclip, LayoutGrid, ChevronDown, ArrowUp } from "lucide-vue-next"
</script>

<template>
  <MockFrame
    label="ragbot — new conversation"
    caption="Pick an agent, choose the sources to search, then ask your question."
  >
    <div class="newchat">
      <!-- Welcome / empty thread state -->
      <div class="newchat__welcome">
        <div class="newchat__greeting">Good afternoon</div>
        <div class="newchat__sub">
          Ask anything and I'll search across your sources, then cite every passage I draw from.
        </div>
      </div>

      <!-- Composer -->
      <div class="newchat__composer">
        <div class="newchat__composer-inner">
          <div class="newchat__card">
            <!-- Textarea area -->
            <div class="newchat__textarea newchat__textarea--placeholder" aria-label="Message">
              Ask anything about your sources…
            </div>

            <!-- Bottom action row -->
            <div class="newchat__row">
              <!-- Agent icon button — active (agent selected) -->
              <div class="newchat__agent-wrap">
                <button
                  class="newchat__icon-btn newchat__icon-btn--active"
                  title="Support agent · GPT-5.4 Mini"
                >
                  <Bot :size="15" />
                </button>
              </div>

              <!-- Dataset drawer toggle -->
              <button class="newchat__icon-btn newchat__icon-btn--active" title="Choose sources">
                <Paperclip :size="16" />
              </button>

              <!-- Sources chip — 2 sources selected -->
              <button class="newchat__chip">
                <LayoutGrid :size="16" />
                2 sources
                <ChevronDown :size="16" />
              </button>

              <!-- Send button — disabled (no text) -->
              <button class="newchat__send newchat__send--disabled" disabled>
                Send
                <ArrowUp :size="16" />
              </button>
            </div>
          </div>

          <div class="newchat__hint">
            RAGBot is AI and can make mistakes. Please double-check responses.
          </div>
        </div>
      </div>
    </div>
  </MockFrame>
</template>

<style scoped>
/* ── Outer shell ── */
.newchat {
  display: flex;
  flex-direction: column;
  min-height: 320px;
}

/* ── Welcome / empty state ── */
.newchat__welcome {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 36px 24px 24px;
  text-align: center;
}

.newchat__greeting {
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--ink);
  line-height: 1.2;
}

.newchat__sub {
  font-size: var(--t-md);
  color: var(--ink-3);
  max-width: 360px;
  line-height: 1.55;
  margin-top: 2px;
}

/* ── Composer shell (mirrors ChatComposer.vue) ── */
.newchat__composer {
  padding: 10px 16px 14px;
  background: linear-gradient(to bottom, transparent, var(--bg) 20px);
  flex-shrink: 0;
}

.newchat__composer-inner {
  margin: 0 auto;
  max-width: 100%;
  position: relative;
}

/* Card (mirrors .chat-composer__card) */
.newchat__card {
  background: var(--surface);
  border: 1px solid var(--line-2);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-2);
  padding: 10px 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Textarea (mirrors .chat-composer__textarea) */
.newchat__textarea {
  border: none;
  outline: none;
  resize: none;
  font: 400 15px var(--font-sans);
  color: var(--ink);
  width: 100%;
  background: transparent;
  min-height: 24px;
  line-height: 1.5;
}

.newchat__textarea--placeholder {
  color: var(--ink-4);
}

/* Bottom row (mirrors .chat-composer__row) */
.newchat__row {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* Agent wrapper (mirrors .agent-picker-wrap) */
.newchat__agent-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
}

/* Icon button (mirrors .chat-composer__icon-btn) */
.newchat__icon-btn {
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
  font-size: 17px;
}

/* Active icon button (mirrors .chat-composer__icon-btn--active) */
.newchat__icon-btn--active {
  background: var(--brand-tint);
  color: var(--brand-3);
  border-color: transparent;
}

.dark .newchat__icon-btn--active {
  color: var(--brand);
}

/* Sources chip (mirrors .chat-composer__chip) */
.newchat__chip {
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

/* Send button (mirrors .chat-composer__send + .chat-composer__send--disabled) */
.newchat__send {
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
}

.newchat__send--disabled {
  background: var(--bg-2);
  color: var(--ink-4);
  cursor: not-allowed;
}

/* Hint text (mirrors .chat-composer__hint) */
.newchat__hint {
  text-align: center;
  margin-top: 8px;
  font-size: 11px;
  color: var(--ink-4);
}
</style>
