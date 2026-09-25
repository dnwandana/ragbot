<script setup>
import { nextTick, onMounted, ref } from "vue"
import { useRoute } from "vue-router"
import { getConversation } from "@/api/conversations"
import { getAgent } from "@/api/agents"
import { useWorkspacesStore } from "@/stores/workspaces"
import ReadonlyThread from "@/components/chat/ReadonlyThread.vue"
import { buildClientSnapshot } from "./build-client-snapshot.js"

const route = useRoute()
const workspacesStore = useWorkspacesStore()

/** "loading" | "ready" | "error" */
const state = ref("loading")
const snapshot = ref(null)
let printed = false

async function load() {
  const { workspaceId, conversationId } = route.params
  try {
    const conversation = (await getConversation(workspaceId, conversationId)).data.data
    if (workspacesStore.currentWorkspace?.id !== workspaceId) {
      await workspacesStore.fetchWorkspaceById(workspaceId)
    }
    const agentName = conversation.agent_id
      ? await getAgent(workspaceId, conversation.agent_id)
          .then((r) => r.data.data.name)
          .catch(() => "")
      : ""
    snapshot.value = buildClientSnapshot(conversation, {
      workspaceName: workspacesStore.currentWorkspace?.name || "",
      agentName,
    })
    state.value = "ready"
  } catch {
    state.value = "error"
  }
}

// ReadonlyThread emits ready once per snapshot, but the guard keeps a second
// emit from opening the print dialog twice.
async function onReady() {
  if (printed) return
  printed = true
  await nextTick()
  window.print()
}

onMounted(load)
</script>

<template>
  <div class="print-page">
    <p v-if="state === 'loading'" class="print-page__notice">Preparing the document…</p>
    <p v-else-if="state === 'error'" class="print-page__notice">
      Could not load this conversation.
    </p>
    <template v-else>
      <header class="print-page__header">
        <h1 class="print-page__title">{{ snapshot.title }}</h1>
        <p class="print-page__meta">{{ snapshot.workspace_name }} · {{ snapshot.agent_name }}</p>
      </header>
      <ReadonlyThread :snapshot="snapshot" @ready="onReady" />
    </template>
  </div>
</template>

<style scoped>
/* Fixed light palette: a dark-theme user still prints a light document. */
.print-page {
  max-width: 760px;
  margin: 0 auto;
  padding: 32px 24px;
  background: #fff;
  color: #111;
}
.print-page__title {
  margin: 0 0 4px;
  font-size: 22px;
}
.print-page__meta,
.print-page__notice {
  color: #555;
  font-size: 13px;
}
@media print {
  .print-page {
    max-width: none;
    padding: 0;
  }
  .print-page :deep(button),
  .print-page :deep(a[href]) {
    display: none;
  }
  .print-page :deep(.ro-thread__message) {
    break-inside: avoid;
  }
}
</style>
