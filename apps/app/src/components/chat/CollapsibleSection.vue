<script setup>
import { computed, ref } from "vue"
import { ChevronRight } from "lucide-vue-next"

const props = defineProps({
  /** Row label, shown in uppercase mono ("Input", "Output") */
  label: { type: String, required: true },
  /** Chip text at the end of the row ("5 lines", "KeyError") */
  count: { type: String, default: "" },
  /** "error" tints the label and the chip red */
  variant: { type: String, default: "default" },
  /** A run in progress: the row shows a caret and cannot be opened */
  live: { type: Boolean, default: false },
})

const open = ref(false)

const isError = computed(() => props.variant === "error")

/** Open a shut section, or shut an open one. A live row never opens. */
const toggle = () => {
  if (props.live) return
  open.value = !open.value
}
</script>

<template>
  <div class="collapsible-section">
    <button
      type="button"
      class="collapsible-section__row"
      :class="{ 'collapsible-section__row--live': live }"
      :disabled="live"
      :aria-expanded="open"
      @click="toggle"
    >
      <span class="collapsible-section__chevron" :class="{ 'is-open': open }">
        <ChevronRight :size="12" />
      </span>
      <span class="collapsible-section__label" :class="{ 'is-error': isError }">{{ label }}</span>
      <span v-if="live" class="collapsible-section__live">
        executing<span class="collapsible-section__caret" />
      </span>
      <span v-else-if="count" class="collapsible-section__count" :class="{ 'is-error': isError }">
        {{ count }}
      </span>
    </button>
    <div v-if="open" class="collapsible-section__body">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.collapsible-section__row {
  display: flex;
  align-items: center;
  gap: 7px;
  width: 100%;
  padding: 6px 6px 6px 0;
  border: none;
  border-radius: var(--r-sm);
  background: none;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.collapsible-section__row:hover:not(:disabled) {
  background: var(--bg-2);
}

.collapsible-section__row--live {
  cursor: default;
}

.collapsible-section__chevron {
  display: flex;
  flex-shrink: 0;
  color: var(--ink-4);
  transition: transform var(--dur) var(--ease);
}

.collapsible-section__chevron.is-open {
  transform: rotate(90deg);
}

.collapsible-section__label {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink-4);
}

.collapsible-section__row:hover:not(:disabled) .collapsible-section__label {
  color: var(--ink-2);
}

.collapsible-section__label.is-error {
  color: var(--err-2);
}

.collapsible-section__count {
  padding: 0 5px;
  border: 1px solid var(--line);
  border-radius: 4px;
  background: var(--bg-2);
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--ink-4);
}

.collapsible-section__row:hover:not(:disabled) .collapsible-section__count {
  background: var(--surface);
}

.collapsible-section__count.is-error {
  border-color: var(--err-border);
  background: var(--err-bg);
  color: var(--err-2);
}

.collapsible-section__live {
  font-family: var(--font-mono);
  font-size: var(--t-xs);
  color: var(--ink-3);
}

.collapsible-section__caret {
  display: inline-block;
  width: 7px;
  height: 13px;
  background: var(--brand);
  vertical-align: -2px;
  animation: collapsible-section-blink 1s steps(2, start) infinite;
}

@keyframes collapsible-section-blink {
  0%,
  49% {
    opacity: 1;
  }

  50%,
  100% {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .collapsible-section__caret {
    animation: none;
  }

  .collapsible-section__chevron {
    transition: none;
  }
}
</style>
