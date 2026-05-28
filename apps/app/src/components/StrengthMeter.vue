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
</script>

<template>
  <div v-if="password" class="strength-meter" aria-live="polite">
    <div class="strength-meter__track">
      <div class="strength-meter__bar" :data-score="strength.score"></div>
    </div>
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

.strength-meter__track {
  height: 3px;
  background: var(--line);
  border-radius: 999px;
  overflow: hidden;
}

.strength-meter__bar {
  height: 100%;
  border-radius: 999px;
  width: 0%;
  transition:
    width var(--dur) var(--ease),
    background var(--dur) var(--ease);
}

.strength-meter__bar[data-score="1"] {
  background: var(--err);
  width: 18%;
}

.strength-meter__bar[data-score="2"] {
  background: var(--amber);
  width: 42%;
}

.strength-meter__bar[data-score="3"] {
  background: var(--warn);
  width: 68%;
}

.strength-meter__bar[data-score="4"] {
  background: var(--ok);
  width: 100%;
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
