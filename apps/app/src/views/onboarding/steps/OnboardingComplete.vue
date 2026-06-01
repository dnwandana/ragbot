<script setup>
import { computed } from "vue"
import {
  CheckCircleOutlined,
  CheckOutlined,
  AppstoreOutlined,
  UsergroupAddOutlined,
  DatabaseOutlined,
  RobotOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons-vue"

const props = defineProps({
  ctx: { type: Object, required: true },
})

const fileCount = computed(
  () => props.ctx.formData.files.filter((f) => f.status === "ready" || f.status === "done").length,
)

const rows = computed(() => [
  {
    key: "workspace",
    icon: AppstoreOutlined,
    label: "Workspace created",
    value: props.ctx.formData.workspaceName,
    cta: "Open workspace",
    on: props.ctx.completed.has("workspace"),
  },
  {
    key: "invites",
    icon: UsergroupAddOutlined,
    label: props.ctx.completed.has("invites") ? "Team invited" : "Team",
    value: props.ctx.completed.has("invites")
      ? `${props.ctx.formData.invites.length} ${props.ctx.formData.invites.length === 1 ? "invite" : "invites"} sent`
      : "Skipped — invite later",
    cta: "View team",
    on: props.ctx.completed.has("invites"),
  },
  {
    key: "source",
    icon: DatabaseOutlined,
    label: props.ctx.completed.has("source") ? "Dataset added" : "Knowledge source",
    value: props.ctx.completed.has("source")
      ? `${props.ctx.formData.datasetName} · ${fileCount.value} ${fileCount.value === 1 ? "source" : "sources"}`
      : "Skipped — add later",
    cta: "Open dataset",
    on: props.ctx.completed.has("source"),
  },
  {
    key: "agent",
    icon: RobotOutlined,
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
        <CheckCircleOutlined style="font-size: 28px" />
      </div>
      <h1 class="ob-title ob-title-lg">Setup complete</h1>
      <p class="ob-subtitle ob-subtitle-wide">
        Your workspace is ready to go. Jump into anything you created below.
      </p>
    </div>

    <div class="ob-result-list">
      <div v-for="row in rows" :key="row.key" class="ob-result" :class="{ 'is-skipped': !row.on }">
        <div class="ob-result-icon" :class="{ 'is-skipped': !row.on }">
          <CheckOutlined v-if="row.on" style="font-size: 13px" />
          <component :is="row.icon" v-else style="font-size: 13px" />
        </div>
        <div class="ob-result-main">
          <span class="ob-result-label">{{ row.label }}</span>
          <span class="ob-result-value">{{ row.value }}</span>
        </div>
        <button v-if="row.on" class="ob-result-cta" @click="props.ctx.goToItem(row.key)">
          {{ row.cta }} <ArrowRightOutlined style="font-size: 11px" />
        </button>
      </div>
    </div>

    <div>
      <button class="ob-btn ob-btn-primary ob-btn-lg ob-btn-full" @click="props.ctx.finish()">
        Go to dashboard <ArrowRightOutlined />
      </button>
    </div>
  </div>
</template>
