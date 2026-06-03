<script setup>
import { File, Check, Loader } from "lucide-vue-next"
</script>

<template>
  <MockFrame
    label="ragbot — datasets / Company handbook"
    caption="Documents are ready to use the moment processing finishes."
  >
    <div class="filelist">
      <div class="filerow">
        <div class="filerow__ic"><File :size="16" /></div>
        <div class="filerow__meta">
          <div class="filerow__name">employee-handbook-2024.pdf</div>
          <div class="filerow__sub">2.4 MB · 88 pages · added 2 days ago</div>
        </div>
        <span class="chip chip--ok"><Check :size="12" /> Ready</span>
      </div>
      <div class="filerow">
        <div class="filerow__ic"><File :size="16" /></div>
        <div class="filerow__meta">
          <div class="filerow__name">returns-policy.docx</div>
          <div class="filerow__sub">142 KB · 6 pages · added 2 days ago</div>
        </div>
        <span class="chip chip--ok"><Check :size="12" /> Ready</span>
      </div>
      <div class="filerow">
        <div class="filerow__ic"><File :size="16" /></div>
        <div class="filerow__meta">
          <div class="filerow__name">benefits-overview.pdf</div>
          <div class="filerow__sub">880 KB · 24 pages · uploading…</div>
        </div>
        <span class="chip chip--proc"><Loader :size="12" /> Processing</span>
      </div>
    </div>
  </MockFrame>
</template>
