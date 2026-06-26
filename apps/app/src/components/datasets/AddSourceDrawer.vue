<script setup>
import { ref, computed } from "vue"
import { Check, CloudUpload, FileText, Link2, Upload, X } from "lucide-vue-next"
import { useDatasetFilesStore } from "@/stores/datasetFiles"
import { humanSize } from "@/utils/files"
import { SOURCE_DETECTORS, detectSource } from "@/components/datasets/sourceDetectors"

const props = defineProps({
  open: { type: Boolean, default: false },
  workspaceId: { type: String, required: true },
  datasetId: { type: String, required: true },
})

const emit = defineEmits(["close", "uploaded", "scraped", "youtube"])

const store = useDatasetFilesStore()
const activeTab = ref("upload")
const isDragOver = ref(false)
const uploadItems = ref([]) // { id, name, size, status: 'uploading'|'done'|'failed', error }
const urlInput = ref("")
const urlError = ref("")
const urlLoading = ref(false)

/**
 * Per-source submit dispatch keyed by detector key. Each entry calls the right
 * store action and names the event the drawer emits so the parent refreshes.
 */
const SOURCE_ACTIONS = {
  youtube: {
    call: (url) => store.addYouTube(props.workspaceId, props.datasetId, url),
    event: "youtube",
  },
  web: {
    call: (url) => store.scrapeUrl(props.workspaceId, props.datasetId, url),
    event: "scraped",
  },
}

/** The detector for the current input, or null until the input is a valid http(s) URL. */
const detected = computed(() => {
  const raw = urlInput.value.trim()
  if (!/^https?:\/\//i.test(raw)) return null
  return detectSource(raw)
})

/** @param {FileList|File[]} fileList */
async function processFiles(fileList) {
  const files = Array.from(fileList)
  const entries = files.map((f) => ({
    id: Math.random().toString(36).slice(2),
    file: f,
    name: f.name,
    size: humanSize(f.size),
    status: "uploading",
    error: null,
  }))
  uploadItems.value = [...uploadItems.value, ...entries]

  let succeeded = 0
  for (const entry of entries) {
    try {
      await store.uploadFile(props.workspaceId, props.datasetId, entry.file)
      const i = uploadItems.value.findIndex((x) => x.id === entry.id)
      if (i !== -1) uploadItems.value[i] = { ...uploadItems.value[i], status: "done" }
      succeeded++
    } catch (err) {
      const i = uploadItems.value.findIndex((x) => x.id === entry.id)
      const msg = err?.response?.data?.message || "Upload failed"
      if (i !== -1) uploadItems.value[i] = { ...uploadItems.value[i], status: "failed", error: msg }
    }
  }
  if (succeeded > 0) emit("uploaded")
}

function onDrop(e) {
  e.preventDefault()
  isDragOver.value = false
  processFiles(e.dataTransfer.files)
}

function onFileInput(e) {
  processFiles(e.target.files)
  e.target.value = ""
}

async function submitLink() {
  const raw = urlInput.value.trim()
  if (!raw) {
    urlError.value = "Enter a URL."
    return
  }
  if (!/^https?:\/\//i.test(raw)) {
    urlError.value = "URL must start with http:// or https://"
    return
  }
  urlError.value = ""
  urlLoading.value = true
  // Fall back to the web action so adding a detector without a matching
  // SOURCE_ACTIONS entry degrades to scraping instead of crashing.
  const action = SOURCE_ACTIONS[detectSource(raw).key] ?? SOURCE_ACTIONS.web
  try {
    await action.call(raw)
    emit(action.event, raw)
    urlInput.value = ""
  } catch (err) {
    urlError.value = err?.response?.data?.message || "Failed to add source"
  } finally {
    urlLoading.value = false
  }
}

function onClose() {
  uploadItems.value = []
  urlInput.value = ""
  urlError.value = ""
  activeTab.value = "upload"
  emit("close")
}
</script>

<template>
  <a-drawer
    :open="open"
    placement="right"
    :width="360"
    :closable="false"
    :mask="true"
    root-class-name="add-source-drawer-root"
    :body-style="{ padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }"
    :header-style="{ display: 'none' }"
    @close="onClose"
  >
    <div class="drawer" role="dialog" aria-modal="true" aria-label="Add source">
      <!-- Header -->
      <div class="drawer-head">
        <span class="drawer-title">Add source</span>
        <button class="icon-btn" @click="onClose" aria-label="Close">
          <X :size="14" :stroke-width="1.8" />
        </button>
      </div>

      <!-- Tabs -->
      <a-tabs v-model:active-key="activeTab" class="source-tabs">
        <!-- Upload files tab -->
        <a-tab-pane key="upload">
          <template #tab>
            <span class="tab-label">
              <Upload :size="12" :stroke-width="1.8" />
              Upload files
            </span>
          </template>
          <div class="drawer-body">
            <div
              class="drop-zone"
              :class="{ 'drop-zone--over': isDragOver }"
              @dragover.prevent="isDragOver = true"
              @dragleave="isDragOver = false"
              @drop="onDrop"
            >
              <div class="drop-icon">
                <CloudUpload :size="20" :stroke-width="1.5" />
              </div>
              <p class="drop-text">Drop files here</p>
              <p class="drop-sub">PDF, DOCX, Markdown, plain text</p>
              <label class="btn-secondary" style="margin-top: 6px; cursor: pointer">
                Choose files
                <input
                  type="file"
                  accept=".pdf,.docx,.doc,.md,.txt"
                  multiple
                  style="display: none"
                  @change="onFileInput"
                />
              </label>
            </div>

            <div v-if="uploadItems.length" class="upload-list">
              <div v-for="item in uploadItems" :key="item.id" class="upload-row">
                <FileText :size="13" :stroke-width="1.5" class="upload-file-icon" />
                <div class="upload-info">
                  <span class="upload-name">{{ item.name }}</span>
                  <span v-if="item.error" class="upload-error">{{ item.error }}</span>
                </div>
                <span class="upload-size">{{ item.size }}</span>
                <Check
                  v-if="item.status === 'done'"
                  :size="14"
                  :stroke-width="2"
                  class="status-ok"
                />
                <X
                  v-else-if="item.status === 'failed'"
                  :size="14"
                  :stroke-width="2"
                  class="status-err"
                />
                <span v-else class="upload-spinner" />
              </div>
            </div>
          </div>
        </a-tab-pane>

        <!-- Link tab (web page or YouTube, auto-detected) -->
        <a-tab-pane key="url">
          <template #tab>
            <span class="tab-label">
              <Link2 :size="12" :stroke-width="1.8" />
              Link
            </span>
          </template>
          <div class="drawer-body">
            <p class="url-hint">Paste a web page or YouTube link.</p>

            <div v-if="!detected" class="supported-row">
              <span class="supported-label">Works with:</span>
              <span v-for="d in SOURCE_DETECTORS" :key="d.key" class="supported-item">
                <component :is="d.icon" :size="13" :stroke-width="1.8" />
                {{ d.label }}
              </span>
            </div>

            <div class="url-field">
              <input
                v-model="urlInput"
                class="url-input"
                aria-label="Source URL"
                placeholder="https://…"
                @keydown.enter="submitLink"
              />
              <p v-if="urlError" class="url-error">{{ urlError }}</p>
            </div>

            <div v-if="detected" class="source-cue" :class="detected.cueClass">
              <component :is="detected.icon" :size="14" :stroke-width="1.8" />
              <span>{{ detected.cue }}</span>
            </div>

            <button
              class="btn-primary"
              :disabled="urlLoading || !urlInput.trim()"
              @click="submitLink"
            >
              {{ urlLoading ? "Adding…" : "Add source" }}
            </button>
          </div>
        </a-tab-pane>
      </a-tabs>
    </div>
  </a-drawer>
</template>

<style>
.add-source-drawer-root .drawer {
  height: 100%;
  background: var(--surface);
  border-left: 1px solid var(--line-2);
  box-shadow: var(--shadow-3);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.add-source-drawer-root .drawer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
}

.add-source-drawer-root .drawer-title {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--ink);
}

.add-source-drawer-root .icon-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--ink-3);
  border-radius: var(--r-sm);
  cursor: pointer;
}

.add-source-drawer-root .icon-btn:hover {
  background: var(--bg-2);
  color: var(--ink);
}

/* a-tabs override — match original custom switcher look */
.add-source-drawer-root .source-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

.add-source-drawer-root .source-tabs .ant-tabs-nav {
  margin: 0;
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
}

.add-source-drawer-root .source-tabs .ant-tabs-nav::before {
  display: none;
}

.add-source-drawer-root .source-tabs .ant-tabs-tab {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 12px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--ink-3);
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: color var(--dur) var(--ease);
  margin: 0;
}

.add-source-drawer-root .source-tabs .ant-tabs-tab:hover {
  color: var(--ink-2);
}

.add-source-drawer-root .source-tabs .ant-tabs-tab-active {
  color: var(--brand) !important;
}

.add-source-drawer-root .source-tabs .ant-tabs-tab-btn {
  color: inherit;
}

.add-source-drawer-root .source-tabs .ant-tabs-ink-bar {
  background: var(--brand);
  height: 2px;
}

.add-source-drawer-root .source-tabs .ant-tabs-nav-list {
  display: flex;
  width: 100%;
}

.add-source-drawer-root .source-tabs .ant-tabs-content-holder {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.add-source-drawer-root .source-tabs .ant-tabs-content {
  height: 100%;
}

.add-source-drawer-root .source-tabs .ant-tabs-tabpane {
  height: 100%;
}

.add-source-drawer-root .tab-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.add-source-drawer-root .drawer-body {
  padding: 16px;
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.add-source-drawer-root .drop-zone {
  border: 1.5px dashed var(--line-2);
  border-radius: var(--r);
  padding: 28px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  text-align: center;
  transition:
    border-color var(--dur) var(--ease),
    background var(--dur) var(--ease);
}

.add-source-drawer-root .drop-zone--over {
  border-color: var(--brand);
  background: var(--brand-tint);
}

.add-source-drawer-root .drop-icon {
  width: 40px;
  height: 40px;
  background: var(--bg-2);
  border-radius: var(--r);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ink-3);
  margin-bottom: 6px;
}

.add-source-drawer-root .drop-text {
  font-size: 13px;
  font-weight: 500;
  color: var(--ink-2);
  margin: 0;
}

.add-source-drawer-root .drop-sub {
  font-size: 12px;
  color: var(--ink-4);
  margin: 0;
}

.add-source-drawer-root .btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--surface);
  color: var(--ink-2);
  border: 1px solid var(--line-2);
  border-radius: var(--r-sm);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
}

.add-source-drawer-root .btn-secondary:hover {
  background: var(--bg-2);
}

.add-source-drawer-root .upload-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.add-source-drawer-root .upload-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
}

.add-source-drawer-root .upload-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.add-source-drawer-root .upload-name {
  font-size: 12.5px;
  color: var(--ink-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.add-source-drawer-root .upload-error {
  font-size: 11px;
  color: var(--err);
}

.add-source-drawer-root .upload-size {
  font-size: 11px;
  color: var(--ink-4);
  flex-shrink: 0;
}

.add-source-drawer-root .upload-file-icon {
  color: var(--ink-3);
  flex-shrink: 0;
}

.add-source-drawer-root .status-ok {
  color: var(--ok);
  flex-shrink: 0;
}

.add-source-drawer-root .status-err {
  color: var(--err);
  flex-shrink: 0;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.add-source-drawer-root .upload-spinner {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid var(--line-2);
  border-top-color: var(--brand);
  animation: spin 0.8s linear infinite;
  flex-shrink: 0;
}

.add-source-drawer-root .url-hint {
  font-size: 12.5px;
  color: var(--ink-3);
  margin: 0;
  line-height: 1.5;
}

.add-source-drawer-root .url-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.add-source-drawer-root .url-input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--line-2);
  border-radius: var(--r-sm);
  background: var(--surface);
  color: var(--ink);
  font-size: 13px;
  outline: none;
  transition: border-color var(--dur) var(--ease);
}

.add-source-drawer-root .url-input:focus {
  border-color: var(--brand);
}

.add-source-drawer-root .url-error {
  font-size: 12px;
  color: var(--err);
  margin: 0;
}

.add-source-drawer-root .btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 14px;
  background: var(--brand);
  color: #fff;
  border: none;
  border-radius: var(--r-sm);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  transition: background var(--dur) var(--ease);
}

.add-source-drawer-root .btn-primary:hover:not(:disabled) {
  background: var(--brand-2);
}

.add-source-drawer-root .btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.add-source-drawer-root .supported-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 11.5px;
  color: var(--ink-4);
}

.add-source-drawer-root .supported-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.add-source-drawer-root .source-cue {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 11.5px;
  line-height: 1.4;
  padding: 8px 10px;
  border-radius: var(--r-sm);
  border: 1px solid var(--line-2);
}

.add-source-drawer-root .source-cue span {
  min-width: 0;
}

.add-source-drawer-root .source-cue--youtube {
  color: #c4302b;
  background: rgba(196, 48, 43, 0.08);
  border-color: rgba(196, 48, 43, 0.2);
}

.add-source-drawer-root .source-cue--youtube svg {
  color: #c4302b;
  flex-shrink: 0;
}

.add-source-drawer-root .source-cue--web {
  color: var(--ink-2);
  background: var(--bg-2);
  border-color: var(--line-2);
}

.add-source-drawer-root .source-cue--web svg {
  color: var(--ink-3);
  flex-shrink: 0;
}
</style>
