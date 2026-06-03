<script setup>
import { Check } from "lucide-vue-next"

const workspaces = [
  { n: "Acme Support", s: "3 datasets · 2 agents · you're an Admin", active: true },
  { n: "Product Research", s: "1 dataset · 1 agent · you're a Member", active: false },
  { n: "Personal", s: "2 datasets · 4 agents · you're the Owner", active: false },
]
</script>

<template>
  <MockFrame
    label="ragbot — switch workspace"
    caption="Each workspace is a sealed room — its own documents, agents, and members."
  >
    <div class="filelist">
      <div
        v-for="w in workspaces"
        :key="w.n"
        class="filerow"
        :style="w.active ? { borderColor: 'var(--brand)', background: 'var(--brand-tint)' } : null"
      >
        <div
          class="filerow__ic"
          style="
            background: var(--ink);
            color: var(--brand);
            font-family: var(--font-mono);
            font-weight: 700;
          "
        >
          {{ w.n[0] }}
        </div>
        <div class="filerow__meta">
          <div class="filerow__name" style="font-family: var(--font-sans); font-weight: 600">
            {{ w.n }}
          </div>
          <div class="filerow__sub">{{ w.s }}</div>
        </div>
        <span v-if="w.active" class="chip chip--ok"><Check :size="12" /> Current</span>
        <span v-else class="pill" style="cursor: pointer">Switch</span>
      </div>
    </div>
  </MockFrame>
</template>
