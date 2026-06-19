<script setup>
import { computed } from "vue"
import {
  CircleCheck,
  Check,
  LayoutGrid,
  UserPlus,
  Database,
  Bot,
  ArrowRight,
} from "lucide-vue-next"

const props = defineProps({
  ctx: { type: Object, required: true },
})

const fileCount = computed(
  () => props.ctx.formData.files.filter((f) => f.status === "ready" || f.status === "done").length,
)

const rows = computed(() => [
  {
    key: "workspace",
    icon: LayoutGrid,
    label: "Workspace created",
    value: props.ctx.formData.workspaceName,
    cta: "Open workspace",
    on: props.ctx.completed.has("workspace"),
  },
  {
    key: "invites",
    icon: UserPlus,
    label: props.ctx.completed.has("invites") ? "Team invited" : "Team",
    value: props.ctx.completed.has("invites")
      ? `${props.ctx.formData.invites.length} ${props.ctx.formData.invites.length === 1 ? "invite" : "invites"} sent`
      : "Skipped — invite later",
    cta: "View team",
    on: props.ctx.completed.has("invites"),
  },
  {
    key: "source",
    icon: Database,
    label: props.ctx.completed.has("source") ? "Dataset added" : "Knowledge source",
    value: props.ctx.completed.has("source")
      ? `${props.ctx.formData.datasetName} · ${fileCount.value} ${fileCount.value === 1 ? "source" : "sources"}`
      : "Skipped — add later",
    cta: "Open dataset",
    on: props.ctx.completed.has("source"),
  },
  {
    key: "agent",
    icon: Bot,
    label: props.ctx.completed.has("agent") ? "Agent ready" : "Agent",
    value: props.ctx.completed.has("agent")
      ? props.ctx.formData.agentName
      : "Skipped — create later",
    cta: "Open agent",
    on: props.ctx.completed.has("agent"),
  },
])
</script>

<template>
  <div class="ob-complete">
    <div class="ob-complete-top">
      <div class="ob-complete-badge">
        <CircleCheck :size="28" />
      </div>
      <h1 class="ob-title ob-title-lg">Setup complete</h1>
      <p class="ob-subtitle ob-subtitle-wide">
        Your workspace is ready to go. Jump into anything you created below.
      </p>
    </div>

    <div class="ob-result-list">
      <div v-for="row in rows" :key="row.key" class="ob-result" :class="{ 'is-skipped': !row.on }">
        <div class="ob-result-icon" :class="{ 'is-skipped': !row.on }">
          <Check v-if="row.on" :size="13" />
          <component :is="row.icon" v-else :size="13" />
        </div>
        <div class="ob-result-main">
          <span class="ob-result-label">{{ row.label }}</span>
          <span class="ob-result-value">{{ row.value }}</span>
        </div>
        <a-button
          v-if="row.on"
          class="ob-result-cta"
          size="small"
          @click="props.ctx.goToItem(row.key)"
        >
          {{ row.cta }} <ArrowRight :size="11" />
        </a-button>
      </div>
    </div>

    <div>
      <a-button
        type="primary"
        class="ob-btn ob-btn-primary ob-btn-lg ob-btn-full"
        @click="props.ctx.finish()"
      >
        Go to dashboard <ArrowRight :size="16" />
      </a-button>
    </div>
  </div>
</template>

<style scoped>
/* Primary action button — matches ob-btn-primary look without touching onboarding.css */
:deep(.ob-btn-primary.ant-btn) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  height: auto;
  padding: 11px 22px;
  border-radius: var(--r);
  font-size: var(--t-base);
  font-weight: 600;
  line-height: 1.4;
  background: var(--brand);
  border-color: var(--brand);
  color: #fff;
  box-shadow: none;
}

:deep(.ob-btn-primary.ant-btn:hover),
:deep(.ob-btn-primary.ant-btn:focus) {
  background: var(--brand-2);
  border-color: var(--brand-2);
  color: #fff;
}

/* Row CTA button — small, ghost-like link button */
:deep(.ob-result-cta.ant-btn) {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: auto;
  padding: 4px 10px;
  border-radius: var(--r-sm);
  font-size: var(--t-sm);
  font-weight: 500;
  background: transparent;
  border: 1px solid var(--line-2);
  color: var(--ink-2);
  box-shadow: none;
  white-space: nowrap;
  flex-shrink: 0;
}

:deep(.ob-result-cta.ant-btn:hover),
:deep(.ob-result-cta.ant-btn:focus) {
  background: var(--bg-2);
  border-color: var(--brand);
  color: var(--brand);
}
</style>
