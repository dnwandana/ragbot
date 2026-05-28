<script setup>
import { ref, reactive, watch, onMounted } from "vue"
import { useRoute } from "vue-router"
import { useDatasets } from "@/composables/useDatasets"
import { relativeTime } from "@/utils/time"

const route = useRoute()
const workspaceId = route.params.workspaceId

const {
  datasets,
  loading,
  isModalVisible,
  editingDataset,
  openCreateModal,
  openEditModal,
  closeModal,
  handleSubmit,
  handleDelete,
  nameRules,
  fetchDatasets,
} = useDatasets(workspaceId)

const viewMode = ref("cards")
const menuOpenId = ref(null)
const deleteTarget = ref(null)
const form = reactive({ name: "", description: "" })

onMounted(fetchDatasets)

// Sync form fields when the modal opens
watch(isModalVisible, (open) => {
  if (!open) return
  if (editingDataset.value) {
    form.name = editingDataset.value.name
    form.description = editingDataset.value.description ?? ""
  } else {
    form.name = ""
    form.description = ""
  }
})

/** @param {string} dateStr @returns {string} */
function shortDate(dateStr) {
  if (!dateStr) return ""
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

/** @param {object} ds */
function openDelete(ds) {
  menuOpenId.value = null
  deleteTarget.value = ds
}

async function confirmDelete() {
  await handleDelete(deleteTarget.value.id)
  deleteTarget.value = null
}
</script>

<template>
  <div class="page" @click="menuOpenId = null">
    <!-- Page head -->
    <div class="page-head">
      <div>
        <div class="page-title">Knowledge base</div>
        <div class="page-sub">Datasets for your agents to search.</div>
      </div>
      <div class="page-actions">
        <div class="view-toggle">
          <button
            class="view-btn"
            :class="{ active: viewMode === 'cards' }"
            @click="viewMode = 'cards'"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
            >
              <rect x="2" y="2" width="5" height="5" rx="1" />
              <rect x="9" y="2" width="5" height="5" rx="1" />
              <rect x="2" y="9" width="5" height="5" rx="1" />
              <rect x="9" y="9" width="5" height="5" rx="1" />
            </svg>
            Cards
          </button>
          <button
            class="view-btn"
            :class="{ active: viewMode === 'table' }"
            @click="viewMode = 'table'"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
            >
              <line x1="2" y1="4" x2="14" y2="4" />
              <line x1="2" y1="8" x2="14" y2="8" />
              <line x1="2" y1="12" x2="14" y2="12" />
            </svg>
            Table
          </button>
        </div>
        <button class="btn-primary" @click="openCreateModal">
          <svg
            width="11"
            height="11"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
          >
            <path d="M8 3v10M3 8h10" />
          </svg>
          New dataset
        </button>
      </div>
    </div>

    <!-- Skeleton loading -->
    <div v-if="loading && !datasets.length" class="ds-grid">
      <div v-for="n in 6" :key="n" class="ds-card ds-card--skel">
        <div class="card-body">
          <div class="skel" style="height: 13px; width: 65%; margin-bottom: 8px"></div>
          <div class="skel" style="height: 9px; width: 90%; margin-bottom: 5px"></div>
          <div class="skel" style="height: 9px; width: 70%; margin-bottom: 12px"></div>
          <div style="display: flex; gap: 12px">
            <div class="skel" style="height: 9px; width: 50px"></div>
            <div class="skel" style="height: 9px; width: 44px"></div>
          </div>
        </div>
        <div class="card-foot">
          <div class="skel" style="height: 9px; width: 72px"></div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else-if="!loading && !datasets.length" class="empty-wrap">
      <div class="empty">
        <svg
          viewBox="0 0 240 160"
          width="200"
          height="133"
          fill="none"
          stroke="var(--ink-3)"
          stroke-width="1.25"
          stroke-linecap="round"
          stroke-linejoin="round"
          style="margin-bottom: 20px"
        >
          <line x1="20" y1="125" x2="220" y2="125" stroke="var(--line)" />
          <line x1="20" y1="135" x2="220" y2="135" stroke="var(--line)" />
          <rect x="40" y="80" width="14" height="45" rx="1" />
          <rect x="54" y="70" width="11" height="55" rx="1" />
          <rect x="65" y="84" width="16" height="41" rx="1" />
          <rect x="81" y="76" width="12" height="49" rx="1" />
          <rect x="93" y="80" width="14" height="45" rx="1" />
          <path d="M120 122L120 110L140 105L160 110L160 122Z" />
          <line x1="140" y1="105" x2="140" y2="122" />
          <rect x="172" y="78" width="13" height="47" rx="1" />
          <rect x="185" y="82" width="11" height="43" rx="1" />
          <rect x="196" y="74" width="14" height="51" rx="1" />
          <circle cx="138" cy="58" r="22" stroke="var(--brand)" stroke-width="2" />
          <line x1="156" y1="76" x2="172" y2="92" stroke="var(--brand)" stroke-width="2" />
          <circle
            cx="138"
            cy="58"
            r="22"
            fill="var(--brand-tint)"
            fill-opacity="0.4"
            stroke="none"
          />
        </svg>
        <h2 class="empty-title">No datasets yet</h2>
        <p class="empty-body">
          Datasets group the documents your agents search. Create one for each corpus — a wiki, a
          contract set, a research collection.
        </p>
        <button class="btn-primary btn-lg" @click="openCreateModal">
          <svg
            width="13"
            height="13"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
          >
            <path d="M8 3v10M3 8h10" />
          </svg>
          Create your first dataset
        </button>
        <p class="empty-caption">Supports PDF, DOCX, Markdown, plain text, and web URLs.</p>
      </div>
    </div>

    <!-- Cards view -->
    <div v-else-if="viewMode === 'cards'" class="ds-grid">
      <div
        v-for="ds in datasets"
        :key="ds.id"
        class="ds-card"
        @click="$router.push(`/workspaces/${workspaceId}/datasets/${ds.id}`)"
      >
        <div class="card-body">
          <div class="card-top">
            <div class="card-name">{{ ds.name }}</div>
            <!-- ⋯ menu -->
            <div class="menu-wrap" @click.stop>
              <button
                class="menu-btn"
                @click="menuOpenId = menuOpenId === ds.id ? null : ds.id"
                aria-label="More options"
              >
                ···
              </button>
              <div v-if="menuOpenId === ds.id" class="menu-popup">
                <button
                  class="menu-item"
                  @click="openEditModal(ds); menuOpenId = null"
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.6"
                    stroke-linecap="round"
                  >
                    <path d="M11 2l3 3-8 8H3v-3z" />
                  </svg>
                  Edit
                </button>
                <button class="menu-item menu-item--danger" @click="openDelete(ds)">
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.6"
                    stroke-linecap="round"
                  >
                    <path d="M3 4h10M5 4V3h6v1M6 7v5M10 7v5M4 4l1 9h6l1-9" />
                  </svg>
                  Delete
                </button>
              </div>
            </div>
          </div>
          <p v-if="ds.description" class="card-desc">{{ ds.description }}</p>
          <div class="card-stats">
            <span
              ><strong>{{ ds.file_count ?? 0 }}</strong> files</span
            >
            <span v-if="ds.total_size_mb"
              ><strong>{{ Number(ds.total_size_mb).toFixed(0) }}</strong> MB</span
            >
          </div>
        </div>
        <div class="card-foot">
          <span class="foot-text">Created {{ shortDate(ds.created_at) }}</span>
          <span class="foot-text">Updated {{ relativeTime(ds.updated_at) }}</span>
        </div>
      </div>
    </div>

    <!-- Table view -->
    <div v-else class="ds-table">
      <div class="tbl-head tbl-cols">
        <div>Name</div>
        <div>Files</div>
        <div>Size</div>
        <div>Updated</div>
        <div></div>
      </div>
      <div
        v-for="ds in datasets"
        :key="ds.id"
        class="tbl-row tbl-cols"
        @click="$router.push(`/workspaces/${workspaceId}/datasets/${ds.id}`)"
      >
        <div>
          <div class="tbl-name">{{ ds.name }}</div>
          <div v-if="ds.description" class="tbl-desc">{{ ds.description }}</div>
        </div>
        <div class="tbl-mono">{{ ds.file_count ?? 0 }}</div>
        <div class="tbl-mono">
          {{ ds.total_size_mb ? `${Number(ds.total_size_mb).toFixed(0)} MB` : "—" }}
        </div>
        <div class="tbl-muted">{{ relativeTime(ds.updated_at) }}</div>
        <div @click.stop>
          <div class="menu-wrap">
            <button
              class="menu-btn"
              @click="menuOpenId = menuOpenId === ds.id ? null : ds.id"
              aria-label="More options"
            >
              ···
            </button>
            <div v-if="menuOpenId === ds.id" class="menu-popup menu-popup--left">
              <button
                class="menu-item"
                @click="openEditModal(ds); menuOpenId = null"
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                >
                  <path d="M11 2l3 3-8 8H3v-3z" />
                </svg>
                Edit
              </button>
              <button class="menu-item menu-item--danger" @click="openDelete(ds)">
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                >
                  <path d="M3 4h10M5 4V3h6v1M6 7v5M10 7v5M4 4l1 9h6l1-9" />
                </svg>
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create / Edit modal -->
    <a-modal
      :open="isModalVisible"
      :title="editingDataset ? 'Edit dataset' : 'New dataset'"
      :footer="null"
      :width="480"
      @cancel="closeModal"
    >
      <a-form layout="vertical" @finish="handleSubmit(form)" style="margin-top: 8px">
        <a-form-item label="Name" name="name" :rules="nameRules">
          <a-input v-model:value="form.name" placeholder="e.g. Engineering wiki" />
        </a-form-item>
        <a-form-item label="Description">
          <a-textarea
            v-model:value="form.description"
            :rows="3"
            placeholder="Optional description"
          />
        </a-form-item>
        <button type="submit" class="btn-primary btn-block">
          {{ editingDataset ? "Save changes" : "Create dataset" }}
        </button>
      </a-form>
    </a-modal>

    <!-- Delete confirm modal -->
    <a-modal
      :open="!!deleteTarget"
      title="Delete dataset?"
      ok-text="Delete"
      ok-type="danger"
      cancel-text="Cancel"
      @ok="confirmDelete"
      @cancel="deleteTarget = null"
    >
      <p style="margin: 8px 0">
        All files and indexed data in <strong>{{ deleteTarget?.name }}</strong> will be permanently
        removed.
      </p>
    </a-modal>
  </div>
</template>

<style scoped>
.page {
  padding: 20px 24px;
}

.page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 20px;
  gap: 12px;
  flex-wrap: wrap;
}
.page-title {
  font-size: var(--t-lg);
  font-weight: 600;
  letter-spacing: -0.015em;
  color: var(--ink);
}
.page-sub {
  font-size: var(--t-sm);
  color: var(--ink-3);
  margin-top: 2px;
}
.page-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  background: var(--brand);
  color: #fff;
  border: none;
  border-radius: var(--r-sm);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
}
.btn-primary:hover {
  background: var(--brand-2);
}
.btn-lg {
  padding: 9px 16px;
  font-size: 13.5px;
}
.btn-block {
  width: 100%;
  justify-content: center;
  margin-top: 16px;
  padding: 10px;
}

.view-toggle {
  display: flex;
  border: 1px solid var(--line-2);
  border-radius: var(--r-sm);
  overflow: hidden;
}
.view-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border: none;
  background: transparent;
  color: var(--ink-3);
  font-size: 12px;
  cursor: pointer;
}
.view-btn.active {
  background: var(--bg-2);
  color: var(--ink);
}

/* Cards */
.ds-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(272px, 1fr));
  gap: 14px;
}
.ds-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  box-shadow: var(--shadow-1);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  transition:
    box-shadow var(--dur) var(--ease),
    border-color var(--dur) var(--ease);
}
.ds-card:hover {
  box-shadow: var(--shadow-2);
  border-color: var(--line-2);
}
.ds-card--skel {
  cursor: default;
  pointer-events: none;
}
.card-body {
  padding: 16px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}
.card-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
  line-height: 1.3;
}
.card-desc {
  font-size: 12.5px;
  color: var(--ink-3);
  line-height: 1.5;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.card-stats {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--ink-3);
  margin-top: 4px;
}
.card-stats strong {
  color: var(--ink-2);
  font-weight: 600;
}
.card-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 9px 14px;
  border-top: 1px solid var(--line);
}
.foot-text {
  font-size: 11.5px;
  color: var(--ink-4);
}

/* Table */
.ds-table {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  overflow: hidden;
}
.tbl-cols {
  display: grid;
  grid-template-columns: 1fr 80px 100px 120px 40px;
  gap: 12px;
  align-items: center;
}
.tbl-head {
  padding: 10px 18px;
  background: var(--bg);
  border-bottom: 1px solid var(--line);
  font-size: 10.5px;
  font-weight: 600;
  color: var(--ink-3);
  text-transform: uppercase;
  letter-spacing: 0.07em;
}
.tbl-row {
  padding: 11px 18px;
  border-top: 1px solid var(--line);
  cursor: pointer;
}
.tbl-row:hover {
  background: var(--bg);
}
.tbl-name {
  font-size: 13.5px;
  font-weight: 500;
  color: var(--ink);
}
.tbl-desc {
  font-size: 12px;
  color: var(--ink-4);
}
.tbl-mono {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--ink-2);
}
.tbl-muted {
  font-size: 12.5px;
  color: var(--ink-4);
}

/* Menu */
.menu-wrap {
  position: relative;
}
.menu-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: var(--r-sm);
  color: var(--ink-4);
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  line-height: 1;
}
.menu-btn:hover {
  background: var(--bg-2);
  color: var(--ink);
}
.menu-popup {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  background: var(--surface);
  border: 1px solid var(--line-2);
  border-radius: var(--r);
  box-shadow: var(--shadow-2);
  min-width: 130px;
  padding: 4px;
  z-index: 20;
}
.menu-popup--left {
  right: auto;
  left: 0;
}
.menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 7px 10px;
  border: none;
  background: transparent;
  border-radius: var(--r-sm);
  font-size: 13px;
  color: var(--ink-2);
  cursor: pointer;
  text-align: left;
}
.menu-item:hover {
  background: var(--bg-2);
}
.menu-item--danger {
  color: var(--err);
}
.menu-item--danger:hover {
  background: var(--err-bg);
}

/* Skeleton */
@keyframes shimmer {
  0% {
    background-position: -400px 0;
  }
  100% {
    background-position: 400px 0;
  }
}
.skel {
  border-radius: 4px;
  background: linear-gradient(90deg, var(--bg-2) 25%, var(--surface) 50%, var(--bg-2) 75%);
  background-size: 400px 100%;
  animation: shimmer 1.4s ease-in-out infinite;
}

/* Empty */
.empty-wrap {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  padding: 0;
}
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 24px;
  text-align: center;
}
.empty-title {
  font-size: 18px;
  font-weight: 600;
  letter-spacing: -0.015em;
  color: var(--ink);
  margin: 0 0 8px;
}
.empty-body {
  font-size: 13.5px;
  color: var(--ink-3);
  max-width: 360px;
  margin: 0 0 20px;
  line-height: 1.55;
}
.empty-caption {
  font-size: 12px;
  color: var(--ink-4);
  margin: 16px 0 0;
}
</style>
