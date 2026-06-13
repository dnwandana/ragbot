import { ref, unref, watch } from "vue"
import { listDatasetQuestions } from "@/api/datasets"

/** Maximum number of suggested prompts shown on the welcome screen. */
const MAX_PROMPTS = 4

/**
 * Resolve suggested chat prompts from a conversation's first linked dataset.
 *
 * Tracks only the first linked dataset id. When it changes, refetches that
 * dataset's exploration questions in a single call; when no dataset is linked,
 * clears the prompts so the welcome screen hides them. A request token guards
 * against out-of-order responses (rapid first-dataset changes). Any failure
 * degrades to an empty prompt list.
 *
 * @param {import('vue').Ref<string>|string} workspaceId - Workspace id (ref or value)
 * @param {import('vue').Ref<string[]>} datasetIds - Reactive list of linked dataset ids
 * @returns {{ prompts: import('vue').Ref<Array<{ text: string }>> }}
 */
export function useSuggestedPrompts(workspaceId, datasetIds) {
  const prompts = ref([])
  let requestToken = 0 // guards against out-of-order responses

  watch(
    () => unref(datasetIds)?.[0] ?? null, // track the FIRST id only
    async (firstId) => {
      const token = ++requestToken
      if (!firstId) {
        prompts.value = [] // nothing selected → hide
        return
      }
      try {
        const res = await listDatasetQuestions(unref(workspaceId), firstId, { limit: MAX_PROMPTS })
        if (token !== requestToken) return // superseded by a newer change
        prompts.value = (res?.data?.data ?? [])
          .slice(0, MAX_PROMPTS)
          .map((q) => ({ text: q.question }))
      } catch {
        if (token === requestToken) prompts.value = [] // degrade to hidden
      }
    },
    { immediate: true },
  )

  return { prompts }
}
