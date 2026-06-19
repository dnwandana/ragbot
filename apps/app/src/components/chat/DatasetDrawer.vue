<template>
  <div class="dataset-drawer">
    <div class="dataset-drawer__header">
      <span class="dataset-drawer__title">Linked sources</span>
      <span class="dataset-drawer__sub">{{ subLabel }}</span>
    </div>

    <!-- Interactive: search + choose datasets (new conversation) -->
    <div v-if="interactive" class="dataset-drawer__body">
      <div class="dataset-search">
        <Search :size="14" class="dataset-search__icon" />
        <input
          v-model="query"
          class="dataset-search__input"
          placeholder="Search datasets…"
          @input="emit('search', query)"
        />
      </div>

      <!-- Pinned: currently selected datasets (stay visible during search) -->
      <template v-if="selectedDatasets.length">
        <div class="dataset-drawer__group">Selected · {{ selectedIds.length }}</div>
        <button
          v-for="d in selectedDatasets"
          :key="d.id"
          type="button"
          class="dataset-row dataset-row--active"
          @click="emit('toggle', d.id)"
        >
          <span class="dataset-row__info">
            <span class="dataset-row__name">{{ d.name }}</span>
            <span class="dataset-row__meta">
              {{ d.file_count ?? 0 }} file{{ (d.file_count ?? 0) === 1 ? "" : "s" }}
            </span>
          </span>
          <span class="dataset-row__check dataset-row__check--on">
            <Check :size="12" />
          </span>
        </button>
        <div class="dataset-drawer__divider" />
      </template>

      <!-- Results (excluding already-selected) -->
      <div v-if="unselectedResults.length" class="dataset-drawer__group">
        {{ query.trim() ? "Results" : "Recent" }}
      </div>
      <button
        v-for="d in unselectedResults"
        :key="d.id"
        type="button"
        class="dataset-row"
        @click="emit('toggle', d.id)"
      >
        <span class="dataset-row__info">
          <span class="dataset-row__name">{{ d.name }}</span>
          <span class="dataset-row__meta">
            {{ d.file_count ?? 0 }} file{{ (d.file_count ?? 0) === 1 ? "" : "s" }}
          </span>
        </span>
        <span class="dataset-row__check" />
      </button>

      <p v-if="loading" class="dataset-drawer__hint">Searching…</p>
      <p v-else-if="query.trim() && !unselectedResults.length" class="dataset-drawer__hint">
        No datasets match "{{ query.trim() }}".
      </p>
      <p v-else-if="!datasets.length && !selectedDatasets.length" class="dataset-drawer__hint">
        No datasets in this workspace yet. Create one from the Datasets page to search your sources.
      </p>
      <p v-else-if="total > datasets.length" class="dataset-drawer__hint">
        Showing {{ datasets.length }} of {{ total }} — search to find more.
      </p>
    </div>

    <!-- Read-only: show linked datasets (existing conversation) -->
    <div v-else class="dataset-drawer__body">
      <p v-if="!selectedIds.length" class="dataset-drawer__hint">
        This conversation has no linked datasets.
      </p>
      <template v-else>
        <div
          v-for="row in readOnlyRows"
          :key="row.id"
          class="dataset-ro"
          :class="{ 'dataset-ro--stub': !row.name }"
        >
          <span class="dataset-ro__dot" />
          <span class="dataset-ro__name">{{ row.name || "Dataset unavailable" }}</span>
        </div>
        <p class="dataset-drawer__hint">
          Datasets are fixed for this conversation. Start a new one to search different sources.
        </p>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue"
import { Check, Search } from "lucide-vue-next"

const props = defineProps({
  /** Current picker results to show (interactive): id, name, file_count. */
  datasets: { type: Array, default: () => [] },
  /** IDs of datasets currently selected/linked. */
  selectedIds: { type: Array, default: () => [] },
  /** Resolved dataset objects for selectedIds — pinned group + read-only list. */
  selectedDatasets: { type: Array, default: () => [] },
  /** Total datasets available for the current query (drives the truncation hint). */
  total: { type: Number, default: 0 },
  /** When true, the picker is fetching results. */
  loading: { type: Boolean, default: false },
  /** When true, rows are clickable to toggle selection; otherwise read-only. */
  interactive: { type: Boolean, default: false },
})

const emit = defineEmits(["toggle", "search", "close"])

const query = ref("")

/** Results minus the already-selected datasets (those are pinned above). */
const unselectedResults = computed(() =>
  props.datasets.filter((d) => !props.selectedIds.includes(d.id)),
)

/** One row per selected id, resolved to its object or an id-only stub. */
const readOnlyRows = computed(() =>
  props.selectedIds.map((id) => props.selectedDatasets.find((d) => d.id === id) || { id }),
)

/** Header label: prompt (interactive) or authoritative linked count (read-only). */
const subLabel = computed(() =>
  props.interactive ? "Select datasets" : `${props.selectedIds.length} linked`,
)
</script>

<style scoped>
.dataset-drawer {
  width: 300px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-3);
  padding: 8px;
}

.dataset-drawer__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px 8px;
  border-bottom: 1px solid var(--line);
  margin-bottom: 6px;
}

.dataset-drawer__title {
  font-size: var(--t-base);
  font-weight: 600;
  color: var(--ink);
}

.dataset-drawer__sub {
  font-size: 10.5px;
  font-weight: 700;
  color: var(--ink-3);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.dataset-drawer__body {
  padding: 2px 2px 4px;
  max-height: 280px;
  overflow-y: auto;
}

.dataset-drawer__hint {
  font-size: var(--t-sm);
  color: var(--ink-4);
  margin: 6px 6px 2px;
  line-height: 1.5;
}

.dataset-search {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 2px 2px 8px;
  padding: 7px 10px;
  border: 1px solid var(--line-2);
  border-radius: var(--r-sm);
  background: var(--bg);
}

.dataset-search__icon {
  color: var(--ink-4);
  flex-shrink: 0;
}

.dataset-search__input {
  border: none;
  outline: none;
  background: transparent;
  font: 400 12.5px var(--font-sans);
  color: var(--ink);
  width: 100%;
}

.dataset-drawer__group {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--ink-4);
  padding: 6px 8px 3px;
}

.dataset-drawer__divider {
  height: 1px;
  background: var(--line);
  margin: 6px 6px;
}

.dataset-ro--stub {
  color: var(--ink-4);
}

.dataset-ro--stub .dataset-ro__dot {
  background: var(--line-2);
}

.dataset-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding: 9px 10px;
  border: none;
  background: transparent;
  border-radius: var(--r-sm);
  cursor: pointer;
  text-align: left;
}

.dataset-row:hover {
  background: var(--bg-2);
}

.dataset-row--active {
  background: var(--brand-tint);
}

.dataset-row__info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.dataset-row__name {
  font-size: 13px;
  font-weight: 500;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dataset-row__meta {
  font-size: 11px;
  color: var(--ink-3);
  margin-top: 1px;
}

.dataset-row__check {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 1.5px solid var(--line-2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}

.dataset-row__check--on {
  background: var(--brand);
  border-color: var(--brand);
}

.dataset-ro {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 8px;
  font-size: 13px;
  color: var(--ink-2);
}

.dataset-ro__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--brand);
  flex-shrink: 0;
}

.dataset-ro__name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
