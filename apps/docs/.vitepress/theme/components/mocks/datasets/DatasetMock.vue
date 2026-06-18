<script setup>
import { ChevronLeft, MessageSquare, Plus, Search, Ellipsis } from "lucide-vue-next"

const files = [
  {
    name: "employee-handbook-2024.pdf",
    type: "pdf",
    size: "2.1 MB",
    chunks: "142",
    status: "ok",
    label: "Indexed",
    added: "Jun 10",
  },
  {
    name: "returns-policy.docx",
    type: "docx",
    size: "320 KB",
    chunks: "28",
    status: "ok",
    label: "Indexed",
    added: "Jun 10",
  },
  {
    name: "benefits-overview.pdf",
    type: "pdf",
    size: "1.4 MB",
    chunks: "—",
    status: "proc",
    label: "Parsing",
    added: "Jun 12",
  },
  {
    name: "org-chart.png",
    type: "file",
    size: "280 KB",
    chunks: "—",
    status: "err",
    label: "Failed",
    added: "Jun 12",
  },
]
</script>

<template>
  <MockFrame
    label="ragbot — datasets / Company handbook"
    caption="Documents are ready to use the moment processing finishes."
  >
    <div class="ds-page">
      <!-- Page header -->
      <div class="ds-head">
        <div class="ds-head-left">
          <button class="ds-back" aria-label="Back to datasets">
            <ChevronLeft :size="14" :stroke-width="1.8" />
          </button>
          <div>
            <div class="ds-title">Company handbook</div>
            <div class="ds-stats">
              <span><strong>12</strong> files</span>
              <span class="ds-sep">·</span>
              <span class="ds-mono"><strong>4.2</strong> MB</span>
            </div>
          </div>
        </div>
        <div class="ds-head-right">
          <button class="ds-btn-icon" aria-label="Dataset options">
            <Ellipsis :size="16" />
          </button>
          <button class="ds-btn-brand">
            <MessageSquare :size="13" :stroke-width="2" />
            Start chat
          </button>
          <button class="ds-btn-primary">
            <Plus :size="16" />
            Add source
          </button>
        </div>
      </div>

      <!-- Toolbar -->
      <div class="ds-toolbar">
        <div class="ds-search">
          <Search :size="13" :stroke-width="1.7" style="color: var(--ink-3)" />
          <span class="ds-search-ph">Search files in this dataset…</span>
        </div>
        <div class="ds-filters">
          <span class="ds-chip-filter ds-chip-filter--active">All</span>
          <span class="ds-chip-filter">Indexed</span>
          <span class="ds-chip-filter">Parsing</span>
          <span class="ds-chip-filter">Failed</span>
        </div>
        <span class="ds-count">4 files</span>
      </div>

      <!-- File table -->
      <div class="ds-file-table">
        <!-- Header row -->
        <div class="ds-file-cols ds-file-thead">
          <div></div>
          <div>Type</div>
          <div>Name</div>
          <div class="ds-col-right">Size</div>
          <div>Chunks</div>
          <div>Status</div>
          <div>Added</div>
          <div></div>
        </div>

        <!-- File rows -->
        <div v-for="file in files" :key="file.name" class="ds-file-cols ds-file-row">
          <div>
            <span class="ds-cb" />
          </div>
          <div>
            <span class="ds-type-badge" :class="`ds-type-${file.type}`">{{ file.type }}</span>
          </div>
          <div class="ds-col-name">
            <span class="ds-file-name">{{ file.name }}</span>
          </div>
          <div class="ds-col-right ds-mono">{{ file.size }}</div>
          <div
            class="ds-mono"
            :style="{ color: file.chunks !== '—' ? 'var(--ink-2)' : 'var(--ink-4)' }"
          >
            {{ file.chunks }}
          </div>
          <div>
            <span class="file-status" :class="`file-status--${file.status}`">
              <span
                class="file-status__dot"
                :class="{ 'file-status__dot--pulse': file.status === 'proc' }"
              />
              {{ file.label }}
            </span>
          </div>
          <div class="ds-muted">{{ file.added }}</div>
          <div>
            <span class="ds-row-menu">⋯</span>
          </div>
        </div>
      </div>
    </div>
  </MockFrame>
</template>

<style scoped>
/* ── Page layout ── */
.ds-page {
  padding: 16px 18px;
}

/* ── Header ── */
.ds-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 14px;
  gap: 12px;
  flex-wrap: wrap;
}

.ds-head-left {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.ds-back {
  width: 26px;
  height: 26px;
  margin-top: 2px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--ink-3);
  border-radius: 5px;
  cursor: default;
}

.ds-title {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.015em;
  color: var(--ink);
  line-height: 1.25;
}

.ds-stats {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 5px;
  font-size: 11.5px;
  color: var(--ink-3);
}

.ds-stats strong {
  color: var(--ink-2);
  font-weight: 600;
}

.ds-sep {
  color: var(--ink-4);
}

.ds-mono {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--ink-2);
}

.ds-head-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.ds-btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 11px;
  background: var(--brand);
  color: #fff;
  border: none;
  border-radius: 5px;
  font-size: 12px;
  font-weight: 600;
  cursor: default;
}

.ds-btn-brand {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 11px;
  background: var(--brand-tint);
  color: var(--brand-3);
  border: 1px solid rgba(255, 107, 53, 0.25);
  border-radius: 5px;
  font-size: 12px;
  font-weight: 600;
  cursor: default;
}

.ds-btn-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 5px 7px;
  background: var(--surface);
  color: var(--ink-2);
  border: 1px solid var(--line-2);
  border-radius: 5px;
  cursor: default;
}

/* ── Toolbar ── */
.ds-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.ds-search {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 9px;
  background: var(--surface);
  border: 1px solid var(--line-2);
  border-radius: 5px;
  flex: 1;
  min-width: 160px;
  max-width: 280px;
}

.ds-search-ph {
  font-size: 12px;
  color: var(--ink-4);
}

.ds-filters {
  display: inline-flex;
  gap: 3px;
}

.ds-chip-filter {
  padding: 4px 9px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 500;
  border: 1px solid var(--line-2);
  background: var(--surface);
  color: var(--ink-2);
  white-space: nowrap;
}

.ds-chip-filter--active {
  background: var(--ink);
  color: var(--bg);
  border-color: var(--ink);
}

.ds-count {
  font-size: 12px;
  color: var(--ink-3);
  margin-left: auto;
  white-space: nowrap;
}

/* ── File table ── */
.ds-file-table {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 10px;
  overflow: hidden;
}

.ds-file-cols {
  display: grid;
  grid-template-columns: 26px 46px minmax(0, 1fr) 60px 58px 96px 80px 28px;
  gap: 8px;
  align-items: center;
}

.ds-file-thead {
  padding: 8px 14px;
  background: var(--bg);
  border-bottom: 1px solid var(--line);
  font-size: 10px;
  font-weight: 600;
  color: var(--ink-3);
  text-transform: uppercase;
  letter-spacing: 0.07em;
}

.ds-file-row {
  padding: 9px 14px;
  border-top: 1px solid var(--line);
}

/* Fake checkbox */
.ds-cb {
  display: inline-block;
  width: 13px;
  height: 13px;
  border: 1.5px solid var(--line-2);
  border-radius: 3px;
  background: var(--surface);
}

/* Type badge */
.ds-type-badge {
  display: inline-flex;
  padding: 2px 5px;
  border-radius: 4px;
  font-size: 9.5px;
  font-weight: 600;
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border: 1px solid;
}

.ds-type-pdf {
  background: var(--err-bg);
  color: var(--err);
  border-color: var(--err-border);
}

.ds-type-docx {
  background: #f0f4ff;
  color: #1d4ed8;
  border-color: rgba(29, 78, 216, 0.2);
}

.dark .ds-type-docx {
  background: rgba(29, 78, 216, 0.12);
  color: #7ba7ff;
  border-color: rgba(29, 78, 216, 0.3);
}

.ds-type-file {
  background: var(--bg-2);
  color: var(--ink-3);
  border-color: var(--line-2);
}

.ds-col-name {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.ds-file-name {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ds-col-right {
  text-align: right;
}

.ds-muted {
  font-size: 11.5px;
  color: var(--ink-3);
}

.ds-row-menu {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 700;
  color: var(--ink-4);
  opacity: 0.5;
}

/* ── Status pill — isolated scheme to avoid docs global .chip bleed ── */
/*
 * The docs global .chip sets radius 999px / padding 5px 9px but has no border
 * and no chip--brand or chip--err variants. Rather than patching globals,
 * we use an isolated .file-status scheme here with all three colors explicit.
 *
 * Colors:
 *   --ok:  Indexed  → var(--ok) / var(--ok-bg) / var(--ok-border)   — green tokens
 *   --proc: Parsing → var(--brand-2) / var(--brand-tint) / rgba(brand,0.2) — amber/brand
 *   --err:  Failed  → var(--err) / var(--err-bg) / var(--err-border)  — red tokens
 */
.file-status {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 8px;
  border-radius: 20px;
  font-size: 11.5px;
  font-weight: 500;
  border: 1px solid;
  white-space: nowrap;
}

.file-status--ok {
  background: var(--ok-bg);
  color: var(--ok);
  border-color: var(--ok-border);
}

.file-status--proc {
  background: var(--brand-tint);
  color: var(--brand-2);
  border-color: rgba(255, 107, 53, 0.2);
}

.file-status--err {
  background: var(--err-bg);
  color: var(--err);
  border-color: var(--err-border);
}

/* Status dot */
.file-status__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
}

/* Processing pulse animation — subtle, reduced-motion guarded */
@keyframes ds-status-pulse {
  0%,
  100% {
    opacity: 0.35;
    transform: scale(0.85);
  }

  50% {
    opacity: 1;
    transform: scale(1);
  }
}

.file-status__dot--pulse {
  animation: ds-status-pulse 1.4s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .file-status__dot--pulse {
    animation: none;
  }
}
</style>
