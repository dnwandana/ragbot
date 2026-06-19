<script setup>
import { computed } from "vue"

const props = defineProps({
  password: {
    type: String,
    default: "",
  },
})

/** Scores 1–4. Returns 0 when password is empty (component hides itself). */
const strength = computed(() => {
  const pw = props.password
  if (!pw) return { score: 0, label: "" }
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++
  if (/^(password|12345678|qwerty|letmein)/i.test(pw)) score = 1
  score = Math.max(1, Math.min(4, score))
  const labels = ["", "Weak", "Fair", "Good", "Strong"]
  return { score, label: labels[score] }
})

/** Percent width per score, matching the previous bar widths. */
const PERCENT = { 1: 18, 2: 42, 3: 68, 4: 100 }
/** Design-system token color per score (var() resolves at render). */
const COLOR = {
  1: "var(--err)",
  2: "var(--amber)",
  3: "var(--warn)",
  4: "var(--ok)",
}

const percent = computed(() => PERCENT[strength.value.score] ?? 0)
const strokeColor = computed(() => COLOR[strength.value.score] ?? "var(--line)")
</script>

<template>
  <div v-if="password" class="strength-meter" aria-live="polite">
    <a-progress
      class="strength-meter__bar"
      :percent="percent"
      :stroke-color="strokeColor"
      :show-info="false"
      :stroke-linecap="'round'"
      size="small"
    />
    <div class="strength-meter__label">
      <span>Password strength</span>
      <strong>{{ strength.label }}</strong>
    </div>
  </div>
</template>

<style scoped>
.strength-meter {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 4px;
  margin-bottom: 4px;
}
.strength-meter__bar :deep(.ant-progress-inner) {
  background: var(--line);
}
.strength-meter__bar :deep(.ant-progress-bg) {
  height: 3px !important;
  transition:
    width var(--dur) var(--ease),
    background var(--dur) var(--ease);
}
.strength-meter__label {
  display: flex;
  justify-content: space-between;
  font-size: var(--t-xs);
  color: var(--ink-3);
}
.strength-meter__label strong {
  color: var(--ink-2);
  font-weight: 500;
}
</style>
