<script setup>
import { Bot, Paperclip, LayoutGrid, ChevronDown, ArrowUp, Search, Check } from "lucide-vue-next"
</script>

<template>
  <MockFrame
    label="ragbot — choose an agent"
    caption="Tap the agent button to switch which assistant answers."
  >
    <div class="agp">
      <div class="agp__welcome">
        <div class="agp__greeting">Good afternoon</div>
        <div class="agp__sub">
          Pick the assistant that answers — the workspace default is preselected.
        </div>
      </div>

      <div class="agp__composer">
        <div class="agp__inner">
          <div class="agp__card">
            <div class="agp__textarea agp__textarea--placeholder">
              Ask anything about your sources…
            </div>

            <div class="agp__row">
              <div class="agp__agent-wrap">
                <button class="agp__icon-btn agp__icon-btn--active" title="Support agent">
                  <Bot :size="15" />
                </button>

                <!-- Agent picker popup (open) -->
                <div class="agp__popup">
                  <div class="agp__popup-header">Select agent</div>
                  <div class="agp__search">
                    <Search :size="14" class="agp__search-icon" />
                    <span class="agp__search-placeholder">Search agents…</span>
                  </div>
                  <div class="agp__group">Current</div>
                  <div class="agp__pop-row agp__pop-row--active">
                    <div class="agp__pop-info">
                      <div class="agp__pop-name">Support agent</div>
                      <div class="agp__pop-sub">Default</div>
                    </div>
                    <Check :size="13" />
                  </div>
                  <div class="agp__divider" />
                  <div class="agp__group">All agents</div>
                  <div class="agp__pop-row">
                    <div class="agp__pop-info">
                      <div class="agp__pop-name">Research assistant</div>
                      <div class="agp__pop-sub">gpt-5.4</div>
                    </div>
                  </div>
                  <div class="agp__pop-row">
                    <div class="agp__pop-info">
                      <div class="agp__pop-name">Policy Q&amp;A</div>
                      <div class="agp__pop-sub">gpt-5.4-mini</div>
                    </div>
                  </div>
                </div>
              </div>

              <button class="agp__icon-btn agp__icon-btn--active" title="Choose sources">
                <Paperclip :size="16" />
              </button>

              <button class="agp__chip">
                <LayoutGrid :size="16" />
                2 sources
                <ChevronDown :size="16" />
              </button>

              <button class="agp__send agp__send--disabled" disabled>
                Send
                <ArrowUp :size="16" />
              </button>
            </div>
          </div>

          <div class="agp__hint">
            RAGBot is AI and can make mistakes. Please double-check responses.
          </div>
        </div>
      </div>
    </div>
  </MockFrame>
</template>

<style scoped>
/* ── shell ── */
.agp {
  display: flex;
  flex-direction: column;
  min-height: 470px;
}

/* welcome — top-aligned so the popup floats into clean space below it */
.agp__welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 28px 24px 0;
  text-align: center;
}
.agp__greeting {
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--ink);
  line-height: 1.2;
}
.agp__sub {
  font-size: var(--t-md);
  color: var(--ink-3);
  max-width: 360px;
  line-height: 1.55;
}

/* composer pinned to the bottom */
.agp__composer {
  margin-top: auto;
  padding: 10px 16px 14px;
  flex-shrink: 0;
}
.agp__inner {
  margin: 0 auto;
  max-width: 100%;
  position: relative;
}
.agp__card {
  background: var(--surface);
  border: 1px solid var(--line-2);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-2);
  padding: 10px 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.agp__textarea {
  font: 400 15px var(--font-sans);
  color: var(--ink);
  min-height: 24px;
  line-height: 1.5;
}
.agp__textarea--placeholder {
  color: var(--ink-4);
}
.agp__row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.agp__agent-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
}
.agp__icon-btn {
  width: 32px;
  height: 32px;
  border-radius: var(--r-sm);
  background: transparent;
  border: 1px solid transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ink-3);
  cursor: default;
}
.agp__icon-btn--active {
  background: var(--brand-tint);
  color: var(--brand-3);
}
.dark .agp__icon-btn--active {
  color: var(--brand);
}
.agp__chip {
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
  cursor: default;
  white-space: nowrap;
  flex-shrink: 0;
}
.agp__send {
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
  cursor: default;
}
.agp__send--disabled {
  background: var(--bg-2);
  color: var(--ink-4);
  cursor: not-allowed;
}
.agp__hint {
  text-align: center;
  margin-top: 8px;
  font-size: 11px;
  color: var(--ink-4);
}

/* ── agent picker popup ── */
.agp__popup {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 0;
  background: var(--surface);
  border: 1px solid var(--line-2);
  border-radius: var(--r);
  box-shadow: var(--shadow-3);
  min-width: 248px;
  padding: 6px;
  z-index: 30;
}
.agp__popup-header {
  font-size: 10.5px;
  font-weight: 700;
  color: var(--ink-3);
  text-transform: uppercase;
  letter-spacing: 0.07em;
  padding: 4px 8px 8px;
}
.agp__search {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 0 4px 8px;
  padding: 7px 10px;
  border: 1px solid var(--line-2);
  border-radius: var(--r-sm);
  background: var(--bg);
}
.agp__search-icon {
  color: var(--ink-4);
  flex-shrink: 0;
}
.agp__search-placeholder {
  font: 400 12.5px var(--font-sans);
  color: var(--ink-4);
}
.agp__group {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--ink-4);
  padding: 6px 8px 3px;
}
.agp__divider {
  height: 1px;
  background: var(--line);
  margin: 6px;
}
.agp__pop-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding: 9px 10px;
  border-radius: var(--r-sm);
}
.agp__pop-row--active {
  background: var(--brand-tint);
  color: var(--brand);
}
.dark .agp__pop-row--active {
  color: var(--brand);
}
.agp__pop-info {
  min-width: 0;
}
.agp__pop-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--ink);
}
.agp__pop-sub {
  font-size: 11px;
  color: var(--ink-3);
  margin-top: 1px;
}
</style>
