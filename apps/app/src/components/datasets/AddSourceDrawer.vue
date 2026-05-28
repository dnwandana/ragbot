<script setup>
import { ref } from "vue"
import { useDatasetFilesStore } from "@/stores/datasetFiles"
import { humanSize } from "@/utils/files"

const props = defineProps({
  open: { type: Boolean, default: false },
  workspaceId: { type: String, required: true },
  datasetId: { type: String, required: true },
})

const emit = defineEmits(["close", "uploaded", "scraped"])

const store = useDatasetFilesStore()
const activeTab = ref("upload")
const isDragOver = ref(false)
const uploadItems = ref([]) // { id, name, size, status: 'uploading'|'done'|'failed', error }
const urlInput = ref("")
const urlError = ref("")
const urlLoading = ref(false)

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

async function submitUrl() {
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
  try {
    await store.scrapeUrl(props.workspaceId, props.datasetId, raw)
    emit("scraped", raw)
    urlInput.value = ""
  } catch (err) {
    urlError.value = err?.response?.data?.message || "Failed to add URL"
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
  <Teleport to="body">
    <Transition name="scrim">
      <div v-if="open" class="scrim" @click="onClose" />
    </Transition>
    <Transition name="drawer">
      <div v-if="open" class="drawer" role="dialog" aria-modal="true" aria-label="Add source">
        <!-- Header -->
        <div class="drawer-head">
          <span class="drawer-title">Add source</span>
          <button class="icon-btn" @click="onClose" aria-label="Close">
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
            >
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>

        <!-- Tabs -->
        <div class="tabs">
          <button
            class="tab"
            :class="{ active: activeTab === 'upload' }"
            @click="activeTab = 'upload'"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
            >
              <path d="M8 12V4M4 8l4-4 4 4" />
            </svg>
            Upload files
          </button>
          <button class="tab" :class="{ active: activeTab === 'url' }" @click="activeTab = 'url'">
            <svg
              width="12"
              height="12"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
            >
              <path d="M10 8a2 2 0 11-4 0 2 2 0 014 0z" />
              <path d="M6.5 5.5a4.5 4.5 0 100 5" />
            </svg>
            Web URL
          </button>
        </div>

        <!-- Upload tab -->
        <div v-if="activeTab === 'upload'" class="drawer-body">
          <div
            class="drop-zone"
            :class="{ 'drop-zone--over': isDragOver }"
            @dragover.prevent="isDragOver = true"
            @dragleave="isDragOver = false"
            @drop="onDrop"
          >
            <div class="drop-icon">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              >
                <path d="M12 15V3M8 7l4-4 4 4" />
                <path d="M20 15v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4" />
              </svg>
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
              <svg
                width="13"
                height="13"
                viewBox="0 0 16 16"
                fill="none"
                stroke="var(--ink-3)"
                stroke-width="1.5"
                stroke-linecap="round"
              >
                <rect x="3" y="2" width="10" height="12" rx="1" />
                <line x1="6" y1="6" x2="10" y2="6" />
                <line x1="6" y1="9" x2="10" y2="9" />
              </svg>
              <div class="upload-info">
                <span class="upload-name">{{ item.name }}</span>
                <span v-if="item.error" class="upload-error">{{ item.error }}</span>
              </div>
              <span class="upload-size">{{ item.size }}</span>
              <svg
                v-if="item.status === 'done'"
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                stroke="var(--ok)"
                stroke-width="2"
                stroke-linecap="round"
              >
                <polyline points="3 8 6 11 13 4" />
              </svg>
              <svg
                v-else-if="item.status === 'failed'"
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                stroke="var(--err)"
                stroke-width="2"
                stroke-linecap="round"
              >
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
              <span v-else class="upload-spinner" />
            </div>
          </div>
        </div>

        <!-- URL tab -->
        <div v-if="activeTab === 'url'" class="drawer-body">
          <p class="url-hint">Scrape a public web page and index its content.</p>
          <div class="url-field">
            <input
              v-model="urlInput"
              class="url-input"
              placeholder="https://…"
              @keydown.enter="submitUrl"
            />
            <p v-if="urlError" class="url-error">{{ urlError }}</p>
          </div>
          <button class="btn-primary" :disabled="urlLoading || !urlInput.trim()" @click="submitUrl">
            {{ urlLoading ? "Adding…" : "Add URL" }}
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.scrim {
  position: fixed;
  inset: 0;
  background: rgba(24, 18, 12, 0.25);
  z-index: 40;
}
.drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 360px;
  background: var(--surface);
  border-left: 1px solid var(--line-2);
  box-shadow: var(--shadow-3);
  z-index: 41;
  display: flex;
  flex-direction: column;
}
/* Transitions */
.scrim-enter-active,
.scrim-leave-active {
  transition: opacity 200ms var(--ease);
}
.scrim-enter-from,
.scrim-leave-to {
  opacity: 0;
}
.drawer-enter-active,
.drawer-leave-active {
  transition: transform 220ms var(--ease);
}
.drawer-enter-from,
.drawer-leave-to {
  transform: translateX(100%);
}

.drawer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
}
.drawer-title {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--ink);
}
.icon-btn {
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
.icon-btn:hover {
  background: var(--bg-2);
  color: var(--ink);
}

.tabs {
  display: flex;
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
}
.tab {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 12px;
  border: none;
  background: transparent;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--ink-3);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: color var(--dur) var(--ease);
}
.tab.active {
  color: var(--brand);
  border-bottom-color: var(--brand);
}

.drawer-body {
  padding: 16px;
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.drop-zone {
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
.drop-zone--over {
  border-color: var(--brand);
  background: var(--brand-tint);
}
.drop-icon {
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
.drop-text {
  font-size: 13px;
  font-weight: 500;
  color: var(--ink-2);
  margin: 0;
}
.drop-sub {
  font-size: 12px;
  color: var(--ink-4);
  margin: 0;
}

.btn-secondary {
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
.btn-secondary:hover {
  background: var(--bg-2);
}

.upload-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.upload-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
}
.upload-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.upload-name {
  font-size: 12.5px;
  color: var(--ink-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.upload-error {
  font-size: 11px;
  color: var(--err);
}
.upload-size {
  font-size: 11px;
  color: var(--ink-4);
  flex-shrink: 0;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.upload-spinner {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid var(--line-2);
  border-top-color: var(--brand);
  animation: spin 0.8s linear infinite;
  flex-shrink: 0;
}

.url-hint {
  font-size: 12.5px;
  color: var(--ink-3);
  margin: 0;
  line-height: 1.5;
}
.url-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.url-input {
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
.url-input:focus {
  border-color: var(--brand);
}
.url-error {
  font-size: 12px;
  color: var(--err);
  margin: 0;
}
.btn-primary {
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
.btn-primary:hover:not(:disabled) {
  background: var(--brand-2);
}
.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
