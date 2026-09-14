<script setup>
import { computed, onUnmounted, ref, watch } from "vue"
import { Check, ChevronRight, CircleAlert, Terminal } from "lucide-vue-next"
import CodeRunCell from "./CodeRunCell.vue"

const props = defineProps({
  /** Code-run steps of one answer, in order: `{ thought, observation }[]` */
  steps: { type: Array, default: () => [] },
})

const open = ref(false)
const now = ref(Date.now())
const startedAt = ref(0)
let ticker = null

/** Position of the step that still runs, or -1 when every step has finished. */
const runningIndex = computed(() => props.steps.findIndex((step) => step.observation === null))

const running = computed(() => runningIndex.value !== -1)

const failed = computed(() => props.steps.some((step) => step.observation?.error != null))

const cellCount = computed(() =>
  props.steps.length === 1 ? "1 cell" : `${props.steps.length} cells`,
)

/** Data files the run read, listed once even when several cells share them. */
const fileLabel = computed(() => {
  const names = new Set()
  for (const step of props.steps) {
    for (const name of step.thought?.filenames ?? []) names.add(name)
  }
  return [...names].join(", ")
})

/** Wall time of the finished cells. Old rows carry no duration and count as 0. */
const finishedMs = computed(() =>
  props.steps.reduce((total, step) => total + (step.observation?.duration_ms ?? 0), 0),
)

const totalMs = computed(() =>
  running.value ? finishedMs.value + (now.value - startedAt.value) : finishedMs.value,
)

const elapsed = computed(() => `${(totalMs.value / 1000).toFixed(1)}s`)

/**
 * Header summary of the whole run: in progress, failed, or finished.
 * A finished run with no recorded duration says only "Done".
 */
const status = computed(() => {
  if (running.value) return { kind: "running", label: `Running ${elapsed.value}` }
  if (failed.value) return { kind: "error", label: "Failed" }
  return { kind: "ok", label: finishedMs.value > 0 ? `Done in ${elapsed.value}` : "Done" }
})

const stopTicker = () => {
  clearInterval(ticker)
  ticker = null
}

// The header counts up while a cell runs, so the clock only ticks then.
watch(
  runningIndex,
  (index) => {
    stopTicker()
    if (index === -1) return
    startedAt.value = Date.now()
    now.value = startedAt.value
    ticker = setInterval(() => {
      now.value = Date.now()
    }, 100)
  },
  { immediate: true },
)

onUnmounted(stopTicker)

const toggle = () => {
  open.value = !open.value
}
</script>

<template>
  <div v-if="steps.length" class="code-run-card" :class="{ 'is-error': failed }">
    <button
      type="button"
      class="code-run-card__head"
      :class="{ 'is-shut': !open }"
      :aria-expanded="open"
      @click="toggle"
    >
      <span class="code-run-card__glyph"><Terminal :size="13" /></span>
      <span class="code-run-card__name">Code interpreter</span>
      <span class="code-run-card__lang">python</span>
      <span class="code-run-card__gap" />
      <span v-if="fileLabel" class="code-run-card__meta">{{ fileLabel }}</span>
      <span class="code-run-card__meta">{{ cellCount }}</span>
      <span class="code-run-card__pill" :class="`is-${status.kind}`">
        <span v-if="status.kind === 'running'" class="code-run-card__dot" />
        <Check v-else-if="status.kind === 'ok'" :size="12" />
        <CircleAlert v-else :size="12" />
        {{ status.label }}
      </span>
      <span class="code-run-card__chevron" :class="{ 'is-open': open }">
        <ChevronRight :size="14" />
      </span>
    </button>

    <!-- Index key is safe: steps are append-only and never reordered. -->
    <div v-if="open">
      <CodeRunCell
        v-for="(step, i) in steps"
        :key="`cell-${i}`"
        :index="i + 1"
        :thought="step.thought"
        :observation="step.observation"
      />
    </div>
  </div>
</template>

<style scoped>
.code-run-card {
  border: 1px solid var(--line);
  border-radius: var(--r);
  background: var(--surface);
  overflow: hidden;
}

.code-run-card.is-error {
  border-color: var(--err-border);
}

.code-run-card__head {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  padding: 9px 10px 9px 12px;
  border: none;
  border-bottom: 1px solid var(--line);
  background: var(--bg-2);
  font-family: inherit;
  text-align: left;
  cursor: pointer;
}

.code-run-card__head.is-shut {
  border-bottom: none;
}

.code-run-card__glyph {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  border: 1px solid var(--line);
  border-radius: 5px;
  background: var(--surface);
  color: var(--ink-3);
}

.code-run-card__name {
  font-size: var(--t-base);
  font-weight: 600;
  color: var(--ink);
  white-space: nowrap;
}

.code-run-card__lang {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink-4);
}

.code-run-card__gap {
  flex: 1;
  min-width: 8px;
}

.code-run-card__meta {
  overflow: hidden;
  font-family: var(--font-mono);
  font-size: var(--t-xs);
  color: var(--ink-4);
  white-space: nowrap;
  text-overflow: ellipsis;
}

.code-run-card__pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
  padding: 2px 8px;
  border: 1px solid var(--line);
  border-radius: 5px;
  background: var(--bg);
  font-family: var(--font-mono);
  font-size: var(--t-xs);
  font-weight: 600;
  color: var(--ink-3);
  white-space: nowrap;
}

.code-run-card__pill.is-ok {
  border-color: var(--ok-border);
  background: var(--ok-bg);
  color: var(--ok);
}

.code-run-card__pill.is-error {
  border-color: var(--err-border);
  background: var(--err-bg);
  color: var(--err-2);
}

.code-run-card__dot {
  width: 6px;
  height: 6px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--brand);
  animation: code-run-card-pulse 1.2s ease-in-out infinite;
}

@keyframes code-run-card-pulse {
  0%,
  100% {
    opacity: 0.35;
    transform: scale(0.8);
  }

  50% {
    opacity: 1;
    transform: scale(1);
  }
}

.code-run-card__chevron {
  display: flex;
  flex-shrink: 0;
  color: var(--ink-4);
  transition: transform var(--dur) var(--ease);
}

.code-run-card__chevron.is-open {
  transform: rotate(90deg);
}

@media (prefers-reduced-motion: reduce) {
  .code-run-card__dot {
    animation: none;
  }

  .code-run-card__chevron {
    transition: none;
  }
}
</style>
