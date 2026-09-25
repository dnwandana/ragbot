<script setup>
defineProps({
  /** "user" or "agent". Picks the bubble shape. */
  role: { type: String, required: true, validator: (v) => ["user", "agent"].includes(v) },
})
</script>

<template>
  <div class="message-bubble" :class="`message-bubble--${role}`">
    <slot />
  </div>
</template>

<style scoped>
.message-bubble--user {
  max-width: 560px;
  padding: 10px 14px;
  border-radius: var(--r-lg);
  font-size: var(--t-md);
  line-height: 1.55;
  color: var(--ink);
  background: var(--brand-tint);
  border: 1px solid rgba(255, 107, 53, 0.18);
  white-space: pre-wrap;
}

.message-bubble--agent {
  width: 100%;
  padding: 14px 18px;
  border-radius: var(--r-lg);
  background: var(--surface);
  border: 1px solid var(--line);
}
</style>
