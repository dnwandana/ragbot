<!-- apps/app/src/components/OtpInput.vue -->
<script setup>
import { ref, watch } from "vue"

const props = defineProps({
  length: { type: Number, default: 6 },
  modelValue: { type: String, default: "" },
})
const emit = defineEmits(["update:modelValue", "complete"])

const cells = ref(Array.from({ length: props.length }, () => ""))
const inputs = ref([])

watch(
  () => props.modelValue,
  (val) => {
    const chars = (val ?? "").split("").slice(0, props.length)
    cells.value = Array.from({ length: props.length }, (_, i) => chars[i] ?? "")
  },
)

/** Joins the cells and emits update + complete. */
function emitValue() {
  const joined = cells.value.join("")
  emit("update:modelValue", joined)
  if (joined.length === props.length) emit("complete", joined)
}

/**
 * Handles single-character entry, advancing focus.
 *
 * @param {number} index - Cell index.
 * @param {Event} event - Input event.
 */
function onInput(index, event) {
  const char = event.target.value.replace(/\D/g, "").slice(-1)
  cells.value[index] = char
  if (char && index < props.length - 1) inputs.value[index + 1]?.focus()
  emitValue()
}

/**
 * Moves focus back on backspace from an empty cell.
 *
 * @param {number} index - Cell index.
 * @param {KeyboardEvent} event - Keydown event.
 */
function onKeydown(index, event) {
  if (event.key === "Backspace" && !cells.value[index] && index > 0) {
    inputs.value[index - 1]?.focus()
  }
}

/**
 * Distributes a pasted numeric code across the cells.
 *
 * @param {ClipboardEvent} event - Paste event.
 */
function onPaste(event) {
  event.preventDefault()
  const text = (event.clipboardData?.getData("text") ?? "")
    .replace(/\D/g, "")
    .slice(0, props.length)
  if (!text) return
  cells.value = Array.from({ length: props.length }, (_, i) => text[i] ?? "")
  inputs.value[Math.min(text.length, props.length) - 1]?.focus()
  emitValue()
}
</script>

<template>
  <div class="otp-input">
    <input
      v-for="(cell, i) in cells"
      :key="i"
      ref="inputs"
      class="otp-cell"
      :class="{ 'is-filled': cell }"
      type="text"
      inputmode="numeric"
      maxlength="1"
      :value="cell"
      @input="onInput(i, $event)"
      @keydown="onKeydown(i, $event)"
      @paste="onPaste"
    />
  </div>
</template>

<style scoped>
.otp-input {
  display: flex;
  gap: 8px;
  justify-content: center;
}
.otp-cell {
  width: 42px;
  height: 50px;
  border: 1.5px solid var(--line-2);
  border-radius: var(--r-sm);
  font-family: var(--font-mono);
  font-size: 22px;
  font-weight: 600;
  text-align: center;
  background: var(--surface);
  color: var(--ink);
  transition: border-color var(--dur) var(--ease);
}
.otp-cell.is-filled {
  border-color: var(--brand);
}
.otp-cell:focus {
  border-color: var(--brand);
  box-shadow: 0 0 0 2px rgba(255, 107, 53, 0.22);
  outline: none;
}
</style>
