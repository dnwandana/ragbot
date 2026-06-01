<script setup>
import {
  BorderOutlined,
  AppstoreOutlined,
  UsergroupAddOutlined,
  DatabaseOutlined,
  RobotOutlined,
  ClockCircleOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons-vue"

const props = defineProps({
  ctx: { type: Object, required: true },
})

const STEP_META = [
  {
    icon: AppstoreOutlined,
    required: true,
    desc: "Name the home for your team, sources, and agents.",
  },
  {
    icon: UsergroupAddOutlined,
    required: false,
    desc: "Invite teammates by email and set their roles.",
  },
  {
    icon: DatabaseOutlined,
    required: false,
    desc: "Upload documents or link a URL to search over.",
  },
  { icon: RobotOutlined, required: false, desc: "Create a persona with its own instructions." },
]
</script>

<template>
  <div class="ob-welcome">
    <div class="ob-welcome-top">
      <div class="ob-welcome-mark">
        <BorderOutlined />
      </div>
      <h1 class="ob-title ob-title-lg">Let's get you set up</h1>
      <p class="ob-subtitle ob-subtitle-wide">
        A few quick steps to point RAGBot at your documents. Only the workspace is required — skip
        the rest and come back whenever you like.
      </p>
    </div>

    <div class="ob-expect">
      <div class="ob-eyebrow">What to expect</div>
      <ul class="ob-expect-list">
        <li v-for="(meta, i) in STEP_META" :key="i" class="ob-expect-item">
          <span class="ob-expect-num">{{ i + 1 }}</span>
          <span class="ob-expect-icon"><component :is="meta.icon" /></span>
          <span class="ob-expect-text">
            <span class="ob-expect-name">
              {{ props.ctx.steps[i].label }}
              <span v-if="meta.required" class="ob-tag-req">Required</span>
              <span v-else class="ob-tag-optional">Optional</span>
            </span>
            <span class="ob-expect-desc">{{ meta.desc }}</span>
          </span>
        </li>
      </ul>
    </div>

    <div class="ob-welcome-foot">
      <span class="ob-est">
        <ClockCircleOutlined />
        About {{ props.ctx.steps.length + 1 }} minutes
      </span>
      <button class="ob-btn ob-btn-primary ob-btn-lg" @click="props.ctx.next()">
        Get started
        <ArrowRightOutlined />
      </button>
    </div>
  </div>
</template>
