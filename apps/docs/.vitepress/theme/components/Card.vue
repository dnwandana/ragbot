<script setup>
import { Layers, Database, Bot, MessageCircle, ArrowRight } from "lucide-vue-next"

const icons = { layers: Layers, database: Database, bot: Bot, chat: MessageCircle }

defineProps({
  to: { type: String, required: true },
  icon: { type: String, default: "layers" },
  title: { type: String, required: true },
  desc: { type: String, default: "" },
})
</script>

<template>
  <a class="card" :href="to">
    <div class="card__icon"><component :is="icons[icon]" :size="20" /></div>
    <div class="card__title">
      {{ title }}<span class="arr"><ArrowRight :size="15" /></span>
    </div>
    <p class="card__desc">{{ desc }}</p>
  </a>
</template>
