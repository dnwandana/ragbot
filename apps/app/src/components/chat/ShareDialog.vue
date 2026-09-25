<script setup>
/** ShareDialog: create, copy, update, or revoke the public link of one conversation. Emits `close`. */
import { ref, toRef, watch } from "vue"
import { Modal, Button, Input } from "ant-design-vue"
import { useConversationShare } from "@/composables/useConversationShare"

const props = defineProps({
  open: { type: Boolean, default: false },
  workspaceId: { type: String, required: true },
  conversationId: { type: String, required: true },
})
const emit = defineEmits(["close"])

const { share, loading, load, create, update, revoke, copy } = useConversationShare(
  toRef(props, "workspaceId"),
  toRef(props, "conversationId"),
)
const confirmRevoke = ref(false)

// Reload on every open so the dialog shows the server state, not a stale copy.
watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    confirmRevoke.value = false
    load()
  },
)

const updatedLabel = () => new Date(share.value.updated_at).toLocaleString()

async function confirmRevokeClick() {
  await revoke()
  confirmRevoke.value = false
}
</script>

<template>
  <Modal :open="open" title="Share conversation" :footer="null" @cancel="emit('close')">
    <div v-if="!share" class="share-dialog">
      <p class="share-dialog__copy">
        Anyone with the link can read the messages, charts, and sources in this conversation. New
        messages stay private until you update the link.
      </p>
      <Button type="primary" :loading="loading" @click="create">Create link</Button>
    </div>

    <div v-else class="share-dialog">
      <div class="share-dialog__url">
        <Input :value="share.url" readonly />
        <Button @click="copy">Copy</Button>
      </div>
      <p class="share-dialog__meta">Snapshot updated {{ updatedLabel() }}</p>
      <div v-if="!confirmRevoke" class="share-dialog__actions">
        <Button :loading="loading" @click="update">Update snapshot</Button>
        <Button danger @click="confirmRevoke = true">Revoke link</Button>
      </div>
      <div v-else class="share-dialog__confirm">
        <p class="share-dialog__copy">Revoke this link? Anyone who has the link loses access.</p>
        <div class="share-dialog__actions">
          <Button danger type="primary" :loading="loading" @click="confirmRevokeClick"
            >Revoke</Button
          >
          <Button @click="confirmRevoke = false">Keep link</Button>
        </div>
      </div>
    </div>
  </Modal>
</template>

<style scoped>
.share-dialog {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.share-dialog__copy {
  margin: 0;
  color: var(--ink-2);
  line-height: 1.5;
}
.share-dialog__url,
.share-dialog__actions {
  display: flex;
  gap: 8px;
}
.share-dialog__meta {
  margin: 0;
  font-size: var(--t-sm);
  color: var(--ink-3);
}
</style>
