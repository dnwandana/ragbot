import { ref, computed } from "vue"
import { defineStore } from "pinia"
import * as auditLogsApi from "@/api/auditLogs"

export const useAuditLogsStore = defineStore("auditLogs", () => {
  const auditLogs = ref([])
  const pagination = ref(null)
  const loadingCount = ref(0)
  const loading = computed(() => loadingCount.value > 0)

  /**
   * Fetch a page of audit log entries.
   * @param {string} workspaceId
   * @param {Object} [params]
   */
  async function fetchAuditLogs(workspaceId, params = {}) {
    loadingCount.value++
    try {
      const res = await auditLogsApi.listAuditLogs(workspaceId, params)
      auditLogs.value = res.data.data
      pagination.value = res.data.pagination
    } finally {
      loadingCount.value--
    }
  }

  return { auditLogs, pagination, loading, fetchAuditLogs }
})
