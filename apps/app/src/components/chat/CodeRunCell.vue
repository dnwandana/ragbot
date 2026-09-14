<script setup>
import { computed, ref } from "vue"
import { Check, ChevronRight, Copy } from "lucide-vue-next"
import CollapsibleSection from "./CollapsibleSection.vue"

const props = defineProps({
  /** 1-based position of this cell in the run */
  index: { type: Number, required: true },
  /** Persisted thought payload (`title`, `code`, `file_ids`, `filenames`) */
  thought: { type: Object, required: true },
  /** Persisted observation payload, or null while the cell runs */
  observation: { type: Object, default: null },
})

const open = ref(false)
const copied = ref(false)
let copiedTimer = null

const running = computed(() => props.observation === null)
const failed = computed(() => props.observation?.error != null)

const code = computed(() => props.thought.code ?? "")

/** Older rows carry no title, so the cell number stands in for one. */
const title = computed(() => props.thought.title || `Cell ${props.index}`)

const stdout = computed(() => props.observation?.stdout ?? "")
const stderr = computed(() => props.observation?.stderr ?? "")

/** Counts the lines of a text block. An empty block has no lines. */
const countLines = (text) => (text.length === 0 ? 0 : text.replace(/\n$/, "").split("\n").length)

/** Renders a line count as a chip label. */
const lineLabel = (text) => {
  const lines = countLines(text)
  return lines === 1 ? "1 line" : `${lines} lines`
}

const inputCount = computed(() => lineLabel(code.value))

const outputText = computed(() => [stdout.value, stderr.value].filter(Boolean).join("\n"))

/** Keeps the error trace on its own line when stdout came first. */
const stderrPrefix = computed(() => (stdout.value ? "\n" : ""))

/**
 * Names the exception so the shut Output row already says what went wrong.
 * Falls back to the sandbox error code when the trace has no exception line.
 */
const errorLabel = computed(() => {
  const trace = stderr.value.trimEnd().split("\n")
  for (let i = trace.length - 1; i >= 0; i -= 1) {
    const match = /^([A-Za-z_][A-Za-z0-9_]*(?:Error|Exception|Exit|Interrupt))\b/.exec(
      trace[i].trim(),
    )
    if (match) return match[1]
  }
  return props.observation?.error ?? "failed"
})

const outputCount = computed(() => (failed.value ? errorLabel.value : lineLabel(outputText.value)))

/** Old rows carry no duration, so the cell shows nothing in its place. */
const elapsed = computed(() => {
  const ms = props.observation?.duration_ms
  return typeof ms === "number" ? `${(ms / 1000).toFixed(1)}s` : ""
})

const toggle = () => {
  open.value = !open.value
}

/** Copies the cell source. The button confirms for 1.5s, then resets. */
const copyCode = async () => {
  try {
    await navigator.clipboard.writeText(code.value)
  } catch {
    return
  }
  copied.value = true
  clearTimeout(copiedTimer)
  copiedTimer = setTimeout(() => {
    copied.value = false
  }, 1500)
}
</script>

<template>
  <div class="code-run-cell">
    <div
      class="code-run-cell__head"
      role="button"
      tabindex="0"
      :aria-expanded="open"
      @click="toggle"
      @keydown.enter.prevent="toggle"
      @keydown.space.prevent="toggle"
    >
      <span class="code-run-cell__chevron" :class="{ 'is-open': open }">
        <ChevronRight :size="13" />
      </span>
      <span class="code-run-cell__no" :class="{ 'is-error': failed }">In [{{ index }}]</span>
      <span class="code-run-cell__title">{{ title }}</span>
      <span v-if="running" class="code-run-cell__dot" />
      <span class="code-run-cell__gap" />
      <span v-if="failed" class="code-run-cell__meta code-run-cell__meta--error">failed</span>
      <span v-else-if="elapsed" class="code-run-cell__meta">{{ elapsed }}</span>
      <button
        type="button"
        class="code-run-cell__copy"
        :title="copied ? 'Copied' : 'Copy code'"
        @click.stop="copyCode"
        @keydown.stop
      >
        <Check v-if="copied" :size="12" />
        <Copy v-else :size="12" />
        {{ copied ? "Copied" : "Copy" }}
      </button>
    </div>

    <div v-if="open" class="code-run-cell__body">
      <CollapsibleSection label="Input" :count="inputCount">
        <pre class="code-run-cell__pre code-run-cell__pre--code">{{ code }}</pre>
      </CollapsibleSection>
      <CollapsibleSection
        label="Output"
        :count="running ? '' : outputCount"
        :variant="failed ? 'error' : 'default'"
        :live="running"
      >
        <pre
          class="code-run-cell__pre code-run-cell__pre--out"
        ><span v-if="stdout">{{ stdout }}</span><span v-if="stderr" class="code-run-cell__bad">{{ stderrPrefix }}{{ stderr }}</span><span v-if="!outputText">(no output)</span></pre>
      </CollapsibleSection>
    </div>
  </div>
</template>

<style scoped>
.code-run-cell + .code-run-cell {
  border-top: 1px solid var(--line);
}

.code-run-cell__head {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 9px 12px;
  cursor: pointer;
}

.code-run-cell__head:hover {
  background: var(--bg-2);
}

.code-run-cell__chevron {
  display: flex;
  flex-shrink: 0;
  color: var(--ink-4);
  transition: transform var(--dur) var(--ease);
}

.code-run-cell__chevron.is-open {
  transform: rotate(90deg);
}

.code-run-cell__no {
  font-family: var(--font-mono);
  font-size: var(--t-xs);
  font-weight: 600;
  color: var(--ink-3);
  white-space: nowrap;
}

.code-run-cell__no.is-error {
  color: var(--err-2);
}

.code-run-cell__title {
  overflow: hidden;
  font-size: var(--t-base);
  font-weight: 500;
  color: var(--ink);
  white-space: nowrap;
  text-overflow: ellipsis;
}

.code-run-cell__gap {
  flex: 1;
  min-width: 8px;
}

.code-run-cell__meta {
  font-family: var(--font-mono);
  font-size: var(--t-xs);
  color: var(--ink-4);
  white-space: nowrap;
}

.code-run-cell__meta--error {
  font-weight: 600;
  color: var(--err-2);
}

.code-run-cell__dot {
  width: 6px;
  height: 6px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--brand);
  animation: code-run-cell-pulse 1.2s ease-in-out infinite;
}

@keyframes code-run-cell-pulse {
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

.code-run-cell__copy {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
  padding: 3px 8px;
  border: none;
  border-radius: var(--r-sm);
  background: none;
  font-family: inherit;
  font-size: var(--t-xs);
  font-weight: 500;
  color: var(--ink-3);
  cursor: pointer;
}

.code-run-cell__copy:hover {
  background: var(--surface);
  color: var(--ink);
}

.code-run-cell__body {
  padding: 0 12px 12px;
}

.code-run-cell__pre {
  margin: 0;
  padding: 11px 13px;
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  background: var(--bg-2);
  overflow-x: auto;
  font-family: var(--font-mono);
  line-height: 1.62;
}

.code-run-cell__pre--code {
  font-size: 12.6px;
  color: var(--ink);
}

.code-run-cell__pre--out {
  font-size: 12.4px;
  line-height: 1.7;
  color: var(--ink-2);
  white-space: pre-wrap;
}

.code-run-cell__bad {
  color: var(--err-2);
}

@media (prefers-reduced-motion: reduce) {
  .code-run-cell__dot {
    animation: none;
  }

  .code-run-cell__chevron {
    transition: none;
  }
}
</style>
