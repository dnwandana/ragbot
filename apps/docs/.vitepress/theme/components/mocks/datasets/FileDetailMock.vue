<script setup>
import { Sparkles, ArrowRight, X } from "lucide-vue-next"

const questions = [
  "What problem does Bitcoin aim to solve?",
  "How does proof-of-work prevent double-spending?",
  "What role do nodes play in the network?",
]

const chunks = [
  {
    index: 1,
    content:
      "A purely peer-to-peer version of electronic cash would allow online payments to be sent directly from one party to another…",
  },
  {
    index: 2,
    content:
      "The network timestamps transactions by hashing them into an ongoing chain of hash-based proof-of-work…",
  },
]

function padIndex(i) {
  return String(i + 1).padStart(2, "0")
}
</script>

<template>
  <MockFrame
    label="ragbot — bitcoin.pdf"
    caption="A file’s detail panel: status and size, auto-generated questions, and a preview of the indexed chunks."
  >
    <!-- Panel shell: fixed-width right-side drawer look, rendered inline -->
    <div class="fd-panel">
      <!-- Header -->
      <div class="fd-head">
        <div class="fd-head-info">
          <p class="fd-filename">bitcoin.pdf</p>
          <div class="fd-meta">
            <span class="fd-type-badge fd-type-pdf">PDF</span>
            <span>34 chunks</span>
          </div>
        </div>
        <button class="fd-icon-btn" aria-label="Close">
          <X :size="14" :stroke-width="1.8" />
        </button>
      </div>

      <!-- Body -->
      <div class="fd-body">
        <!-- File info section -->
        <section>
          <h3 class="fd-section-label">File info</h3>
          <dl class="fd-info-list">
            <div class="fd-info-row">
              <dt>Status</dt>
              <dd>
                <!-- Isolated pill — does NOT inherit global .chip to avoid border-radius/border collision -->
                <span class="fd-status-pill fd-status-pill--ok">
                  <span class="fd-status-dot" />
                  Indexed
                </span>
              </dd>
            </div>
            <div class="fd-info-row">
              <dt>Added</dt>
              <dd>Jan 3, 2009</dd>
            </div>
            <div class="fd-info-row">
              <dt>Chunks</dt>
              <dd class="fd-mono">34</dd>
            </div>
            <div class="fd-info-row">
              <dt>Size</dt>
              <dd class="fd-mono">184 KB</dd>
            </div>
          </dl>
        </section>

        <!-- Explore this document -->
        <section class="fd-explore-section">
          <div class="fd-sec-head">
            <h3 class="fd-section-label fd-section-label--spark">
              <Sparkles :size="12" class="fd-spark" />
              Explore this document
            </h3>
            <span class="fd-sec-count">Showing 3 of 3</span>
          </div>
          <div class="fd-q-card">
            <button v-for="(q, i) in questions" :key="q" class="fd-q-row">
              <span class="fd-q-idx">[{{ padIndex(i) }}]</span>
              <span class="fd-q-txt">{{ q }}</span>
              <ArrowRight :size="14" class="fd-q-arrow" />
            </button>
          </div>
          <p class="fd-q-foot">
            Suggested starting points, generated from the indexed text. Pick one to open a
            conversation grounded in this file.
          </p>
        </section>

        <!-- Chunk preview -->
        <section class="fd-chunk-section">
          <div class="fd-sec-head">
            <h3 class="fd-section-label">Chunk preview</h3>
            <span class="fd-sec-count">Showing 2 of 34</span>
          </div>
          <div class="fd-chunks">
            <div v-for="c in chunks" :key="c.index" class="fd-chunk">
              <div class="fd-chunk-head">
                <span class="fd-chunk-idx">Chunk #{{ c.index }}</span>
              </div>
              <div class="fd-chunk-prose">{{ c.content }}</div>
            </div>
          </div>
        </section>
      </div>

      <!-- Footer -->
      <div class="fd-foot">
        <button class="fd-btn-secondary">Re-index</button>
        <button class="fd-btn-danger">Delete</button>
      </div>
    </div>
  </MockFrame>
</template>

<style scoped>
/* ── Panel shell ── */
.fd-panel {
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border: 1px solid var(--line-2);
  border-radius: var(--r);
  overflow: hidden;
}

/* ── Header ── */
.fd-head {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
}
.fd-head-info {
  flex: 1;
  min-width: 0;
}
.fd-filename {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
  word-break: break-all;
  margin: 0 0 7px;
}
.fd-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11.5px;
  color: var(--ink-3);
}
.fd-icon-btn {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--ink-3);
  border-radius: var(--r-sm);
  cursor: pointer;
}

/* ── Type badge ── */
.fd-type-badge {
  display: inline-flex;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border: 1px solid;
}
.fd-type-pdf {
  background: var(--err-bg);
  color: var(--err);
  border-color: var(--err-border);
}

/* ── Body ── */
.fd-body {
  flex: 1;
  overflow-y: auto;
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 22px;
}

/* ── Section labels ── */
.fd-section-label {
  font-size: 10.5px;
  font-weight: 600;
  color: var(--ink-4);
  text-transform: uppercase;
  letter-spacing: 0.07em;
  margin: 0 0 11px;
}
.fd-section-label--spark {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--ink-3);
  margin-bottom: 0;
}
.fd-spark {
  color: var(--brand);
}

/* ── Info list ── */
.fd-info-list {
  display: flex;
  flex-direction: column;
  gap: 9px;
  margin: 0;
}
.fd-info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12.5px;
}
.fd-info-row dt {
  color: var(--ink-3);
}
.fd-info-row dd {
  color: var(--ink-2);
  margin: 0;
}
.fd-mono {
  font-family: var(--font-mono);
}

/* ── Status pill (isolated — NOT using global .chip to avoid border-radius/border collision)
   Global .chip: border-radius 999px, no border, padding 5px 9px.
   Real panel .chip: border-radius 20px, border 1px solid, padding 2px 8px, font-size 11.5px.
   We define our own class here so neither conflicts. ── */
.fd-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 8px;
  border-radius: 20px;
  font-size: 11.5px;
  font-weight: 500;
  border: 1px solid;
}
/* Indexed = green. Explicit values so we don't rely on global .chip--ok (which has no border). */
.fd-status-pill--ok {
  background: var(--ok-bg);
  color: var(--ok);
  border-color: var(--ok-border);
}
.fd-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
}

/* ── Explore section ── */
.fd-explore-section {
  border-top: 1px solid var(--line);
  padding-top: 16px;
}
.fd-sec-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 11px;
}
.fd-sec-count {
  font-size: 11px;
  color: var(--ink-3);
  flex-shrink: 0;
}
.fd-q-card {
  border: 1px solid var(--line);
  border-radius: var(--r);
  overflow: hidden;
}
.fd-q-row {
  display: flex;
  align-items: center;
  gap: 11px;
  width: 100%;
  text-align: left;
  padding: 11px 14px;
  background: transparent;
  border: none;
  border-top: 1px solid var(--line);
  cursor: pointer;
}
.fd-q-row:first-child {
  border-top: none;
}
.fd-q-row:hover {
  background: var(--brand-tint);
}
.fd-q-idx {
  font: 500 11px var(--font-mono);
  color: var(--brand-3);
  flex-shrink: 0;
  letter-spacing: -0.02em;
}
.fd-q-txt {
  flex: 1;
  min-width: 0;
  font: 400 13px/1.45 var(--font-sans);
  color: var(--ink-2);
}
.fd-q-row:hover .fd-q-txt {
  color: var(--ink);
}
.fd-q-arrow {
  flex-shrink: 0;
  color: var(--brand-3);
  opacity: 0;
}
.fd-q-row:hover .fd-q-arrow {
  opacity: 1;
}
.fd-q-foot {
  font: 400 11px/1.5 var(--font-sans);
  color: var(--ink-3);
  margin: 9px 0 0;
}

/* ── Chunk preview ── */
.fd-chunk-section {
  border-top: 1px solid var(--line);
  padding-top: 16px;
}
.fd-chunks {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.fd-chunk {
  padding: 11px 14px;
  border-left: 3px solid var(--line);
  background: var(--bg);
  border-radius: 0 var(--r-sm) var(--r-sm) 0;
}
.fd-chunk-head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: var(--ink-3);
  margin-bottom: 6px;
}
.fd-chunk-idx {
  font-family: var(--font-mono);
  color: var(--ink-2);
}
.fd-chunk-prose {
  font: 400 13px/1.6 var(--font-sans);
  color: var(--ink);
  overflow-wrap: anywhere;
}

/* ── Footer ── */
.fd-foot {
  display: flex;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid var(--line);
  flex-shrink: 0;
}
.fd-btn-secondary,
.fd-btn-danger {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 12px;
  border-radius: var(--r-sm);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
}
.fd-btn-secondary {
  background: var(--surface);
  color: var(--ink-2);
  border: 1px solid var(--line-2);
}
.fd-btn-danger {
  background: var(--surface);
  color: var(--err);
  border: 1px solid var(--err-border);
}
</style>
