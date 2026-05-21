<script setup>
import { reactive, ref, onMounted, computed } from "vue"
import { useRoute } from "vue-router"
import { useDatasets } from "@/composables/useDatasets"
import VariationsToggle from "@/components/VariationsToggle.vue"

const route = useRoute()
const workspaceId = route.params.workspaceId

const { datasets, loading, isModalVisible, nameRules, openCreateModal, closeModal, handleSubmit, handleDelete, fetchDatasets } = useDatasets(workspaceId)

const form = reactive({ name: "", description: "", embedding_model: "openai/text-embedding-3-small", chunk_size: 1024, chunk_overlap: 200 })
const viewMode = ref("cards")

onMounted(fetchDatasets)

const VIEW_OPTIONS = [
  { label: "Cards", value: "cards" },
  { label: "Table", value: "table" },
]

const DATASET_COLORS = ["#FF6B35","#117A4A","#1D4ED8","#7C3AED","#C47B00","#0891B2","#BE185D","#374151"]

/** @param {number} index */
function datasetColor(index) {
  return DATASET_COLORS[index % DATASET_COLORS.length]
}

/**
 * @param {object} ds
 * @returns {{ label: string, variant: string, progress: number|null }}
 */
function datasetStatus(ds) {
  const status = ds.status || "indexed"
  if (status === "processing") return { label: `Processing`, variant: "brand", progress: ds.progress || 0 }
  if (status === "failed" || status === "error") return { label: "Error", variant: "err", progress: null }
  return { label: "Indexed", variant: "ok", progress: null }
}

/** @param {string} dateStr */
function relativeDate(dateStr) {
  if (!dateStr) return ""
  const diff = (Date.now() - new Date(dateStr)) / 86400000
  if (diff < 1) return "Today"
  if (diff < 2) return "Yesterday"
  if (diff < 7) return `${Math.floor(diff)}d ago`
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

const tableColumns = computed(() => [
  { title: "Name", key: "name", dataIndex: "name" },
  { title: "Files", key: "files", dataIndex: "file_count", width: 80 },
  { title: "Status", key: "status", dataIndex: "status", width: 120 },
  { title: "Updated", key: "updated", dataIndex: "updated_at", width: 120 },
  { title: "", key: "actions", width: 80 },
])
</script>

<template>
  <div class="page">
    <!-- Page head -->
    <div class="page-head">
      <div>
        <div class="page-title">Datasets</div>
        <div class="page-sub">Knowledge bases for your agents.</div>
      </div>
      <div class="page-actions">
        <VariationsToggle v-model="viewMode" :options="VIEW_OPTIONS" />
        <button class="btn-outline" @click="openCreateModal">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M8 3v10M3 8h10" stroke-linecap="round"/>
          </svg>
          New dataset
        </button>
        <button class="btn-brand" @click="openCreateModal">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2">
            <path d="M8 3v10M3 8h10" stroke-linecap="round"/>
          </svg>
          Upload file
        </button>
      </div>
    </div>

    <!-- Loading -->
    <a-skeleton v-if="loading && !datasets.length" active :paragraph="{ rows: 4 }" />

    <!-- Empty state -->
    <div v-else-if="!datasets.length" class="empty-state">
      <div class="empty-icon">📚</div>
      <div class="empty-title">No datasets yet</div>
      <p class="empty-text">Upload documents or scrape URLs to build your first knowledge base.</p>
      <button class="btn-brand" @click="openCreateModal">Create dataset</button>
    </div>

    <!-- CARDS view -->
    <div v-else-if="viewMode === 'cards'" class="ds-grid">
      <div
        v-for="(ds, idx) in datasets"
        :key="ds.id"
        class="ds-card"
        @click="$router.push(`/workspaces/${workspaceId}/datasets/${ds.id}`)"
      >
        <div class="ds-card__accent" :style="{ background: datasetColor(idx) }" />
        <div class="ds-card__body">
          <div class="ds-card__name">{{ ds.name }}</div>
          <p v-if="ds.description" class="ds-card__desc">{{ ds.description }}</p>
          <div class="ds-card__tags" v-if="ds.tags?.length">
            <span v-for="tag in ds.tags" :key="tag" class="chip-sm">{{ tag }}</span>
          </div>
          <div class="ds-card__stats">
            <span class="stat">{{ ds.file_count || 0 }} files</span>
          </div>
          <div class="ds-card__status">
            <template v-if="datasetStatus(ds).variant === 'brand'">
              <span class="chip chip--brand">
                <span class="status-dot" style="background:var(--brand)"/> Processing
              </span>
            </template>
            <template v-else-if="datasetStatus(ds).variant === 'err'">
              <span class="chip chip--err"><span class="status-dot"/> Error</span>
            </template>
            <template v-else>
              <span class="chip chip--ok"><span class="status-dot"/> Indexed</span>
            </template>
          </div>
        </div>
        <div class="ds-card__foot">
          <span class="foot-time">{{ relativeDate(ds.updated_at || ds.created_at) }}</span>
          <button class="icon-btn-sm" title="Delete dataset" @click.stop="handleDelete(ds.id)">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7">
              <path d="M3 4h10M5 4V3h6v1M6 7v5M10 7v5M4 4l1 9h6l1-9" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- TABLE view -->
    <div v-else class="ds-table-wrap">
      <a-table :dataSource="datasets" :loading="loading" :columns="tableColumns" :pagination="false" rowKey="id" size="middle" :bordered="false">
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'name'">
            <div class="tbl-name-cell" @click="$router.push(`/workspaces/${workspaceId}/datasets/${record.id}`)">
              <div class="tbl-accent" :style="{ background: datasetColor(index) }" />
              <div>
                <div class="tbl-name">{{ record.name }}</div>
                <div v-if="record.description" class="tbl-desc">{{ record.description }}</div>
              </div>
            </div>
          </template>
          <template v-if="column.key === 'status'">
            <span v-if="datasetStatus(record).variant === 'brand'" class="chip chip--brand">
              <span class="status-dot" style="background:var(--brand)"/> Processing
            </span>
            <span v-else-if="datasetStatus(record).variant === 'err'" class="chip chip--err">
              <span class="status-dot"/> Error
            </span>
            <span v-else class="chip chip--ok">
              <span class="status-dot"/> Indexed
            </span>
          </template>
          <template v-if="column.key === 'updated'">
            <span class="tbl-muted">{{ relativeDate(record.updated_at || record.created_at) }}</span>
          </template>
          <template v-if="column.key === 'actions'">
            <button class="icon-btn-sm" title="Delete" @click="handleDelete(record.id)">
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.7">
                <path d="M3 4h10M5 4V3h6v1M6 7v5M10 7v5M4 4l1 9h6l1-9" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </template>
        </template>
      </a-table>
    </div>

    <!-- Create dataset modal -->
    <a-modal :open="isModalVisible" title="New Dataset" @cancel="closeModal" :footer="null" :width="480">
      <a-form :model="form" layout="vertical" @finish="handleSubmit(form)">
        <a-form-item label="Name" name="name" :rules="nameRules">
          <a-input v-model:value="form.name" placeholder="e.g. Q3 Financial Report" />
        </a-form-item>
        <a-form-item label="Description">
          <a-textarea v-model:value="form.description" :rows="3" placeholder="Optional description" />
        </a-form-item>
        <a-collapse ghost>
          <a-collapse-panel key="adv" header="Advanced settings">
            <a-form-item label="Embedding Model">
              <a-input v-model:value="form.embedding_model" />
            </a-form-item>
            <a-form-item label="Chunk Size">
              <a-input-number v-model:value="form.chunk_size" :min="256" :max="8192" style="width:100%" />
            </a-form-item>
            <a-form-item label="Chunk Overlap">
              <a-input-number v-model:value="form.chunk_overlap" :min="0" :max="2048" style="width:100%" />
            </a-form-item>
          </a-collapse-panel>
        </a-collapse>
        <button type="submit" class="btn-brand btn-block" style="margin-top:16px">Create Dataset</button>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
.page { padding: 20px 24px; }
.page-head { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; gap: 12px; flex-wrap: wrap; }
.page-title { font-size: var(--t-lg); font-weight: 600; letter-spacing: -0.015em; color: var(--ink); }
.page-sub { font-size: var(--t-sm); color: var(--ink-3); margin-top: 2px; }
.page-actions { display: flex; align-items: center; gap: 8px; }

.btn-brand { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; background: var(--brand); color: #fff; border: none; border-radius: var(--r-sm); font-size: 13px; font-weight: 500; cursor: pointer; }
.btn-brand:hover { background: var(--brand-2); }
.btn-block { width: 100%; padding: 10px; justify-content: center; }
.btn-outline { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; background: var(--surface); color: var(--ink-2); border: 1px solid var(--line-2); border-radius: var(--r-sm); font-size: 13px; font-weight: 500; cursor: pointer; }
.btn-outline:hover { border-color: var(--brand); color: var(--brand); }

/* Cards */
.ds-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; }
.ds-card {
  background: var(--surface); border: 1px solid var(--line); border-radius: var(--r);
  box-shadow: var(--shadow-1); cursor: pointer; position: relative; overflow: hidden;
  display: flex; flex-direction: column;
  transition: box-shadow var(--dur) var(--ease), border-color var(--dur) var(--ease);
}
.ds-card:hover { box-shadow: var(--shadow-2); border-color: var(--line-2); }
.ds-card__accent { position: absolute; left: 0; top: 0; width: 4px; height: 100%; }
.ds-card__body { padding: 16px 16px 10px 20px; flex: 1; display: flex; flex-direction: column; gap: 6px; }
.ds-card__name { font-size: 14px; font-weight: 600; color: var(--ink); }
.ds-card__desc { font-size: 12.5px; color: var(--ink-3); line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin: 0; }
.ds-card__tags { display: flex; gap: 4px; flex-wrap: wrap; }
.ds-card__stats { display: flex; gap: 12px; }
.stat { font-size: 12px; color: var(--ink-4); }
.ds-card__status { margin-top: 2px; }
.ds-card__foot { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px 10px 20px; border-top: 1px solid var(--line); }
.foot-time { font-size: 11.5px; color: var(--ink-4); }

/* Chips */
.chip { display: inline-flex; align-items: center; gap: 5px; padding: 2px 8px; border-radius: 20px; font-size: 11.5px; font-weight: 500; }
.chip--ok { background: var(--ok-bg); color: var(--ok); border: 1px solid var(--ok-border); }
.chip--err { background: var(--err-bg); color: var(--err); border: 1px solid var(--err-border); }
.chip--brand { background: var(--brand-tint); color: var(--brand-3); border: 1px solid rgba(255,107,53,0.2); }
.chip-sm { display: inline-flex; align-items: center; padding: 1px 7px; background: var(--bg-2); border: 1px solid var(--line); border-radius: 20px; font-size: 11px; color: var(--ink-4); }
.status-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }

.icon-btn-sm { display: flex; align-items: center; justify-content: center; width: 26px; height: 26px; border: none; background: transparent; cursor: pointer; color: var(--ink-4); border-radius: var(--r-sm); }
.icon-btn-sm:hover { background: var(--err-bg); color: var(--err); }

/* Table */
.ds-table-wrap { background: var(--surface); border: 1px solid var(--line); border-radius: var(--r); overflow: hidden; box-shadow: var(--shadow-1); }
.tbl-name-cell { display: flex; align-items: center; gap: 12px; cursor: pointer; }
.tbl-accent { width: 4px; height: 36px; border-radius: 2px; flex-shrink: 0; }
.tbl-name { font-size: 13.5px; font-weight: 500; color: var(--ink); }
.tbl-desc { font-size: 12px; color: var(--ink-4); }
.tbl-muted { font-size: 12.5px; color: var(--ink-4); }
:deep(.ant-table-thead > tr > th) { background: var(--bg-2); font-size: 11.5px; font-weight: 600; color: var(--ink-4); text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 1px solid var(--line); }
:deep(.ant-table-tbody > tr > td) { border-bottom: 1px solid var(--line); padding: 11px 16px; }
:deep(.ant-table-tbody > tr:hover > td) { background: var(--bg) !important; }

.empty-state { text-align: center; padding: 60px 24px; }
.empty-icon { font-size: 40px; margin-bottom: 14px; }
.empty-title { font-size: 15px; font-weight: 600; color: var(--ink); margin-bottom: 6px; }
.empty-text { font-size: 13px; color: var(--ink-3); margin-bottom: 20px; max-width: 340px; margin-left: auto; margin-right: auto; }
</style>
