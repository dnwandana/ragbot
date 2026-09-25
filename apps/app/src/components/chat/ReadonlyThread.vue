<script setup>
import { computed, onMounted } from "vue"
import MarkdownRenderer from "./MarkdownRenderer.vue"
import MessageBubble from "./MessageBubble.vue"
import ChartCard from "./ChartCard.vue"

const props = defineProps({
  /** Snapshot from GET /api/share/:id or buildClientSnapshot */
  snapshot: { type: Object, required: true },
})
const emit = defineEmits(["ready"])

const chartTotal = computed(() =>
  props.snapshot.messages.reduce((sum, m) => sum + (m.charts?.length || 0), 0),
)
let chartsReady = 0
let done = false

/** Emits `ready` once, after the last chart is built. */
const onChartReady = () => {
  chartsReady += 1
  if (!done && chartsReady >= chartTotal.value) {
    done = true
    emit("ready")
  }
}

onMounted(() => {
  if (chartTotal.value === 0) {
    done = true
    emit("ready")
  }
})

/** Formats the time of a message. The date sits in the page header. */
const timeOf = (m) =>
  new Date(m.created_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
</script>

<template>
  <div class="ro-thread">
    <article
      v-for="m in snapshot.messages"
      :key="m.id"
      :data-message="m.id"
      class="ro-thread__message"
      :class="`ro-thread__message--${m.role}`"
    >
      <MessageBubble v-if="m.role === 'user'" role="user">{{ m.content }}</MessageBubble>
      <template v-else>
        <MessageBubble role="agent">
          <div class="ro-thread__answer">
            <!-- The page shows no source list, so a [n] marker would point at nothing. -->
            <MarkdownRenderer :text="m.content" :strip-citations="true" />
            <ChartCard
              v-for="(spec, i) in m.charts || []"
              :key="`${m.id}-${i}`"
              :spec="spec"
              @ready="onChartReady"
            />
          </div>
        </MessageBubble>
        <p class="ro-thread__meta">
          <span class="ro-thread__role">RAGBot</span>
          <span>·</span>
          <span>{{ timeOf(m) }}</span>
        </p>
      </template>
    </article>
  </div>
</template>

<style scoped>
.ro-thread {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.ro-thread__message {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-start;
}
.ro-thread__message--user {
  align-items: flex-end;
}
.ro-thread__answer {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.ro-thread__meta {
  display: flex;
  align-items: center;
  gap: 6px;
  /* No negative pull here. The chat view pulls this row 4px left to balance its
     trailing copy button. This page has no button, so the row aligns with the bubble. */
  margin: 6px 0 0;
  font-size: 11.5px;
  font-family: var(--font-mono);
  color: var(--ink-4);
}
.ro-thread__role {
  font-weight: 600;
  color: var(--ink-3);
}
</style>
