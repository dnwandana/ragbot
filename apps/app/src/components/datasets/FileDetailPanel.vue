<script setup>
import { computed } from "vue"
import { humanSize, fileType, statusLabel, statusChipClass } from "@/utils/files"

const props = defineProps({
  file: { type: Object, default: null },
  open: { type: Boolean, default: false },
})
const emit = defineEmits(["close", "reindex", "delete"])

/** @param {string} dateStr @returns {string} */
function formatDate(dateStr) {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

const isActive = computed(
  () => props.file?.status === "processing" || props.file?.status === "queued",
)

const type = computed(() => fileType(props.file?.filename))
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
              <span>{{ file.chunk_count ?? 0 }} chunks</span>
            </div>
          </div>
          <button class="icon-btn" @click="emit('close')" aria-label="Close">
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
                <dd class="mono">{{ file.chunk_count ?? "—" }}</dd>
              </div>
              <div class="info-row">
                <dt>Size</dt>
                <dd class="mono">{{ humanSize(file.file_size_bytes) }}</dd>
              </div>
            </dl>
          </section>

          <!-- Chunk preview placeholder -->
          <section class="chunk-section">
            <h3 class="section-label">Chunk preview</h3>
            <div class="chunk-placeholder">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--ink-4)"
                stroke-width="1.3"
                stroke-linecap="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="7" y1="8" x2="17" y2="8" />
                <line x1="7" y1="12" x2="17" y2="12" />
                <line x1="7" y1="16" x2="13" y2="16" />
              </svg>
              <p class="placeholder-title">Chunk preview</p>
              <p class="placeholder-body">
                Coming soon — will show indexed text segments and relevance scores.
              </p>
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
  width: 300px;
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
  padding: 14px 16px;
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
}
.panel-head-info {
  flex: 1;
  min-width: 0;
}
.panel-filename {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
  word-break: break-all;
  margin: 0 0 6px;
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
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.section-label {
  font-size: 10.5px;
  font-weight: 600;
  color: var(--ink-4);
  text-transform: uppercase;
  letter-spacing: 0.07em;
  margin: 0 0 10px;
}
.info-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
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

.chunk-section {
  border-top: 1px solid var(--line);
  padding-top: 16px;
}
.chunk-placeholder {
  border: 1px solid var(--line);
  border-radius: var(--r);
  padding: 20px 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  text-align: center;
}
.placeholder-title {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--ink-3);
  margin: 0;
}
.placeholder-body {
  font-size: 12px;
  color: var(--ink-4);
  line-height: 1.5;
  max-width: 200px;
  margin: 0;
}

.panel-foot {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--line);
  flex-shrink: 0;
}
.btn-secondary,
.btn-danger {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 7px 12px;
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
