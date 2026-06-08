<script setup>
import { computed, ref, watch } from "vue"
import { FileText, X, Sparkles, ArrowRight, Loader, AlertTriangle, Shuffle } from "lucide-vue-next"
import { humanSize, fileType, statusLabel, statusChipClass } from "@/utils/files"
import { useFileDetail } from "@/composables/useFileDetail"
import { useMarkdown } from "@/composables/useMarkdown"

const props = defineProps({
  file: { type: Object, default: null },
  open: { type: Boolean, default: false },
  workspaceId: { type: String, required: true },
  datasetId: { type: String, required: true },
})
const emit = defineEmits(["close", "reindex", "delete", "ask"])

// workspaceId/datasetId are captured once here; safe because they are route-stable
// for this component's lifetime (the panel is keyed per dataset detail route).
const { renderChunk } = useMarkdown()
const {
  questions,
  chunks,
  chunksTotal,
  loadingQuestions,
  loadingChunks,
  errored,
  loadMoreError,
  hasMoreChunks,
  loadFile,
  loadMoreChunks,
  reset,
} = useFileDetail(props.workspaceId, props.datasetId)

/** @param {string} dateStr @returns {string} */
function formatDate(dateStr) {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

const isActive = computed(
  () => props.file?.status === "processing" || props.file?.status === "queued",
)
const isCompleted = computed(() => props.file?.status === "completed")
const isFailed = computed(() => props.file?.status === "failed")
const type = computed(() => fileType(props.file?.filename))

/** Number of exploration questions shown at once. */
const QUESTION_DISPLAY_SIZE = 5

// Prefer the chunk endpoint's total as the source of truth once a completed
// file's chunks have loaded; otherwise fall back to the file record's count.
const chunkCount = computed(() =>
  isCompleted.value && chunksTotal.value ? chunksTotal.value : (props.file?.chunk_count ?? 0),
)

// The subset of questions currently rendered. Seeded with the stable first 5 and
// re-rolled only on explicit shuffle, so reopening the panel never re-randomizes.
const displayedQuestions = ref([])

watch(
  questions,
  (list) => {
    displayedQuestions.value = (list ?? []).slice(0, QUESTION_DISPLAY_SIZE)
  },
  { immediate: true },
)

/** Re-roll a random subset of the full question set (Fisher–Yates, non-mutating). */
function shuffleQuestions() {
  const pool = questions.value.slice()
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  displayedQuestions.value = pool.slice(0, QUESTION_DISPLAY_SIZE)
}

/** @param {number} i @returns {string} Zero-padded 1-based index, e.g. "01". */
function padIndex(i) {
  return String(i + 1).padStart(2, "0")
}

watch(
  () => [props.open, props.file?.id],
  () => {
    if (props.open && props.file) loadFile(props.file)
    else if (!props.open) reset()
  },
  { immediate: true },
)
</script>

<template>
  <Teleport to="body">
    <Transition name="scrim">
      <div v-if="open" class="scrim" @click="emit('close')" />
    </Transition>
    <Transition name="panel">
      <div
        v-if="open && file"
        class="panel"
        role="dialog"
        aria-modal="true"
        aria-label="File detail"
      >
        <!-- Header -->
        <div class="panel-head">
          <div class="panel-head-info">
            <p class="panel-filename">{{ file.filename }}</p>
            <div class="panel-meta">
              <span class="type-badge" :class="`type-${type}`">{{ type }}</span>
              <span>{{ chunkCount || "—" }} chunks</span>
            </div>
          </div>
          <button class="icon-btn" @click="emit('close')" aria-label="Close">
            <X :size="14" :stroke-width="1.8" />
          </button>
        </div>

        <!-- Body -->
        <div class="panel-body">
          <!-- File info -->
          <section>
            <h3 class="section-label">File info</h3>
            <dl class="info-list">
              <div class="info-row">
                <dt>Status</dt>
                <dd>
                  <span class="chip" :class="statusChipClass(file.status)">
                    <span class="status-dot" :class="{ pulse: isActive }" />
                    {{ statusLabel(file.status) }}
                  </span>
                </dd>
              </div>
              <div class="info-row">
                <dt>Added</dt>
                <dd>{{ formatDate(file.created_at) }}</dd>
              </div>
              <div class="info-row">
                <dt>Chunks</dt>
                <dd class="mono">{{ chunkCount || "—" }}</dd>
              </div>
              <div class="info-row">
                <dt>Size</dt>
                <dd class="mono">{{ humanSize(file.file_size_bytes) }}</dd>
              </div>
            </dl>
          </section>

          <!-- Explore this document -->
          <section
            v-if="isCompleted && (loadingQuestions || questions.length)"
            class="explore-section"
          >
            <div class="sec-head">
              <h3 class="section-label section-label--spark">
                <Sparkles :size="12" class="spark" />
                Explore this document
                <button
                  v-if="questions.length > QUESTION_DISPLAY_SIZE"
                  type="button"
                  class="shuffle-btn"
                  @click="shuffleQuestions"
                >
                  <Shuffle :size="12" :stroke-width="1.8" />
                  Shuffle
                </button>
              </h3>
              <span v-if="questions.length" class="sec-count">
                Showing {{ displayedQuestions.length }} of {{ questions.length }}
              </span>
            </div>

            <div v-if="loadingQuestions" class="muted-box">Generating starting points…</div>
            <template v-else>
              <div class="q-card">
                <button
                  v-for="(q, i) in displayedQuestions"
                  :key="q.id"
                  class="q-row"
                  @click="emit('ask', q.question)"
                >
                  <span class="q-idx">[{{ padIndex(i) }}]</span>
                  <span class="q-txt">{{ q.question }}</span>
                  <ArrowRight :size="14" class="q-arrow" />
                </button>
              </div>
              <p class="q-foot">
                Suggested starting points, generated from the indexed text. Pick one to open a
                conversation grounded in this file.
              </p>
            </template>
          </section>

          <!-- Chunk preview -->
          <section class="chunk-section">
            <div class="sec-head">
              <h3 class="section-label">Chunk preview</h3>
              <span v-if="isCompleted && chunksTotal" class="sec-count">
                {{ chunksTotal }} chunks indexed
              </span>
            </div>

            <!-- Completed: real chunks, with sub-states -->
            <template v-if="isCompleted">
              <div v-if="errored" class="placeholder placeholder--err">
                <AlertTriangle :size="22" :stroke-width="1.4" />
                <p class="placeholder-title">Couldn't load chunks</p>
                <button class="btn-link" @click="loadFile(file)">Retry</button>
              </div>
              <div v-else-if="loadingChunks && !chunks.length" class="placeholder">
                <Loader :size="22" :stroke-width="1.4" class="spin" />
                <p class="placeholder-body">Loading chunks…</p>
              </div>
              <div v-else-if="!chunks.length" class="placeholder">
                <FileText :size="22" :stroke-width="1.3" />
                <p class="placeholder-body">No chunks were produced for this file.</p>
              </div>
              <template v-else>
                <div class="chunks">
                  <div v-for="c in chunks" :key="c.id" class="chunk">
                    <div class="chunk-head">
                      <span class="chunk-idx">Chunk #{{ c.chunk_index + 1 }}</span>
                    </div>
                    <!-- eslint-disable-next-line vue/no-v-html -->
                    <div class="chunk-prose" v-html="renderChunk(c.content)" />
                  </div>
                </div>
                <button
                  v-if="hasMoreChunks"
                  class="load-more"
                  :disabled="loadingChunks"
                  @click="loadMoreChunks(file)"
                >
                  {{ loadingChunks ? "Loading…" : "Load more chunks" }}
                </button>
                <p class="showing mono">Showing {{ chunks.length }} of {{ chunksTotal }}</p>
                <p v-if="loadMoreError" class="load-more-err">
                  Couldn't load more chunks.
                  <button class="btn-link" @click="loadMoreChunks(file)">Retry</button>
                </p>
              </template>
            </template>

            <!-- Parsing -->
            <div v-else-if="isActive" class="placeholder">
              <Loader :size="22" :stroke-width="1.4" class="spin" />
              <p class="placeholder-title">Extracting text…</p>
              <p class="placeholder-body">
                Parsing, chunking, and embedding the document. Usually under a minute.
              </p>
            </div>

            <!-- Failed -->
            <div v-else-if="isFailed" class="placeholder placeholder--err">
              <AlertTriangle :size="22" :stroke-width="1.4" />
              <p class="placeholder-title">Processing failed</p>
              <p class="placeholder-body">
                {{ file.error_message || "An error occurred while processing this file." }}
              </p>
            </div>

            <!-- Queued / unknown -->
            <div v-else class="placeholder">
              <FileText :size="22" :stroke-width="1.3" />
              <p class="placeholder-body">Queued for processing.</p>
            </div>
          </section>
        </div>

        <!-- Footer actions -->
        <div class="panel-foot">
          <button class="btn-secondary" :disabled="isActive" @click="emit('reindex', file.id)">
            Re-index
          </button>
          <button class="btn-danger" @click="emit('delete', file.id)">Delete</button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.scrim {
  position: fixed;
  inset: 0;
  background: rgba(24, 18, 12, 0.2);
  z-index: 40;
}
.panel {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 480px;
  max-width: 100vw;
  background: var(--surface);
  border-left: 1px solid var(--line-2);
  box-shadow: var(--shadow-3);
  z-index: 41;
  display: flex;
  flex-direction: column;
}
.scrim-enter-active,
.scrim-leave-active {
  transition: opacity 200ms var(--ease);
}
.scrim-enter-from,
.scrim-leave-to {
  opacity: 0;
}
.panel-enter-active,
.panel-leave-active {
  transition: transform 220ms var(--ease);
}
.panel-enter-from,
.panel-leave-to {
  transform: translateX(100%);
}

.panel-head {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
}
.panel-head-info {
  flex: 1;
  min-width: 0;
}
.panel-filename {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
  word-break: break-all;
  margin: 0 0 7px;
}
.panel-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11.5px;
  color: var(--ink-3);
}
.icon-btn {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
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

.type-badge {
  display: inline-flex;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border: 1px solid;
}
.type-pdf {
  background: var(--err-bg);
  color: var(--err);
  border-color: var(--err-border);
}
.type-md {
  background: var(--ok-bg);
  color: var(--ok);
  border-color: var(--ok-border);
}
.type-url {
  background: var(--brand-tint);
  color: var(--brand-3);
  border-color: rgba(255, 107, 53, 0.2);
}
.type-docx {
  background: #f0f4ff;
  color: #1d4ed8;
  border-color: rgba(29, 78, 216, 0.2);
}
.type-file {
  background: var(--bg-2);
  color: var(--ink-3);
  border-color: var(--line-2);
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 22px;
}
.section-label {
  font-size: 10.5px;
  font-weight: 600;
  color: var(--ink-4);
  text-transform: uppercase;
  letter-spacing: 0.07em;
  margin: 0;
}
.section-label--spark {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--ink-3);
}
.spark {
  color: var(--brand);
}
.shuffle-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: 8px;
  padding: 2px 7px;
  background: var(--surface);
  border: 1px solid var(--line-2);
  border-radius: var(--r-sm);
  color: var(--ink-3);
  font: 600 10.5px var(--font-sans);
  text-transform: none;
  letter-spacing: 0;
  cursor: pointer;
}
.shuffle-btn:hover {
  background: var(--bg-2);
  color: var(--ink-2);
}
.sec-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 11px;
}
.sec-count {
  font-size: 11px;
  color: var(--ink-3);
  flex-shrink: 0;
}
.info-list {
  display: flex;
  flex-direction: column;
  gap: 9px;
  margin: 0;
}
.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12.5px;
}
.info-row dt {
  color: var(--ink-3);
}
.info-row dd {
  color: var(--ink-2);
  margin: 0;
}
.mono {
  font-family: var(--font-mono);
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 8px;
  border-radius: 20px;
  font-size: 11.5px;
  font-weight: 500;
  border: 1px solid;
}
.chip--ok {
  background: var(--ok-bg);
  color: var(--ok);
  border-color: var(--ok-border);
}
.chip--brand {
  background: var(--brand-tint);
  color: var(--brand-2);
  border-color: rgba(255, 107, 53, 0.2);
}
.chip--err {
  background: var(--err-bg);
  color: var(--err);
  border-color: var(--err-border);
}
.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
}
@keyframes pulse {
  0%,
  100% {
    opacity: 0.35;
    transform: scale(0.85);
  }
  50% {
    opacity: 1;
    transform: scale(1);
  }
}
.status-dot.pulse {
  animation: pulse 1.4s ease-in-out infinite;
}

/* Explore this document */
.explore-section {
  border-top: 1px solid var(--line);
  padding-top: 16px;
}
.q-card {
  border: 1px solid var(--line);
  border-radius: var(--r);
  overflow: hidden;
}
.q-row {
  display: flex;
  align-items: center;
  gap: 11px;
  width: 100%;
  text-align: left;
  padding: 11px 14px;
  background: transparent;
  border: none;
  border-top: 1px solid var(--line);
  cursor: pointer;
  transition: background var(--dur) var(--ease);
}
.q-row:first-child {
  border-top: none;
}
.q-row:hover {
  background: var(--brand-tint);
}
.q-idx {
  font: 500 11px var(--font-mono);
  color: var(--brand-3);
  flex-shrink: 0;
  letter-spacing: -0.02em;
}
.q-txt {
  flex: 1;
  min-width: 0;
  font: 400 13px/1.45 var(--font-sans);
  color: var(--ink-2);
}
.q-row:hover .q-txt {
  color: var(--ink);
}
.q-arrow {
  flex-shrink: 0;
  color: var(--brand-3);
  opacity: 0;
  transition: opacity var(--dur) var(--ease);
}
.q-row:hover .q-arrow {
  opacity: 1;
}
.q-foot {
  font: 400 11px/1.5 var(--font-sans);
  color: var(--ink-3);
  margin: 9px 0 0;
}
.muted-box {
  font-size: 12.5px;
  color: var(--ink-3);
  padding: 12px 0;
}

/* Chunk preview */
.chunk-section {
  border-top: 1px solid var(--line);
  padding-top: 16px;
}
.chunks {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.chunk {
  padding: 11px 14px;
  border-left: 3px solid var(--line);
  background: var(--bg);
  border-radius: 0 var(--r-sm) var(--r-sm) 0;
}
.chunk-head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: var(--ink-3);
  margin-bottom: 6px;
}
.chunk-idx {
  font-family: var(--font-mono);
  color: var(--ink-2);
}
.chunk-prose {
  font: 400 13px/1.6 var(--font-sans);
  color: var(--ink);
  overflow-wrap: anywhere;
}
/* Clamp markdown so wide/large elements can't break the panel */
.chunk-prose :deep(h1),
.chunk-prose :deep(h2),
.chunk-prose :deep(h3),
.chunk-prose :deep(h4) {
  font-size: 13.5px;
  font-weight: 600;
  margin: 8px 0 4px;
  line-height: 1.4;
}
.chunk-prose :deep(p) {
  margin: 0 0 8px;
}
.chunk-prose :deep(p:last-child) {
  margin-bottom: 0;
}
.chunk-prose :deep(ul),
.chunk-prose :deep(ol) {
  margin: 0 0 8px;
  padding-left: 18px;
}
.chunk-prose :deep(pre) {
  background: var(--bg-2);
  padding: 8px 10px;
  border-radius: var(--r-sm);
  overflow-x: auto;
  font-size: 12px;
}
.chunk-prose :deep(code) {
  font-family: var(--font-mono);
  font-size: 12px;
  overflow-wrap: anywhere;
}
.chunk-prose :deep(table) {
  display: block;
  width: 100%;
  overflow-x: auto;
  border-collapse: collapse;
  font-size: 12px;
}
.chunk-prose :deep(th),
.chunk-prose :deep(td) {
  border: 1px solid var(--line);
  padding: 4px 8px;
}
.chunk-prose :deep(img) {
  max-width: 100%;
  height: auto;
}
.chunk-prose :deep(a) {
  color: var(--brand-3);
  text-decoration: underline;
}
.load-more {
  margin-top: 10px;
  align-self: flex-start;
  background: var(--surface);
  border: 1px solid var(--line-2);
  color: var(--ink-2);
  font: 600 12px var(--font-sans);
  padding: 7px 12px;
  border-radius: var(--r-sm);
  cursor: pointer;
}
.load-more:hover:not(:disabled) {
  background: var(--bg-2);
}
.load-more:disabled {
  opacity: 0.6;
  cursor: default;
}
.showing {
  font-size: 11px;
  color: var(--ink-3);
  margin: 8px 0 0;
}
.load-more-err {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  color: var(--err);
  margin: 8px 0 0;
}

.placeholder {
  border: 1px dashed var(--line-2);
  border-radius: var(--r);
  padding: 28px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  text-align: center;
  color: var(--ink-3);
}
.placeholder--err {
  border-style: solid;
  border-color: var(--err-border);
  background: var(--err-bg);
  color: var(--err);
}
.placeholder-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
  margin: 0;
}
.placeholder--err .placeholder-title {
  color: var(--err);
}
.placeholder-body {
  font-size: 12px;
  line-height: 1.5;
  max-width: 260px;
  margin: 0;
}
.btn-link {
  background: none;
  border: none;
  color: var(--err);
  font: 600 12.5px var(--font-sans);
  text-decoration: underline;
  cursor: pointer;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.spin {
  animation: spin 1.2s linear infinite;
}

.panel-foot {
  display: flex;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid var(--line);
  flex-shrink: 0;
}
.btn-secondary,
.btn-danger {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 12px;
  border-radius: var(--r-sm);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
}
.btn-secondary {
  background: var(--surface);
  color: var(--ink-2);
  border: 1px solid var(--line-2);
}
.btn-secondary:hover:not(:disabled) {
  background: var(--bg-2);
}
.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn-danger {
  background: var(--surface);
  color: var(--err);
  border: 1px solid var(--err-border);
}
.btn-danger:hover {
  background: var(--err-bg);
}
</style>
