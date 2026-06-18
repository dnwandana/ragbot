<script setup>
import { Plus, Search, SlidersHorizontal, ChevronDown } from "lucide-vue-next"
</script>

<template>
  <MockFrame
    label="ragbot — switch workspace"
    caption="Each workspace is a sealed room — its own documents, agents, and members."
  >
    <!-- Page head -->
    <div class="wm-page-head">
      <div>
        <div class="wm-page-title">Workspaces</div>
        <div class="wm-page-sub">
          Select a workspace to manage its datasets, agents, and members.
        </div>
      </div>
      <button class="wm-btn-primary">
        <Plus :size="11" :stroke-width="2.2" />
        New workspace
      </button>
    </div>

    <!-- Toolbar -->
    <div class="wm-toolbar">
      <div class="wm-search-wrap">
        <Search :size="13" :stroke-width="1.8" style="flex-shrink: 0; color: var(--ink-4)" />
        <span class="wm-search-input">Search workspaces…</span>
      </div>
      <span class="wm-toolbar-count">3 workspaces</span>
      <div style="flex: 1" />
      <div class="wm-sort-wrap">
        <button class="wm-sort-btn">
          <SlidersHorizontal :size="12" :stroke-width="1.8" />
          Name
          <ChevronDown :size="10" :stroke-width="2" />
        </button>
      </div>
    </div>

    <!-- Table -->
    <div class="wm-ws-table" role="table">
      <!-- Header -->
      <div class="wm-tbl-head wm-tbl-cols">
        <div>Name</div>
        <div>Your role</div>
        <div>Updated</div>
        <div></div>
      </div>

      <!-- Row: Acme Support -->
      <div class="wm-tbl-row wm-tbl-cols" role="row">
        <div>
          <div class="wm-tbl-name">Acme Support</div>
          <div class="wm-tbl-desc">Help docs and support playbooks for the Acme team</div>
        </div>
        <div>
          <span class="wm-badge wm-badge--accent">Owner</span>
        </div>
        <div class="wm-tbl-muted">2h ago</div>
        <div>
          <button class="wm-menu-btn" aria-label="More options">···</button>
        </div>
      </div>

      <!-- Row: Acme Engineering -->
      <div class="wm-tbl-row wm-tbl-cols" role="row">
        <div>
          <div class="wm-tbl-name">Acme Engineering</div>
          <div class="wm-tbl-desc">API references and on-call runbooks</div>
        </div>
        <div>
          <span class="wm-badge wm-badge--gray">Admin</span>
        </div>
        <div class="wm-tbl-muted">1d ago</div>
        <div>
          <button class="wm-menu-btn" aria-label="More options">···</button>
        </div>
      </div>

      <!-- Row: Personal -->
      <div class="wm-tbl-row wm-tbl-cols" role="row">
        <div>
          <div class="wm-tbl-name">Personal</div>
          <div class="wm-tbl-desc wm-tbl-desc--empty">No description</div>
        </div>
        <div>
          <span class="wm-badge wm-badge--accent">Owner</span>
        </div>
        <div class="wm-tbl-muted">3d ago</div>
        <div>
          <button class="wm-menu-btn" aria-label="More options">···</button>
        </div>
      </div>
    </div>
  </MockFrame>
</template>

<style scoped>
/*
 * Class naming scheme: all classes prefixed with `wm-` (workspace-mock) to
 * avoid collision with docs globals in components.css.
 * Globals that share names: .badge (none in components.css but guarded anyway),
 * .chip, .pill, .card — all avoided by using wm- prefix throughout.
 * Dark mode: real app uses [data-theme="dark"]; VitePress uses .dark → rewritten below.
 */

/* ── Page head ── */
.wm-page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 14px;
  gap: 12px;
  flex-wrap: wrap;
}
.wm-page-title {
  font-size: var(--t-lg);
  font-weight: 600;
  letter-spacing: -0.015em;
  color: var(--ink);
}
.wm-page-sub {
  font-size: var(--t-sm);
  color: var(--ink-3);
  margin-top: 2px;
}
.wm-btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  background: var(--brand);
  color: #fff;
  border: none;
  border-radius: var(--r-sm);
  font-size: 12.5px;
  font-weight: 600;
  cursor: default;
}

/* ── Toolbar ── */
.wm-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.wm-search-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 180px;
  max-width: 300px;
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  padding: 5px 10px;
  background: var(--surface);
}
.wm-search-input {
  flex: 1;
  font-size: 12.5px;
  color: var(--ink-4);
  min-width: 0;
}
.wm-toolbar-count {
  font-size: 12px;
  color: var(--ink-4);
  white-space: nowrap;
}
.wm-sort-wrap {
  position: relative;
}
.wm-sort-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border: 1px solid var(--line-2);
  border-radius: var(--r-sm);
  background: var(--surface);
  font-size: 12px;
  color: var(--ink-2);
  cursor: default;
  white-space: nowrap;
}

/* ── Table ── */
.wm-ws-table {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
}
.wm-tbl-cols {
  display: grid;
  grid-template-columns: 1fr 130px 140px 44px;
  gap: 12px;
  align-items: center;
}
/* Let the 1fr name column shrink below its content so a long description
   ellipsis-truncates instead of widening the track and misaligning the row. */
.wm-tbl-cols > * {
  min-width: 0;
}
.wm-tbl-head {
  padding: 10px 18px;
  background: var(--bg);
  border-bottom: 1px solid var(--line);
  font-size: 10.5px;
  font-weight: 600;
  color: var(--ink-3);
  text-transform: uppercase;
  letter-spacing: 0.07em;
  border-radius: var(--r-lg) var(--r-lg) 0 0;
}
.wm-tbl-row {
  padding: 11px 18px;
  border-top: 1px solid var(--line);
  cursor: default;
}
.wm-tbl-row:last-child {
  border-radius: 0 0 var(--r-lg) var(--r-lg);
}
.wm-tbl-name {
  font-size: 13.5px;
  font-weight: 500;
  color: var(--ink);
}
.wm-tbl-desc {
  font-size: 12px;
  color: var(--ink-4);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.wm-tbl-desc--empty {
  font-style: italic;
  opacity: 0.7;
}
.wm-tbl-muted {
  font-size: 12.5px;
  color: var(--ink-4);
}

/* ── Badge ── */
.wm-badge {
  display: inline-block;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 9px;
  border-radius: 20px;
}
.wm-badge--accent {
  background: var(--color-accent-light);
  color: var(--brand);
  border: 1px solid var(--color-accent-border);
}
.wm-badge--gray {
  background: #f3f4f6;
  color: var(--color-text-secondary);
}
/* Dark: gray badge needs a visible background */
.dark .wm-badge--gray {
  background: var(--bg-2);
  color: var(--ink-3);
}

/* ── Menu button (ellipsis) ── */
.wm-menu-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: var(--r-sm);
  color: var(--ink-4);
  font-size: 16px;
  font-weight: 700;
  cursor: default;
  line-height: 1;
}
</style>
