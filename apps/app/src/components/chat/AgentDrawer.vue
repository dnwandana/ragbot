<template>
  <div class="agent-drawer">
    <div class="agent-drawer__header">
      <span class="agent-drawer__title">Select agent</span>
      <span class="agent-drawer__sub">{{ subLabel }}</span>
    </div>

    <div class="agent-drawer__body">
      <div class="agent-search" @click.stop>
        <Search :size="14" class="agent-search__icon" />
        <input
          v-model="query"
          class="agent-search__input"
          placeholder="Search agents…"
          @input="emit('search', query)"
        />
      </div>

      <!-- Pinned: current agent (stays visible during search) -->
      <template v-if="selectedAgent">
        <div class="agent-drawer__group">Current</div>
        <button
          type="button"
          class="agent-row agent-row--active"
          @click="emit('select', selectedAgent.id)"
        >
          <span class="agent-row__info">
            <span class="agent-row__name">{{ selectedAgent.name }}</span>
            <span class="agent-row__meta">{{ agentSub(selectedAgent) }}</span>
          </span>
          <Check :size="13" class="agent-row__check" />
        </button>
      </template>

      <!-- Results (excluding the current agent, which is pinned above) -->
      <div v-if="otherAgents.length" class="agent-drawer__group">All agents</div>
      <button
        v-for="a in otherAgents"
        :key="a.id"
        type="button"
        class="agent-row"
        @click="emit('select', a.id)"
      >
        <span class="agent-row__info">
          <span class="agent-row__name">{{ a.name }}</span>
          <span class="agent-row__meta">{{ agentSub(a) }}</span>
        </span>
      </button>

      <p v-if="loading" class="agent-drawer__hint">Searching…</p>
      <p v-else-if="query.trim() && !otherAgents.length" class="agent-drawer__hint">
        No agents match "{{ query.trim() }}".
      </p>
      <p v-else-if="total > agents.length" class="agent-drawer__hint">
        Showing {{ agents.length }} of {{ total }} — search to find more.
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue"
import { Check, Search } from "lucide-vue-next"

const props = defineProps({
  /** Current picker results to show: id, name, model_config, is_default, is_system. */
  agents: { type: Array, default: () => [] },
  /** Id of the currently selected agent (pinned above and excluded from results). */
  selectedAgentId: { type: [String, null], default: null },
  /** Resolved object for the current agent — pinned "Current" row. */
  selectedAgent: { type: [Object, null], default: null },
  /** Total agents available for the current query (drives the truncation hint). */
  total: { type: Number, default: 0 },
  /** When true, the picker is fetching results. */
  loading: { type: Boolean, default: false },
})

const emit = defineEmits(["select", "search", "close"])

const query = ref("")

/** Results minus the current agent (it is pinned in the "Current" group above). */
const otherAgents = computed(() => props.agents.filter((a) => a.id !== props.selectedAgentId))

/** Header prompt mirroring DatasetDrawer's interactive sub-label. */
const subLabel = "Choose agent"

/**
 * Short descriptor under an agent's name: its role tag or the bare model name.
 * @param {object} a - the agent record.
 * @returns {string} "Default", "System", or the trailing model identifier.
 */
function agentSub(a) {
  return a.is_default ? "Default" : a.is_system ? "System" : a.model_config?.model?.split("/").pop()
}
</script>

<style scoped>
.agent-drawer {
  width: 300px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-3);
  padding: 8px;
}

.agent-drawer__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px 8px;
  border-bottom: 1px solid var(--line);
  margin-bottom: 6px;
}

.agent-drawer__title {
  font-size: var(--t-base);
  font-weight: 600;
  color: var(--ink);
}

.agent-drawer__sub {
  font-size: 10.5px;
  font-weight: 700;
  color: var(--ink-3);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.agent-drawer__body {
  padding: 2px 2px 4px;
  max-height: 280px;
  overflow-y: auto;
}

.agent-drawer__hint {
  font-size: var(--t-sm);
  color: var(--ink-4);
  margin: 6px 6px 2px;
  line-height: 1.5;
}

.agent-search {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 2px 2px 8px;
  padding: 7px 10px;
  border: 1px solid var(--line-2);
  border-radius: var(--r-sm);
  background: var(--bg);
}

.agent-search__icon {
  color: var(--ink-4);
  flex-shrink: 0;
}

.agent-search__input {
  border: none;
  outline: none;
  background: transparent;
  font: 400 12.5px var(--font-sans);
  color: var(--ink);
  width: 100%;
}

.agent-drawer__group {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--ink-4);
  padding: 6px 8px 3px;
}

.agent-row {
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

.agent-row:hover {
  background: var(--bg-2);
}

.agent-row--active {
  background: var(--brand-tint);
}

.agent-row__info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.agent-row__name {
  font-size: 13px;
  font-weight: 500;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.agent-row__meta {
  font-size: 11px;
  color: var(--ink-3);
  margin-top: 1px;
}

.agent-row__check {
  color: var(--brand);
  flex-shrink: 0;
}
</style>
