<script setup>
import { computed } from "vue"
import { Layers, Database, Bot, MessageCircle, Zap, User, ArrowRight } from "lucide-vue-next"

const icons = {
  layers: Layers,
  database: Database,
  bot: Bot,
  chat: MessageCircle,
  bolt: Zap,
  user: User,
  message: MessageCircle,
}

const props = defineProps({
  to: { type: String, required: true },
  icon: { type: String, default: "layers" },
  title: { type: String, required: true },
  desc: { type: String, default: "" },
})

const resolvedIcon = computed(() => {
  const component = icons[props.icon]
  if (!component && import.meta.env.DEV) {
    console.warn(
      `[Card] Unknown icon "${props.icon}" — falling back to "layers". Add it to the icon map in Card.vue.`,
    )
  }
  return component || Layers
})
</script>

<template>
  <a class="card" :href="to">
    <div class="card__icon"><component :is="resolvedIcon" :size="20" /></div>
    <div class="card__title">
      {{ title }}<span class="arr"><ArrowRight :size="15" /></span>
    </div>
    <p class="card__desc">{{ desc }}</p>
  </a>
</template>
