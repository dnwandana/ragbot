import { ref, unref } from "vue"
import { message } from "ant-design-vue"
import * as sharesApi from "@/api/conversationShares"

/**
 * Holds the share state and the share actions for one conversation.
 * @param {string|import('vue').Ref<string>} workspaceId
 * @param {string|import('vue').Ref<string>} conversationId
 */
export function useConversationShare(workspaceId, conversationId) {
  const share = ref(null)
  const loading = ref(false)
  const ids = () => [unref(workspaceId), unref(conversationId)]

  /** Runs one API call with the loading flag. Errors are already toasted by the client. */
  async function run(action) {
    loading.value = true
    try {
      await action()
    } catch {
      // The HTTP client shows the error toast.
    } finally {
      loading.value = false
    }
  }

  async function load() {
    try {
      share.value = (await sharesApi.getShare(...ids())).data.data
    } catch (error) {
      if (error.status === 404) share.value = null
    }
  }

  const create = () =>
    run(async () => {
      try {
        share.value = (await sharesApi.createShare(...ids())).data.data
        message.success("Share link created")
      } catch (error) {
        if (error.status === 409) share.value = error.data.data
        else message.error(error.message)
      }
    })

  const update = () =>
    run(async () => {
      share.value = (await sharesApi.updateShare(...ids())).data.data
      message.success("Share link updated")
    })

  const revoke = () =>
    run(async () => {
      await sharesApi.revokeShare(...ids())
      share.value = null
      message.success("Share link revoked")
    })

  async function copy() {
    if (!share.value?.url) return
    try {
      await navigator.clipboard.writeText(share.value.url)
      message.success("Link copied")
    } catch {
      message.error("Could not copy the link. Copy it from the field.")
    }
  }

  const downloadMarkdown = () =>
    run(async () => {
      let file
      try {
        file = await sharesApi.exportMarkdown(...ids())
      } catch {
        message.error("Export failed")
        return
      }
      const href = URL.createObjectURL(file.blob)
      const a = document.createElement("a")
      a.href = href
      a.download = file.filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(href)
    })

  return { share, loading, load, create, update, revoke, copy, downloadMarkdown }
}
