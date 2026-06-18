<script setup>
import { MoreHorizontal } from "lucide-vue-next"
</script>

<template>
  <MockFrame
    label="ragbot — agents / Support agent"
    caption="Everything an agent needs: a model, a persona, and the datasets it can read."
  >
    <div class="agent-grid">
      <div class="agent-card">
        <div class="card-top">
          <div class="card-name-row">
            <span class="card-name">Support agent</span>
            <span class="agent-chip agent-chip--ghost">GPT-5.4 Mini</span>
          </div>
          <button class="menu-btn" aria-label="More options">
            <MoreHorizontal :size="14" :stroke-width="1.8" />
          </button>
        </div>
        <p class="card-desc card-desc--prompt">
          You are a friendly support assistant. Answer only from the connected handbook and policy
          documents…
        </p>
        <div class="card-foot">
          <span class="foot-text">Created Jun 1, 2026</span>
          <span class="foot-text">Updated 2 days ago</span>
        </div>
      </div>
    </div>
  </MockFrame>
</template>

<style scoped>
.agent-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(272px, 1fr));
  gap: 14px;
}

.agent-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-1);
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
}

.card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.card-name-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.card-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
}

.agent-chip {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 500;
}

.agent-chip--ghost {
  background: var(--bg-2);
  color: var(--ink-4);
  border: 1px solid var(--line);
  font-family: var(--font-mono);
  font-size: 10.5px;
}

.menu-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: var(--r-sm);
  color: var(--ink-4);
  cursor: default;
  line-height: 1;
  flex: none;
}

.card-desc {
  font-size: 12.5px;
  color: var(--ink-3);
  line-height: 1.5;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex: 1;
}

.card-desc--prompt {
  color: var(--ink-4);
  font-style: italic;
}

.card-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 8px;
  border-top: 1px solid var(--line);
}

.foot-text {
  font-size: 11.5px;
  color: var(--ink-4);
}
</style>
