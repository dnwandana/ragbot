<script setup>
import { ref, computed } from "vue"
import {
  Database,
  Upload,
  Link,
  FileText,
  X,
  ArrowLeft,
  ArrowRight,
  LoaderCircle,
  CircleAlert,
} from "lucide-vue-next"

const props = defineProps({
  ctx: { type: Object, required: true },
  datasetName: { type: String, default: "" },
  datasetDescription: { type: String, default: "" },
  files: { type: Array, default: () => [] },
})
const emit = defineEmits(["update:datasetName", "update:datasetDescription", "update:files"])
const ctx = props.ctx

const phase = ref(props.files.length > 0 ? "files" : "name")
const urlVal = ref("")
const urlErr = ref(null)
const dragging = ref(false)
const fileInputRef = ref(null)
let fileSeq = 0

const ALLOWED_EXT = ["pdf", "doc", "docx", "txt", "md", "csv", "html", "json", "rtf"]
const MAX_MB = 25

/**
 * @param {string} name
 * @returns {string}
 */
function extOf(name) {
  return (name.split(".").pop() ?? "").toLowerCase()
}

/**
 * @param {number} bytes
 * @returns {string}
 */
function fmtSize(bytes) {
  return bytes >= 1048576
    ? (bytes / 1048576).toFixed(1) + " MB"
    : Math.max(1, Math.round(bytes / 1024)) + " KB"
}

/**
 * @param {File[]} list
 */
function addFiles(list) {
  const entries = list.map((f) => {
    const id = `f${++fileSeq}`
    const ext = extOf(f.name)
    if (!ALLOWED_EXT.includes(ext)) {
      return {
        id,
        name: f.name,
        size: f.size,
        status: "error",
        type: "file",
        raw: null,
        error: `.${ext} files aren't supported`,
      }
    }
    if (f.size > MAX_MB * 1048576) {
      return {
        id,
        name: f.name,
        size: f.size,
        status: "error",
        type: "file",
        raw: null,
        error: `Over the ${MAX_MB} MB limit`,
      }
    }
    return { id, name: f.name, size: f.size, status: "ready", type: "file", raw: f }
  })
  emit("update:files", [...props.files, ...entries])
}

/**
 * @param {DragEvent} e
 */
function onDrop(e) {
  e.preventDefault()
  dragging.value = false
  const list = [...(e.dataTransfer?.files ?? [])]
  if (list.length) addFiles(list)
}

/**
 * @param {Event} e
 */
function onPick(e) {
  const list = [...(e.target.files ?? [])]
  if (list.length) addFiles(list)
  e.target.value = ""
}

/**
 * @param {string} id
 */
function removeFile(id) {
  emit(
    "update:files",
    props.files.filter((f) => f.id !== id),
  )
}

function addUrl() {
  const v = urlVal.value.trim()
  if (!v) return
  const ok = /^https?:\/\/[^\s.]+\.[^\s]{2,}/.test(v) || /^[^\s.]+\.[^\s]{2,}/.test(v)
  if (!ok) {
    urlErr.value = "Enter a valid URL, like https://acme.com/docs"
    return
  }
  const url = v.startsWith("http") ? v : `https://${v}`
  emit("update:files", [
    ...props.files,
    { id: `f${++fileSeq}`, name: url, status: "ready", type: "url", raw: null },
  ])
  urlVal.value = ""
  urlErr.value = null
}

const readyCount = computed(
  () => props.files.filter((f) => f.status === "ready" || f.status === "done").length,
)
</script>

<template>
  <!-- Phase A: Name the dataset -->
  <template v-if="phase === 'name'">
    <div class="ob-head">
      <div class="ob-head-icon"><Database :size="16" /></div>
      <div class="ob-eyebrow">Step 3 · Optional</div>
      <h1 class="ob-title">Add a knowledge source</h1>
      <p class="ob-subtitle">
        Group related documents into a dataset. Your agent searches and cites across it.
      </p>
    </div>
    <div class="ob-body-inner">
      <div class="ob-substep"><span class="ob-sub-badge">A</span> Name your dataset</div>
      <div class="ob-field">
        <label class="ob-label" for="ds-name">Dataset name</label>
        <input
          id="ds-name"
          class="ob-input"
          :value="props.datasetName"
          placeholder="Company knowledge"
          autofocus
          @input="(e) => emit('update:datasetName', e.target.value)"
          @keydown.enter="props.datasetName.trim() && (phase = 'files')"
        />
        <div class="ob-hint">A clear label you'll recognise later — e.g. "HR policies".</div>
      </div>
      <div class="ob-field">
        <label class="ob-label" for="ds-desc">Description</label>
        <textarea
          id="ds-desc"
          class="ob-input"
          rows="3"
          maxlength="1000"
          :value="props.datasetDescription"
          placeholder="What's in this dataset? (optional)"
          @input="emit('update:datasetDescription', $event.target.value)"
        />
      </div>
    </div>
    <div class="ob-actions">
      <div class="ob-actions-left">
        <button class="ob-btn ob-btn-ghost" @click="ctx.back()">
          <ArrowLeft :size="16" /> Back
        </button>
      </div>
      <div class="ob-actions-right">
        <button class="ob-btn ob-btn-secondary" @click="ctx.skip()">Skip for now</button>
        <button
          class="ob-btn ob-btn-primary"
          :disabled="!props.datasetName.trim()"
          @click="phase = 'files'"
        >
          Continue <ArrowRight :size="16" />
        </button>
      </div>
    </div>
  </template>

  <!-- Phase B: Upload files / add URLs -->
  <template v-else>
    <div class="ob-head">
      <div class="ob-head-icon"><Database :size="16" /></div>
      <div class="ob-eyebrow">Step 3 · Optional</div>
      <h1 class="ob-title">Add files to your dataset</h1>
      <p class="ob-subtitle">
        Uploading to
        <strong style="color: var(--ink); font-weight: 600">{{
          props.datasetName || "your dataset"
        }}</strong
        >. Drag files in, browse, or add a link.
      </p>
    </div>
    <div class="ob-body-inner">
      <div class="ob-substep"><span class="ob-sub-badge">B</span> Upload files or add a URL</div>

      <div
        class="ob-dropzone"
        :class="{ 'is-drag': dragging }"
        @dragover.prevent="dragging = true"
        @dragleave="dragging = false"
        @drop="onDrop"
        @click="fileInputRef?.click()"
      >
        <input ref="fileInputRef" type="file" multiple class="ob-file-input" @change="onPick" />
        <div class="ob-drop-icon"><Upload :size="22" /></div>
        <div class="ob-drop-title">
          Drag &amp; drop files here, or <span class="ob-link">browse</span>
        </div>
        <div class="ob-drop-hint">
          {{
            ALLOWED_EXT.slice(0, 6)
              .map((e) => "." + e)
              .join("  ·  ")
          }}
          · up to {{ MAX_MB }} MB each
        </div>
      </div>

      <div class="ob-or"><span>or</span></div>

      <div class="ob-field">
        <div v-if="urlErr" class="ob-error-text"><CircleAlert :size="16" /> {{ urlErr }}</div>
        <div class="ob-invite-row">
          <div class="ob-input-wrap has-prefix" style="flex: 1">
            <span class="ob-input-prefix"><Link :size="16" /></span>
            <input
              class="ob-input"
              :class="{ 'is-error': urlErr }"
              v-model="urlVal"
              placeholder="https://acme.com/docs"
              @keydown.enter.prevent="addUrl"
              @input="urlErr = null"
            />
          </div>
          <button class="ob-btn ob-btn-secondary" @click="addUrl">Add URL</button>
        </div>
      </div>

      <div v-if="props.files.length" class="ob-file-list">
        <div
          v-for="f in props.files"
          :key="f.id"
          class="ob-file-item"
          :class="{ 'is-error': f.status === 'error' }"
        >
          <span class="ob-file-icon">
            <Link v-if="f.type === 'url'" :size="16" />
            <CircleAlert v-else-if="f.status === 'error'" :size="16" />
            <FileText v-else :size="16" />
          </span>
          <div class="ob-file-main">
            <div class="ob-file-top">
              <span class="ob-file-name">{{ f.name }}</span>
              <span class="ob-file-meta">
                <template v-if="f.status === 'error'">{{ f.error }}</template>
                <template v-else-if="f.type === 'url'">Link</template>
                <template v-else>{{ fmtSize(f.size) }}</template>
              </span>
            </div>
          </div>
          <button class="ob-icon-btn" title="Remove" @click="removeFile(f.id)">
            <X :size="16" />
          </button>
        </div>
      </div>
      <div v-else class="ob-hint" style="text-align: center; padding: 8px 0">
        No files yet. Drop some in or add a URL above.
      </div>
    </div>
    <div class="ob-actions">
      <div class="ob-actions-left">
        <button class="ob-btn ob-btn-ghost" @click="phase = 'name'">
          <ArrowLeft :size="16" /> Back
        </button>
      </div>
      <div class="ob-actions-right">
        <button class="ob-btn ob-btn-secondary" @click="ctx.skip()">Skip for now</button>
        <button
          class="ob-btn ob-btn-primary"
          :disabled="readyCount === 0 || ctx.busy === 'source'"
          @click="ctx.runAction('source')"
        >
          <LoaderCircle v-if="ctx.busy === 'source'" class="ob-spin" :size="16" />
          Continue with {{ readyCount }} {{ readyCount === 1 ? "source" : "sources" }}
        </button>
      </div>
    </div>
  </template>
</template>
