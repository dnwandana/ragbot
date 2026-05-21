<script setup>
import { ref, onMounted } from "vue"
import { useRoute } from "vue-router"
import { useDatasetsStore } from "@/stores/datasets"
import { useDatasetFiles } from "@/composables/useDatasetFiles"

const route = useRoute()
const workspaceId = route.params.workspaceId
const datasetId = route.params.datasetId

const datasetsStore = useDatasetsStore()
const dataset = ref(null)
const activeTab = ref("files")

const { files, loading, isUploadVisible, isScrapeVisible, fetchFiles, handleUpload, handleScrape, handleDelete, handleReprocess } = useDatasetFiles(workspaceId, datasetId)

onMounted(async () => {
  dataset.value = await datasetsStore.fetchDataset(workspaceId, datasetId)
  await fetchFiles()
})

/** @param {string} status */
function statusVariant(status) {
  if (status === "completed") return "ok"
  if (status === "failed") return "err"
  if (status === "processing" || status === "queued") return "brand"
  return "ghost"
}

const tableColumns = [
  { title: "Filename", key: "filename", dataIndex: "filename" },
  { title: "Status", key: "status", dataIndex: "status", width: 130 },
  { title: "Chunks", key: "chunks", dataIndex: "chunk_count", width: 90 },
  { title: "Uploaded", key: "uploaded", dataIndex: "created_at", width: 130 },
  { title: "", key: "actions", width: 160 },
]
</script>

<template>
  <div class="page">
    <!-- Header -->
    <div class="page-head">
      <div class="page-head-left">
        <button class="back-btn" @click="$router.back()">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8">
            <path d="M10 4L6 8l4 4" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <div>
          <div class="page-title">{{ dataset?.name || "Dataset" }}</div>
          <div class="page-sub" v-if="dataset?.description">{{ dataset.description }}</div>
        </div>
      </div>
      <div class="page-actions">
        <button class="btn-outline" @click="isScrapeVisible = true">Scrape URL</button>
        <button class="btn-brand" @click="isUploadVisible = true">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M8 12V4M4 8l4-4 4 4" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Upload file
        </button>
        <button class="btn-outline" @click="$router.push(`/workspaces/${workspaceId}/conversations?dataset=${datasetId}`)">
          Start chat →
        </button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button class="tab" :class="{ active: activeTab === 'files' }" @click="activeTab = 'files'">Files</button>
      <button class="tab" :class="{ active: activeTab === 'overview' }" @click="activeTab = 'overview'">Overview</button>
    </div>

    <!-- Files tab -->
    <div v-if="activeTab === 'files'" class="tab-panel">
      <div class="files-table-wrap">
        <a-table :dataSource="files" :loading="loading" :columns="tableColumns" :pagination="false" rowKey="id" size="middle" :bordered="false">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'filename'">
              <div class="file-name-cell">
                <span class="file-name">{{ record.filename }}</span>
                <div v-if="record.status === 'processing'" class="file-shimmer" />
              </div>
            </template>
            <template v-if="column.key === 'status'">
              <span class="chip" :class="`chip--${statusVariant(record.status)}`">
                <span v-if="['processing','queued'].includes(record.status)" class="status-dot status-dot--pulse" />
                <span v-else-if="record.status === 'completed'" class="status-dot" />
                {{ record.status }}
              </span>
            </template>
            <template v-if="column.key === 'uploaded'">
              {{ new Date(record.created_at).toLocaleDateString() }}
            </template>
            <template v-if="column.key === 'actions'">
              <div class="row-actions">
                <button class="btn-outline btn-xs" :disabled="!['completed','failed'].includes(record.status)" @click="handleReprocess(record.id)">Reprocess</button>
                <button class="btn-danger-sm" @click="handleDelete(record.id)">Delete</button>
              </div>
            </template>
          </template>
        </a-table>
      </div>
    </div>

    <!-- Overview tab -->
    <div v-if="activeTab === 'overview'" class="tab-panel">
      <div class="overview-stats">
        <div class="stat-card">
          <div class="stat-value">{{ files.length }}</div>
          <div class="stat-label">Files</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ files.filter(f => f.status === 'completed').length }}</div>
          <div class="stat-label">Indexed</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ files.filter(f => f.status === 'processing').length }}</div>
          <div class="stat-label">Processing</div>
        </div>
      </div>
    </div>

    <!-- Upload modal -->
    <a-modal :open="isUploadVisible" title="Upload File" @cancel="isUploadVisible = false" :footer="null">
      <a-upload :beforeUpload="handleUpload" :showUploadList="false">
        <button class="btn-brand" style="width:100%;justify-content:center">Select File</button>
      </a-upload>
    </a-modal>

    <!-- Scrape URL modal -->
    <a-modal :open="isScrapeVisible" title="Scrape URL" @cancel="isScrapeVisible = false" :footer="null">
      <a-form layout="vertical" @finish="({ url }) => handleScrape(url)">
        <a-form-item label="URL" name="url" :rules="[{ required: true, type: 'url', message: 'Please enter a valid URL' }]">
          <a-input placeholder="https://example.com/page" />
        </a-form-item>
        <button type="submit" class="btn-brand" style="width:100%;justify-content:center;padding:10px">Scrape</button>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
.page { padding: 20px 24px; }
.page-head { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 0; gap: 12px; flex-wrap: wrap; }
.page-head-left { display: flex; align-items: center; gap: 10px; }
.page-actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.page-title { font-size: var(--t-lg); font-weight: 600; letter-spacing: -0.015em; color: var(--ink); }
.page-sub { font-size: var(--t-sm); color: var(--ink-3); margin-top: 2px; }

.back-btn { display: flex; align-items: center; justify-content: center; width: 30px; height: 30px; border: 1px solid var(--line-2); background: var(--surface); border-radius: var(--r-sm); cursor: pointer; color: var(--ink-3); }
.back-btn:hover { border-color: var(--brand); color: var(--brand); background: var(--brand-tint); }

.btn-brand { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; background: var(--brand); color: #fff; border: none; border-radius: var(--r-sm); font-size: 13px; font-weight: 500; cursor: pointer; }
.btn-brand:hover { background: var(--brand-2); }
.btn-outline { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; background: var(--surface); color: var(--ink-2); border: 1px solid var(--line-2); border-radius: var(--r-sm); font-size: 13px; cursor: pointer; }
.btn-outline:hover { border-color: var(--brand); color: var(--brand); }
.btn-outline:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-xs { padding: 4px 10px; font-size: 12px; }
.btn-danger-sm { display: inline-flex; align-items: center; padding: 4px 10px; font-size: 12px; background: transparent; color: var(--err); border: 1px solid var(--err-border); border-radius: var(--r-sm); cursor: pointer; }
.btn-danger-sm:hover { background: var(--err-bg); }

/* Tabs */
.tabs { display: flex; gap: 0; margin-top: 18px; border-bottom: 1px solid var(--line); }
.tab { padding: 9px 16px; font-size: 13px; font-weight: 500; color: var(--ink-3); background: none; border: none; border-bottom: 2px solid transparent; cursor: pointer; margin-bottom: -1px; }
.tab.active { color: var(--ink); border-bottom-color: var(--ink); }
.tab-panel { padding-top: 18px; }

/* Files table */
.files-table-wrap { background: var(--surface); border: 1px solid var(--line); border-radius: var(--r); overflow: hidden; box-shadow: var(--shadow-1); }
.file-name-cell { display: flex; flex-direction: column; gap: 4px; }
.file-name { font-size: 13px; color: var(--ink); font-weight: 500; }
.file-shimmer { height: 3px; background: linear-gradient(90deg, var(--brand) 0%, var(--brand-tint) 50%, var(--brand) 100%); background-size: 200% 100%; border-radius: 2px; animation: shimmer 1.5s infinite; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.chip { display: inline-flex; align-items: center; gap: 5px; padding: 2px 8px; border-radius: 20px; font-size: 11.5px; font-weight: 500; text-transform: capitalize; }
.chip--ok { background: var(--ok-bg); color: var(--ok); border: 1px solid var(--ok-border); }
.chip--err { background: var(--err-bg); color: var(--err); border: 1px solid var(--err-border); }
.chip--brand { background: var(--brand-tint); color: var(--brand-3); border: 1px solid rgba(255,107,53,0.2); }
.chip--ghost { background: var(--bg-2); color: var(--ink-4); border: 1px solid var(--line); }
.status-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.status-dot--pulse { animation: pulse 1.4s infinite; }
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
.row-actions { display: flex; gap: 6px; }
:deep(.ant-table-thead > tr > th) { background: var(--bg-2); font-size: 11.5px; font-weight: 600; color: var(--ink-4); text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 1px solid var(--line); }
:deep(.ant-table-tbody > tr > td) { border-bottom: 1px solid var(--line); padding: 11px 16px; }
:deep(.ant-table-tbody > tr:hover > td) { background: var(--bg) !important; }

/* Overview */
.overview-stats { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; }
.stat-card { background: var(--surface); border: 1px solid var(--line); border-radius: var(--r); padding: 18px 20px; box-shadow: var(--shadow-1); }
.stat-value { font-size: 28px; font-weight: 600; color: var(--ink); letter-spacing: -0.02em; }
.stat-label { font-size: 12.5px; color: var(--ink-3); margin-top: 4px; }
</style>
