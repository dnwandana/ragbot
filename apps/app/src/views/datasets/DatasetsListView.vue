<template>
  <div style="padding: 24px">
    <div style="display: flex; justify-content: space-between; margin-bottom: 16px">
      <h1>Datasets</h1>
      <a-button type="primary" @click="openCreateModal">+ New Dataset</a-button>
    </div>

    <a-spin :spinning="loading">
      <a-empty
        v-if="!datasets.length"
        description="No datasets yet. Create your first knowledge base!"
      />
      <a-row :gutter="[16, 16]" v-else>
        <a-col v-for="ds in datasets" :key="ds.id" :xs="24" :sm="12" :md="8">
          <a-card hoverable @click="$router.push(`/workspaces/${workspaceId}/datasets/${ds.id}`)">
            <template #title>{{ ds.name }}</template>
            <p v-if="ds.description" style="margin: 0; color: #666">{{ ds.description }}</p>
            <template #extra>
              <a-button type="text" danger size="small" @click.stop="handleDelete(ds.id)"
                >Delete</a-button
              >
            </template>
          </a-card>
        </a-col>
      </a-row>
    </a-spin>

    <a-modal :open="isModalVisible" title="New Dataset" @cancel="closeModal" :footer="null">
      <a-form :model="form" layout="vertical" @finish="handleSubmit(form)">
        <a-form-item label="Name" name="name" :rules="nameRules">
          <a-input v-model:value="form.name" />
        </a-form-item>
        <a-form-item label="Description">
          <a-textarea v-model:value="form.description" :rows="3" />
        </a-form-item>
        <a-collapse>
          <a-collapse-panel key="advanced" header="Advanced Settings">
            <a-form-item label="Embedding Model">
              <a-input v-model:value="form.embedding_model" />
            </a-form-item>
            <a-form-item label="Chunk Size">
              <a-input-number
                v-model:value="form.chunk_size"
                :min="256"
                :max="8192"
                style="width: 100%"
              />
            </a-form-item>
            <a-form-item label="Chunk Overlap">
              <a-input-number
                v-model:value="form.chunk_overlap"
                :min="0"
                :max="2048"
                style="width: 100%"
              />
            </a-form-item>
          </a-collapse-panel>
        </a-collapse>
        <a-button type="primary" html-type="submit" block style="margin-top: 16px"
          >Create Dataset</a-button
        >
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { reactive, onMounted } from "vue"
import { useRoute } from "vue-router"
import { useDatasets } from "../../composables/useDatasets.js"

const route = useRoute()
const workspaceId = route.params.workspaceId

const {
  datasets,
  loading,
  isModalVisible,
  nameRules,
  openCreateModal,
  closeModal,
  handleSubmit,
  handleDelete,
  fetchDatasets,
} = useDatasets(workspaceId)

const form = reactive({
  name: "",
  description: "",
  embedding_model: "openai/text-embedding-3-small",
  chunk_size: 1024,
  chunk_overlap: 200,
})

onMounted(fetchDatasets)
</script>
