<script setup>
import { LayoutGrid, List, Search, SlidersHorizontal, ChevronDown } from "lucide-vue-next"

const datasets = [
  {
    name: "Company handbook",
    desc: "HR policies, benefits, and onboarding docs",
    files: 12,
    created: "Jan 3, 2026",
    updated: "2 days ago",
  },
  {
    name: "Support macros",
    desc: "Canned responses and troubleshooting guides",
    files: 8,
    created: "Feb 11, 2026",
    updated: "5 hours ago",
  },
  {
    name: "Product specs",
    desc: "Release notes and technical specifications",
    files: 23,
    created: "Mar 20, 2026",
    updated: "1 week ago",
  },
]
</script>

<template>
  <MockFrame
    label="ragbot — datasets"
    caption="The Datasets area. Each card shows what's inside and how many files it holds."
  >
    <!-- Toolbar -->
    <div class="dsl-toolbar">
      <div class="dsl-search">
        <Search :size="13" :stroke-width="1.8" class="dsl-search__icon" />
        <span class="dsl-search__ph">Search datasets…</span>
      </div>
      <span class="dsl-count">3 datasets</span>
      <div style="flex: 1" />
      <button class="dsl-sort-btn">
        <SlidersHorizontal :size="12" :stroke-width="1.8" />
        Name A–Z
        <ChevronDown :size="10" :stroke-width="2" />
      </button>
      <div class="dsl-view-toggle">
        <button class="dsl-view-btn dsl-view-btn--active">
          <LayoutGrid :size="12" :stroke-width="1.8" />
          Cards
        </button>
        <button class="dsl-view-btn">
          <List :size="12" :stroke-width="1.8" />
          Table
        </button>
      </div>
    </div>

    <!-- Cards grid -->
    <div class="dsl-grid">
      <div v-for="ds in datasets" :key="ds.name" class="dsl-card">
        <div class="dsl-card__body">
          <div class="dsl-card__top">
            <div class="dsl-card__name">{{ ds.name }}</div>
            <button class="dsl-menu-btn" aria-label="More options">···</button>
          </div>
          <p class="dsl-card__desc">{{ ds.desc }}</p>
          <div class="dsl-card__stats">
            <span
              ><strong>{{ ds.files }}</strong> files</span
            >
          </div>
        </div>
        <div class="dsl-card__foot">
          <span class="dsl-foot-text">Created {{ ds.created }}</span>
          <span class="dsl-foot-text">Updated {{ ds.updated }}</span>
        </div>
      </div>
    </div>
  </MockFrame>
</template>

<style scoped>
/* Toolbar */
.dsl-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}

.dsl-search {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 140px;
  max-width: 260px;
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  padding: 5px 10px;
  background: var(--surface);
}

.dsl-search__icon {
  flex-shrink: 0;
  color: var(--ink-4);
}

.dsl-search__ph {
  font-size: 12.5px;
  color: var(--ink-4);
}

.dsl-count {
  font-size: 12px;
  color: var(--ink-4);
  white-space: nowrap;
}

.dsl-sort-btn {
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

.dsl-view-toggle {
  display: flex;
  border: 1px solid var(--line-2);
  border-radius: var(--r-sm);
  overflow: hidden;
}

.dsl-view-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border: none;
  background: transparent;
  color: var(--ink-3);
  font-size: 12px;
  cursor: default;
}

.dsl-view-btn--active {
  background: var(--bg-2);
  color: var(--ink);
}

/* Cards grid */
.dsl-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 14px;
}

.dsl-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-1);
  display: flex;
  flex-direction: column;
}

.dsl-card__body {
  padding: 16px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.dsl-card__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.dsl-card__name {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
  line-height: 1.3;
}

.dsl-menu-btn {
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
  flex-shrink: 0;
}

.dsl-card__desc {
  font-size: 12.5px;
  color: var(--ink-3);
  line-height: 1.5;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.dsl-card__stats {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--ink-3);
  margin-top: 4px;
}

.dsl-card__stats strong {
  color: var(--ink-2);
  font-weight: 600;
}

.dsl-card__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 14px;
  border-top: 1px solid var(--line);
}

.dsl-foot-text {
  font-size: 11.5px;
  color: var(--ink-4);
}
</style>
