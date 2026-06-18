<script setup>
import { Bot, Paperclip, LayoutGrid, ChevronDown, ArrowUp, Search, Check } from "lucide-vue-next"
</script>

<template>
  <MockFrame
    label="ragbot — choose sources"
    caption="Selected datasets pin to the top; the rest are searchable below."
  >
    <div class="srp">
      <div class="srp__welcome">
        <div class="srp__greeting">Good afternoon</div>
        <div class="srp__sub">Choose which datasets this conversation can search.</div>
      </div>

      <div class="srp__composer">
        <div class="srp__inner">
          <!-- Linked sources drawer (open), floats above the composer -->
          <div class="srp__drawer">
            <div class="srp__drawer-header">
              <span class="srp__drawer-title">Linked sources</span>
              <span class="srp__drawer-sub">Select datasets</span>
            </div>
            <div class="srp__search">
              <Search :size="14" class="srp__search-icon" />
              <span class="srp__search-placeholder">Search datasets…</span>
            </div>

            <div class="srp__group">Selected · 2</div>
            <div class="srp__ds-row srp__ds-row--active">
              <span class="srp__ds-info">
                <span class="srp__ds-name">Company handbook</span>
                <span class="srp__ds-meta">12 files</span>
              </span>
              <span class="srp__ds-check srp__ds-check--on"><Check :size="12" /></span>
            </div>
            <div class="srp__ds-row srp__ds-row--active">
              <span class="srp__ds-info">
                <span class="srp__ds-name">Support macros</span>
                <span class="srp__ds-meta">5 files</span>
              </span>
              <span class="srp__ds-check srp__ds-check--on"><Check :size="12" /></span>
            </div>

            <div class="srp__divider" />
            <div class="srp__group">Recent</div>
            <div class="srp__ds-row">
              <span class="srp__ds-info">
                <span class="srp__ds-name">Product FAQ</span>
                <span class="srp__ds-meta">8 files</span>
              </span>
              <span class="srp__ds-check" />
            </div>
            <div class="srp__ds-row">
              <span class="srp__ds-info">
                <span class="srp__ds-name">Release notes</span>
                <span class="srp__ds-meta">3 files</span>
              </span>
              <span class="srp__ds-check" />
            </div>
          </div>

          <div class="srp__card">
            <div class="srp__textarea srp__textarea--placeholder">
              Ask anything about your sources…
            </div>

            <div class="srp__row">
              <button class="srp__icon-btn srp__icon-btn--active" title="Support agent">
                <Bot :size="15" />
              </button>
              <button class="srp__icon-btn srp__icon-btn--active" title="Choose sources">
                <Paperclip :size="16" />
              </button>
              <button class="srp__chip">
                <LayoutGrid :size="16" />
                2 sources
                <ChevronDown :size="16" />
              </button>
              <button class="srp__send srp__send--disabled" disabled>
                Send
                <ArrowUp :size="16" />
              </button>
            </div>
          </div>

          <div class="srp__hint">
            RAGBot is AI and can make mistakes. Please double-check responses.
          </div>
        </div>
      </div>
    </div>
  </MockFrame>
</template>

<style scoped>
/* ── shell ── */
.srp {
  display: flex;
  flex-direction: column;
  /* Tall enough that the ~451px drawer (floats above the composer via
     bottom: 100% + 8px) sits fully inside the frame and clears the greeting:
     drawer 451 + 8 gap + composer/hint ~150 + welcome clearance ~115 ≈ 724. */
  min-height: 724px;
}
.srp__welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 28px 24px 0;
  text-align: center;
}
.srp__greeting {
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--ink);
  line-height: 1.2;
}
.srp__sub {
  font-size: var(--t-md);
  color: var(--ink-3);
  max-width: 360px;
  line-height: 1.55;
}
.srp__composer {
  margin-top: auto;
  padding: 10px 16px 14px;
  flex-shrink: 0;
}
.srp__inner {
  margin: 0 auto;
  max-width: 100%;
  position: relative;
}
.srp__card {
  background: var(--surface);
  border: 1px solid var(--line-2);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-2);
  padding: 10px 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.srp__textarea {
  font: 400 15px var(--font-sans);
  color: var(--ink);
  min-height: 24px;
  line-height: 1.5;
}
.srp__textarea--placeholder {
  color: var(--ink-4);
}
.srp__row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.srp__icon-btn {
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
.srp__icon-btn--active {
  background: var(--brand-tint);
  color: var(--brand-3);
}
.dark .srp__icon-btn--active {
  color: var(--brand);
}
.srp__chip {
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
.srp__send {
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
.srp__send--disabled {
  background: var(--bg-2);
  color: var(--ink-4);
  cursor: not-allowed;
}
.srp__hint {
  text-align: center;
  margin-top: 8px;
  font-size: 11px;
  color: var(--ink-4);
}

/* ── linked-sources drawer ── */
.srp__drawer {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 0;
  width: 300px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-3);
  padding: 8px;
  z-index: 40;
}
.srp__drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px 8px;
  border-bottom: 1px solid var(--line);
  margin-bottom: 6px;
}
.srp__drawer-title {
  font-size: var(--t-base);
  font-weight: 600;
  color: var(--ink);
}
.srp__drawer-sub {
  font-size: 10.5px;
  font-weight: 700;
  color: var(--ink-3);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.srp__search {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 2px 2px 8px;
  padding: 7px 10px;
  border: 1px solid var(--line-2);
  border-radius: var(--r-sm);
  background: var(--bg);
}
.srp__search-icon {
  color: var(--ink-4);
  flex-shrink: 0;
}
.srp__search-placeholder {
  font: 400 12.5px var(--font-sans);
  color: var(--ink-4);
}
.srp__group {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--ink-4);
  padding: 6px 8px 3px;
}
.srp__divider {
  height: 1px;
  background: var(--line);
  margin: 6px;
}
.srp__ds-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding: 9px 10px;
  border-radius: var(--r-sm);
}
.srp__ds-row--active {
  background: var(--brand-tint);
}
.srp__ds-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.srp__ds-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--ink);
}
.srp__ds-meta {
  font-size: 11px;
  color: var(--ink-3);
  margin-top: 1px;
}
.srp__ds-check {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 1.5px solid var(--line-2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}
.srp__ds-check--on {
  background: var(--brand);
  border-color: var(--brand);
}
</style>
