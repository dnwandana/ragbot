<template>
  <div style="padding: 24px">
    <a-page-header :title="dataset?.name || 'Dataset'" @back="$router.back()">
      <template #extra>
        <a-button @click="isScrapeVisible = true">Scrape URL</a-button>
        <a-button type="primary" @click="isUploadVisible = true">Upload File</a-button>
        <a-button
          @click="$router.push(`/workspaces/${workspaceId}/conversations?dataset=${datasetId}`)"
        >
          Start Conversation
        </a-button>
      </template>
    </a-page-header>

    <a-table :dataSource="files" :loading="loading" :pagination="false" rowKey="id">
      <a-table-column title="Filename" dataIndex="filename" />
      <a-table-column title="Status" dataIndex="status">
        <template #default="{ record }">
          <a-tag :color="statusColor(record.status)">{{ record.status }}</a-tag>
        </template>
      </a-table-column>
      <a-table-column title="Chunks" dataIndex="chunk_count" />
      <a-table-column title="Uploaded" dataIndex="created_at">
        <template #default="{ record }">{{
          new Date(record.created_at).toLocaleDateString()
        }}</template>
      </a-table-column>
      <a-table-column title="Actions">
        <template #default="{ record }">
          <a-space>
            <a-button
              size="small"
              @click="handleReprocess(record.id)"
              :disabled="!['completed', 'failed'].includes(record.status)"
              >Reprocess</a-button
            >
            <a-button size="small" danger @click="handleDelete(record.id)">Delete</a-button>
          </a-space>
        </template>
      </a-table-column>
    </a-table>

    <!-- Upload modal -->
    <a-modal
      :open="isUploadVisible"
      title="Upload File"
      @cancel="isUploadVisible = false"
      :footer="null"
    >
      <a-upload :beforeUpload="handleUpload" :showUploadList="false">
        <a-button>Select File</a-button>
      </a-upload>
    </a-modal>

    <!-- Scrape URL modal -->
    <a-modal
      :open="isScrapeVisible"
      title="Scrape URL"
      @cancel="isScrapeVisible = false"
      :footer="null"
    >
      <a-form layout="vertical" @finish="({ url }) => handleScrape(url)">
        <a-form-item label="URL" name="url" :rules="[{ required: true, type: 'url' }]">
          <a-input placeholder="https://example.com/page" />
        </a-form-item>
        <a-button type="primary" html-type="submit" block>Scrape</a-button>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue"
import { useRoute } from "vue-router"
import { useDatasetsStore } from "../../stores/datasets.js"
import { useDatasetFiles } from "../../composables/useDatasetFiles.js"

const route = useRoute()
const workspaceId = route.params.workspaceId
const datasetId = route.params.datasetId

const datasetsStore = useDatasetsStore()
const dataset = ref(null)

const {
  files,
  loading,
  isUploadVisible,
  isScrapeVisible,
  fetchFiles,
  handleUpload,
  handleScrape,
  handleDelete,
  handleReprocess,
} = useDatasetFiles(workspaceId, datasetId)

const statusColor = (s) =>
  ({
    pending: "default",
    queued: "blue",
    processing: "orange",
    completed: "green",
    failed: "red",
    cancelled: "gray",
  })[s] || "default"

onMounted(async () => {
  dataset.value = await datasetsStore.fetchDataset(workspaceId, datasetId)
  await fetchFiles()
})
</script>
