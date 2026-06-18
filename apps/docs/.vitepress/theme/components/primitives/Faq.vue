<script setup>
import { ref } from "vue"
import { ChevronRight } from "lucide-vue-next"

defineProps({ items: { type: Array, required: true } })
const open = ref(0)
function toggle(i) {
  open.value = open.value === i ? -1 : i
}
</script>

<template>
  <div class="faq">
    <div v-for="(it, i) in items" :key="i" class="faq__item" :class="{ open: open === i }">
      <button class="faq__q" :aria-expanded="open === i" @click="toggle(i)">
        {{ it.q }}
        <span class="qchev"><ChevronRight :size="18" /></span>
      </button>
      <div class="faq__a">
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div class="faq__a-inner" v-html="it.a" />
      </div>
    </div>
  </div>
</template>
