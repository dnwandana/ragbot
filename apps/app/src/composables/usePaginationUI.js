import { computed } from "vue"

/** Sort option definitions shared across paginated list views. */
export const SORT_OPTIONS = [
  { label: "Recently created", sortBy: "created_at", sortOrder: "desc" },
  { label: "Oldest first", sortBy: "created_at", sortOrder: "asc" },
  { label: "Name A–Z", sortBy: "name", sortOrder: "asc" },
  { label: "Name Z–A", sortBy: "name", sortOrder: "desc" },
]

/**
 * Derived display state for paginated list views.
 * @param {{ pagination: import("vue").ComputedRef, page: import("vue").Ref<number>, sortBy: import("vue").Ref<string>, sortOrder: import("vue").Ref<string> }} refs - Reactive refs from useAgents or useDatasets
 * @returns {{ SORT_OPTIONS: Array, currentSortLabel: import("vue").ComputedRef<string>, totalCount: import("vue").ComputedRef<number>, paginationInfo: import("vue").ComputedRef<string>, pageNumbers: import("vue").ComputedRef<Array>, showPagination: import("vue").ComputedRef<boolean> }}
 */
export function usePaginationUI({ pagination, page, sortBy, sortOrder }) {
  const currentSortLabel = computed(() => {
    const opt = SORT_OPTIONS.find(
      (o) => o.sortBy === sortBy.value && o.sortOrder === sortOrder.value,
    )
    return opt?.label ?? "Recently created"
  })

  const totalCount = computed(() => pagination.value?.total_items ?? 0)

  const paginationInfo = computed(() => {
    if (!pagination.value || pagination.value.total_items === 0) return ""
    const { current_page, items_per_page, total_items } = pagination.value
    const start = (current_page - 1) * items_per_page + 1
    const end = Math.min(current_page * items_per_page, total_items)
    return `Showing ${start}–${end} of ${total_items}`
  })

  const pageNumbers = computed(() => {
    const total = pagination.value?.total_pages ?? 0
    const current = page.value
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
    const pages = []
    pages.push(1)
    if (current > 3) pages.push("…")
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
      pages.push(i)
    }
    if (current < total - 2) pages.push("…")
    pages.push(total)
    return pages
  })

  const showPagination = computed(() => (pagination.value?.total_pages ?? 0) > 1)

  return { SORT_OPTIONS, currentSortLabel, totalCount, paginationInfo, pageNumbers, showPagination }
}
