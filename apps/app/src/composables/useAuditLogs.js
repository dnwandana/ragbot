import { ref, computed, watch, onMounted, onUnmounted } from "vue"
import { getMembers } from "@/api/members"
import { useAuditLogsStore } from "@/stores/auditLogs"
import { resolveActor } from "@/components/audit/auditMaps"

const LIMIT = 25

/**
 * Audit-logs list state: server-backed single-select filters, pagination,
 * member-map actor resolution, and drawer selection.
 * @param {string} workspaceId
 */
export function useAuditLogs(workspaceId) {
  const store = useAuditLogsStore()

  // Single-value, server-backed filters
  const entityType = ref(null)
  const action = ref(null)
  const userId = ref(null)

  // Sort fixed to created_at desc (only sortable column the API allows)
  const sortBy = ref("created_at")
  const sortOrder = ref("desc")
  const page = ref(1)

  // Drawer selection
  const selectedEvent = ref(null)

  // Member map for actor resolution
  const members = ref([])
  const memberMap = ref(new Map())

  function doFetch() {
    return store.fetchAuditLogs(workspaceId, {
      ...(entityType.value && { entity_type: entityType.value }),
      ...(action.value && { action: action.value }),
      ...(userId.value && { user_id: userId.value }),
      sort_by: sortBy.value,
      sort_order: sortOrder.value,
      page: page.value,
      limit: LIMIT,
    })
  }

  // Any filter change resets to page 1 and re-fetches
  watch([entityType, action, userId], () => {
    page.value = 1
    doFetch()
  })

  /** @param {number} p */
  function setPage(p) {
    page.value = p
    doFetch()
  }

  function clearFilters() {
    entityType.value = null
    action.value = null
    userId.value = null
  }

  const hasFilters = computed(() => !!entityType.value || !!action.value || !!userId.value)

  async function loadMembers() {
    try {
      const res = await getMembers(workspaceId)
      const list = res.data.data || []
      members.value = list
      const map = new Map()
      list.forEach((m) => {
        const uid = m.user_id || m.id
        map.set(uid, { full_name: m.full_name, email: m.email })
      })
      memberMap.value = map
    } catch {
      // Non-fatal — actors fall back to short id.
    }
  }

  /** @param {string} uid @returns {{name:string,email:string,initials:string,color:string}} */
  function actorFor(uid) {
    return resolveActor(uid, memberMap.value)
  }

  /** @param {Object} event */
  function openEvent(event) {
    selectedEvent.value = event
  }

  function closeEvent() {
    selectedEvent.value = null
  }

  function onKey(e) {
    if (e.key === "Escape") closeEvent()
  }

  onMounted(() => {
    loadMembers()
    doFetch()
    window.addEventListener("keydown", onKey)
  })
  onUnmounted(() => window.removeEventListener("keydown", onKey))

  return {
    auditLogs: computed(() => store.auditLogs),
    loading: computed(() => store.loading),
    pagination: computed(() => store.pagination),
    members,
    entityType,
    action,
    userId,
    sortBy,
    sortOrder,
    page,
    setPage,
    clearFilters,
    hasFilters,
    selectedEvent,
    openEvent,
    closeEvent,
    actorFor,
  }
}
