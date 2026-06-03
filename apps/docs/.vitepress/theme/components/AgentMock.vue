<script setup>
import { Cpu, ChevronDown, Database } from "lucide-vue-next"
</script>

<template>
  <MockFrame
    label="ragbot — agents / Support agent"
    caption="Everything an agent needs: a model, a persona, and the datasets it can read."
  >
    <div class="cfg">
      <div class="cfg__row">
        <div class="cfg__k">Name</div>
        <div class="cfg__v" style="font-weight: 600">Support agent</div>
      </div>
      <div class="cfg__row">
        <div class="cfg__k">Model</div>
        <div class="cfg__v">
          <span class="cfg__select">
            <Cpu :size="14" /> Balanced (gpt-4 class) <ChevronDown :size="14" />
          </span>
        </div>
      </div>
      <div class="cfg__row">
        <div class="cfg__k">Instructions</div>
        <div class="cfg__v">
          <div class="cfg__instr">
            You are a friendly support assistant. Answer only from the connected handbook and policy
            documents. If something isn't covered, say so and suggest who to contact.
          </div>
        </div>
      </div>
      <div class="cfg__row">
        <div class="cfg__k">Connected datasets</div>
        <div class="cfg__v">
          <div class="tagset">
            <span class="tag"><Database :size="12" />Company handbook</span>
            <span class="tag"><Database :size="12" />Support macros</span>
          </div>
        </div>
      </div>
      <div class="cfg__row">
        <div class="cfg__k">Cite sources</div>
        <div class="cfg__v" style="display: flex; align-items: center; gap: 10px">
          <span class="toggle" />
          <span style="font-size: var(--t-sm); color: var(--ink-3)"
            >On — answers show where they came from</span
          >
        </div>
      </div>
    </div>
  </MockFrame>
</template>
