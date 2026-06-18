<script setup>
import { X } from "lucide-vue-next"

const groups = [
  {
    title: "employee-handbook-2024.pdf",
    citations: [
      {
        n: 1,
        relevanceLabel: "High",
        badgeClass: "chat-view__source-badge--high",
        cited_text:
          "Customers may request a full refund within 30 days of the original purchase date.",
      },
    ],
  },
  {
    title: "returns-policy.docx",
    citations: [
      {
        n: 2,
        relevanceLabel: "Med",
        badgeClass: "chat-view__source-badge--medium",
        cited_text: "All returned items must be unused and in their original packaging to qualify.",
      },
    ],
  },
]

const totalCitations = groups.reduce((sum, g) => sum + g.citations.length, 0)
</script>

<template>
  <MockFrame
    label="ragbot — sources"
    caption="Every cited passage, grouped by file with a relevance label and the exact quoted text."
  >
    <div class="chat-view__sources">
      <div class="chat-view__sources-header">
        <div>
          <span class="chat-view__sources-title">Sources</span>
          <span class="chat-view__sources-meta">
            · Response 1 · {{ totalCitations }}
            {{ totalCitations === 1 ? "citation" : "citations" }}
          </span>
        </div>
        <button class="chat-view__sources-close" aria-label="Close sources panel">
          <X :size="16" />
        </button>
      </div>
      <div class="chat-view__sources-list">
        <div v-for="group in groups" :key="group.title" class="chat-view__source-group">
          <div class="chat-view__source-group-header">
            <span class="chat-view__source-group-title">{{ group.title }}</span>
            <span class="chat-view__source-group-count">
              {{ group.citations.length }}
              {{ group.citations.length === 1 ? "excerpt" : "excerpts" }}
            </span>
          </div>
          <div v-for="citation in group.citations" :key="citation.n" class="chat-view__source-card">
            <div class="chat-view__source-meta">
              <span class="chat-view__source-badge" :class="citation.badgeClass">{{
                citation.relevanceLabel
              }}</span>
              <span class="chat-view__source-num">[{{ citation.n }}]</span>
            </div>
            <div class="chat-view__source-excerpt">{{ citation.cited_text }}</div>
          </div>
        </div>
      </div>
    </div>
  </MockFrame>
</template>

<style scoped>
/* ── Sources panel ── */
.chat-view__sources {
  display: flex;
  flex-direction: column;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r);
  overflow: hidden;
}

.chat-view__sources-header {
  padding: 12px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--line);
}

.chat-view__sources-title {
  font-weight: 600;
  font-size: var(--t-base);
  color: var(--ink);
}

.chat-view__sources-meta {
  font-size: var(--t-sm);
  color: var(--ink-3);
  margin-left: 2px;
}

.chat-view__sources-close {
  background: transparent;
  border: none;
  color: var(--ink-3);
  cursor: pointer;
  font-size: 16px;
  display: flex;
}

.chat-view__sources-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.chat-view__source-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.chat-view__source-group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 2px;
}

.chat-view__source-group-title {
  font-weight: 600;
  font-size: 12px;
  color: var(--ink);
}

.chat-view__source-group-count {
  font-size: 11px;
  color: var(--ink-3);
}

.chat-view__source-card {
  padding: 8px;
  border-radius: var(--r-sm);
  border: 1px solid var(--line);
  background: var(--surface);
}

.chat-view__source-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 3px;
}

.chat-view__source-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 1px 5px;
  border-radius: 3px;
}

.chat-view__source-badge--high {
  color: var(--ok);
  background: var(--ok-bg);
}

.chat-view__source-badge--medium {
  color: var(--brand);
  background: var(--brand-tint);
}

.chat-view__source-badge--low {
  color: var(--ink-3);
  background: var(--bg-2);
}

.chat-view__source-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 3px;
  border-radius: 3px;
  background: var(--brand-tint);
  color: var(--brand-3);
  font: 600 10.5px var(--font-mono);
  flex-shrink: 0;
  margin-right: 4px;
}

.chat-view__source-excerpt {
  font-size: 11px;
  color: var(--ink-3);
  margin-top: 4px;
  line-height: 1.5;
}
</style>
