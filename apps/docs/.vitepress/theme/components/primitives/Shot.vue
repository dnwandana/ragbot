<script setup>
defineProps({
  src: { type: String, required: true },
  alt: { type: String, default: "" },
  label: { type: String, default: "" },
  caption: { type: String, default: "" },
})
</script>

<template>
  <figure class="shot">
    <div class="shot__frame">
      <div class="shot__bar">
        <div class="shot__dots"><i /><i /><i /></div>
        <span v-if="label" class="shot__label">{{ label }}</span>
      </div>
      <a :href="src" target="_blank" rel="noopener" class="shot__link">
        <img :src="src" :alt="alt || caption || label" loading="lazy" />
      </a>
    </div>
    <figcaption v-if="caption" class="shot__caption">
      {{ caption }}
    </figcaption>
  </figure>
</template>

<style scoped>
.shot {
  margin: 1.75rem 0;
}
.shot__frame {
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  overflow: hidden;
  background: var(--vp-c-bg-soft);
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.04),
    0 8px 24px rgba(0, 0, 0, 0.06);
}
.shot__bar {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 0.8rem;
  background: var(--vp-c-bg-alt);
  border-bottom: 1px solid var(--vp-c-divider);
}
.shot__dots {
  display: inline-flex;
  gap: 0.35rem;
}
.shot__dots i {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--vp-c-gray-3, #cbd5e1);
}
.shot__label {
  font-size: 0.78rem;
  color: var(--vp-c-text-2);
}
.shot__link {
  display: block;
}
.shot__frame img {
  display: block;
  width: 100%;
  height: auto;
}
.shot__caption {
  margin-top: 0.6rem;
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
  text-align: center;
}
</style>
