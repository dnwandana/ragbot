<script setup>
import { computed } from "vue"
import { LayoutGrid, UserPlus, Database, Bot, Check } from "lucide-vue-next"

const props = defineProps({
  step: { type: Number, default: 1 },
})

/*
 * step prop → 1=welcome, 2=workspace, 3=invite, 4=source, 5=agent, 6=complete
 * The progress rail shows 4 wizard steps (+ a Done cap). Active is the current step.
 * step 1 = welcome (no rail shown; we show a welcome panel)
 * step 6 = complete (all done)
 */

const RAIL = [
  { key: "workspace", label: "Create workspace", icon: LayoutGrid },
  { key: "invites", label: "Invite team", icon: UserPlus },
  { key: "source", label: "Add a source", icon: Database },
  { key: "agent", label: "Create an agent", icon: Bot },
]

// Convert 1-based step prop to 0-based rail index (-1 = welcome, 4 = complete)
const railIdx = computed(() => props.step - 2) // step=2 → railIdx=0 (workspace active)

const isWelcome = computed(() => props.step <= 1)
const isComplete = computed(() => props.step >= 6)
const showRail = computed(() => !isWelcome.value)

// step label for progress header
const currentLabel = computed(() => {
  if (isComplete.value) return "Done"
  if (railIdx.value >= 0 && railIdx.value < RAIL.length) return RAIL[railIdx.value].label
  return ""
})

const stepNumLabel = computed(() => {
  if (isComplete.value) return `Step ${RAIL.length} of ${RAIL.length}`
  if (railIdx.value >= 0 && railIdx.value < RAIL.length) {
    return `Step ${railIdx.value + 1} of ${RAIL.length}`
  }
  return ""
})

// Panel data per step
const panel = computed(() => {
  if (isWelcome.value) {
    return { view: "welcome" }
  }
  if (isComplete.value) {
    return { view: "complete" }
  }
  const stepKey = RAIL[railIdx.value]?.key ?? "workspace"
  return { view: "step", key: stepKey }
})

// Rail segment state: 'done' | 'current' | 'idle'
function segState(i) {
  if (isComplete.value) return "done"
  if (i < railIdx.value) return "done"
  if (i === railIdx.value) return "current"
  return "idle"
}
</script>

<template>
  <MockFrame
    label="ragbot — get started"
    caption="A short setup wizard: create a workspace (required), then optionally invite, add a source, and create an agent."
  >
    <div class="ob-mock">
      <!-- Topbar -->
      <div class="ob-mock__topbar">
        <span class="ob-mock__logo">RAGBot</span>
        <span v-if="!isComplete" class="ob-mock__exit">Exit &amp; resume later</span>
      </div>

      <!-- Progress rail (hidden on welcome) -->
      <div v-if="showRail" class="ob-mock__progress">
        <div class="ob-mock__prog-head">
          <span class="ob-mock__prog-step">{{ stepNumLabel }}</span>
          <span class="ob-mock__prog-name">{{ currentLabel }}</span>
        </div>
        <div class="ob-mock__track">
          <div
            v-for="(seg, i) in RAIL"
            :key="seg.key"
            class="ob-mock__seg"
            :class="{
              'ob-mock__seg--done': segState(i) === 'done',
              'ob-mock__seg--current': segState(i) === 'current',
            }"
          />
        </div>
      </div>

      <!-- Panel body -->
      <div class="ob-mock__body">
        <!-- Welcome panel -->
        <div v-if="panel.view === 'welcome'" class="ob-mock__panel">
          <div class="ob-mock__welcome">
            <div class="ob-mock__welcome-mark">
              <LayoutGrid :size="22" :stroke-width="1.8" />
            </div>
            <div class="ob-mock__welcome-title">Welcome to RAGBot</div>
            <p class="ob-mock__welcome-text">
              Create a workspace, then optionally invite your team, add a source, and build an
              agent. The whole setup takes about five minutes.
            </p>
          </div>
          <div class="ob-mock__actions ob-mock__actions--welcome">
            <button class="ob-mock__btn ob-mock__btn--primary ob-mock__btn--lg">Get started</button>
          </div>
        </div>

        <!-- Workspace step -->
        <div v-else-if="panel.key === 'workspace'" class="ob-mock__panel">
          <div class="ob-mock__head">
            <div class="ob-mock__head-icon">
              <LayoutGrid :size="16" :stroke-width="1.8" />
            </div>
            <div class="ob-mock__eyebrow">Step 1 · Required</div>
            <h2 class="ob-mock__title">Create your workspace</h2>
            <p class="ob-mock__subtitle">
              This is the home for your team, knowledge sources, and agents. You can rename it
              later.
            </p>
          </div>
          <div class="ob-mock__inner">
            <div class="ob-mock__field">
              <label class="ob-mock__label">Workspace name</label>
              <div class="ob-mock__input-wrap">
                <div class="ob-mock__input ob-mock__input--filled">Acme Support</div>
              </div>
              <div class="ob-mock__hint">Letters, numbers and spaces.</div>
            </div>
          </div>
          <div class="ob-mock__actions">
            <div class="ob-mock__actions-left">
              <button class="ob-mock__btn ob-mock__btn--ghost">← Back</button>
            </div>
            <div class="ob-mock__actions-right">
              <button class="ob-mock__btn ob-mock__btn--primary">Continue</button>
            </div>
          </div>
        </div>

        <!-- Invite step -->
        <div v-else-if="panel.key === 'invites'" class="ob-mock__panel">
          <div class="ob-mock__head">
            <div class="ob-mock__head-icon">
              <UserPlus :size="16" :stroke-width="1.8" />
            </div>
            <div class="ob-mock__eyebrow">Step 2 · Optional</div>
            <h2 class="ob-mock__title">Invite your team</h2>
            <p class="ob-mock__subtitle">
              Add teammates by email and pick the role each should get. You can do this later from
              Members &amp; Roles.
            </p>
          </div>
          <div class="ob-mock__inner">
            <div class="ob-mock__invite-empty">
              <UserPlus :size="16" :stroke-width="1.6" />
              <span>Type an email address to queue an invite</span>
            </div>
          </div>
          <div class="ob-mock__actions">
            <div class="ob-mock__actions-left">
              <button class="ob-mock__btn ob-mock__btn--ghost">← Back</button>
            </div>
            <div class="ob-mock__actions-right">
              <button class="ob-mock__btn ob-mock__btn--secondary">Skip for now</button>
              <button class="ob-mock__btn ob-mock__btn--primary">Send invites</button>
            </div>
          </div>
        </div>

        <!-- Source step -->
        <div v-else-if="panel.key === 'source'" class="ob-mock__panel">
          <div class="ob-mock__head">
            <div class="ob-mock__head-icon">
              <Database :size="16" :stroke-width="1.8" />
            </div>
            <div class="ob-mock__eyebrow">Step 3 · Optional</div>
            <h2 class="ob-mock__title">Add a knowledge source</h2>
            <p class="ob-mock__subtitle">
              Create a dataset and attach files or a URL for agents to search.
            </p>
          </div>
          <div class="ob-mock__inner">
            <div class="ob-mock__field">
              <label class="ob-mock__label">Dataset name</label>
              <div class="ob-mock__input-wrap">
                <div class="ob-mock__input ob-mock__input--placeholder">e.g. HR policies</div>
              </div>
            </div>
            <div class="ob-mock__dropzone">
              <Database :size="20" :stroke-width="1.4" class="ob-mock__drop-icon" />
              <span class="ob-mock__drop-title">Drop files or paste a URL</span>
              <span class="ob-mock__drop-hint">PDF · DOCX · TXT · CSV · MD</span>
            </div>
          </div>
          <div class="ob-mock__actions">
            <div class="ob-mock__actions-left">
              <button class="ob-mock__btn ob-mock__btn--ghost">← Back</button>
            </div>
            <div class="ob-mock__actions-right">
              <button class="ob-mock__btn ob-mock__btn--secondary">Skip for now</button>
              <button class="ob-mock__btn ob-mock__btn--primary">Create dataset</button>
            </div>
          </div>
        </div>

        <!-- Agent step -->
        <div v-else-if="panel.key === 'agent'" class="ob-mock__panel">
          <div class="ob-mock__head">
            <div class="ob-mock__head-icon">
              <Bot :size="16" :stroke-width="1.8" />
            </div>
            <div class="ob-mock__eyebrow">Step 4 · Optional</div>
            <h2 class="ob-mock__title">Create your first agent</h2>
            <p class="ob-mock__subtitle">
              Start from a template and tweak the system prompt. This agent becomes your workspace
              default.
            </p>
          </div>
          <div class="ob-mock__inner">
            <div class="ob-mock__tpl-grid">
              <div class="ob-mock__tpl ob-mock__tpl--active">
                <span class="ob-mock__tpl-label">Support</span>
                <span class="ob-mock__tpl-desc">Answer questions from connected docs</span>
              </div>
              <div class="ob-mock__tpl">
                <span class="ob-mock__tpl-label">Research</span>
                <span class="ob-mock__tpl-desc">Summarise and cross-reference sources</span>
              </div>
              <div class="ob-mock__tpl">
                <span class="ob-mock__tpl-label">Policy Q&amp;A</span>
                <span class="ob-mock__tpl-desc">Strict policy lookups with citations</span>
              </div>
              <div class="ob-mock__tpl">
                <span class="ob-mock__tpl-label">Blank</span>
                <span class="ob-mock__tpl-desc">Start with an empty system prompt</span>
              </div>
            </div>
          </div>
          <div class="ob-mock__actions">
            <div class="ob-mock__actions-left">
              <button class="ob-mock__btn ob-mock__btn--ghost">← Back</button>
            </div>
            <div class="ob-mock__actions-right">
              <button class="ob-mock__btn ob-mock__btn--secondary">Skip for now</button>
              <button class="ob-mock__btn ob-mock__btn--primary">Create agent</button>
            </div>
          </div>
        </div>

        <!-- Complete panel -->
        <div v-else-if="panel.view === 'complete'" class="ob-mock__panel">
          <div class="ob-mock__complete">
            <div class="ob-mock__complete-badge">
              <Check :size="22" :stroke-width="2.5" />
            </div>
            <div class="ob-mock__complete-title">You're all set</div>
            <p class="ob-mock__complete-text">
              Here's a recap of what you created. Any skipped steps show a link to finish them
              later.
            </p>
          </div>
          <div class="ob-mock__result-list">
            <div class="ob-mock__result">
              <div class="ob-mock__result-icon ob-mock__result-icon--ok">
                <Check :size="13" :stroke-width="2.5" />
              </div>
              <div class="ob-mock__result-main">
                <span class="ob-mock__result-label">Workspace</span>
                <span class="ob-mock__result-value">Acme Support</span>
              </div>
            </div>
            <div class="ob-mock__result ob-mock__result--skipped">
              <div class="ob-mock__result-icon ob-mock__result-icon--skip">—</div>
              <div class="ob-mock__result-main">
                <span class="ob-mock__result-label">Team invites</span>
                <span class="ob-mock__result-value">Skipped — do it later</span>
              </div>
            </div>
            <div class="ob-mock__result ob-mock__result--skipped">
              <div class="ob-mock__result-icon ob-mock__result-icon--skip">—</div>
              <div class="ob-mock__result-main">
                <span class="ob-mock__result-label">Knowledge source</span>
                <span class="ob-mock__result-value">Skipped — do it later</span>
              </div>
            </div>
            <div class="ob-mock__result ob-mock__result--skipped">
              <div class="ob-mock__result-icon ob-mock__result-icon--skip">—</div>
              <div class="ob-mock__result-main">
                <span class="ob-mock__result-label">Agent</span>
                <span class="ob-mock__result-value">Skipped — do it later</span>
              </div>
            </div>
          </div>
          <div class="ob-mock__actions ob-mock__actions--center">
            <button class="ob-mock__btn ob-mock__btn--primary">Go to dashboard</button>
          </div>
        </div>
      </div>
    </div>
  </MockFrame>
</template>

<style scoped>
/* ── Wizard card ── */
.ob-mock {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Topbar */
.ob-mock__topbar {
  height: 48px;
  flex-shrink: 0;
  padding: 0 20px;
  border-bottom: 1px solid var(--line);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.ob-mock__logo {
  font: 700 13px/1 var(--font-mono);
  color: var(--ink);
  letter-spacing: -0.02em;
}

.ob-mock__exit {
  font-size: var(--t-xs);
  font-weight: 500;
  color: var(--ink-3);
  cursor: default;
}

/* Progress rail */
.ob-mock__progress {
  padding: 14px 20px 12px;
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ob-mock__prog-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.ob-mock__prog-step {
  font-size: var(--t-sm);
  font-weight: 600;
  color: var(--ink);
  flex-shrink: 0;
}

.ob-mock__prog-name {
  font-size: var(--t-sm);
  color: var(--ink-3);
  position: relative;
  padding-left: 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ob-mock__prog-name::before {
  content: "";
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--ink-4);
}

.ob-mock__track {
  display: flex;
  gap: 5px;
}

.ob-mock__seg {
  flex: 1;
  height: 5px;
  border-radius: 3px;
  background: var(--line);
}

.ob-mock__seg--done,
.ob-mock__seg--current {
  background: var(--brand);
}

/* Subtle pulse on the current segment (reduced-motion safe) */
@keyframes ob-mock-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.65;
  }
}

.ob-mock__seg--current {
  animation: ob-mock-pulse 2s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .ob-mock__seg--current {
    animation: none;
  }
}

/* Body */
.ob-mock__body {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.ob-mock__panel {
  display: flex;
  flex-direction: column;
  flex: 1;
}

/* Step head */
.ob-mock__head {
  padding: 22px 20px 4px;
}

.ob-mock__head-icon {
  width: 36px;
  height: 36px;
  border-radius: var(--r);
  background: var(--brand-tint);
  color: var(--brand);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
}

.ob-mock__eyebrow {
  font-size: var(--t-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--ink-3);
  margin-bottom: 6px;
}

.ob-mock__title {
  font-size: var(--t-xl);
  font-weight: 600;
  letter-spacing: -0.015em;
  line-height: 1.2;
  color: var(--ink);
  margin: 0;
}

.ob-mock__subtitle {
  font-size: var(--t-base);
  line-height: 1.55;
  color: var(--ink-3);
  margin: 8px 0 0;
  max-width: 46ch;
}

/* Inner body */
.ob-mock__inner {
  padding: 16px 20px 8px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Field */
.ob-mock__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ob-mock__label {
  font-size: var(--t-sm);
  font-weight: 500;
  color: var(--ink-2);
}

.ob-mock__hint {
  font-size: var(--t-sm);
  color: var(--ink-3);
}

.ob-mock__input-wrap {
  display: flex;
}

.ob-mock__input {
  width: 100%;
  padding: 9px 11px;
  border: 1px solid var(--line-2);
  border-radius: var(--r-sm);
  background: var(--surface);
  font: 400 var(--t-base) / 1.45 var(--font-sans);
}

.ob-mock__input--filled {
  color: var(--ink);
  border-color: var(--brand);
  box-shadow: 0 0 0 3px var(--brand-tint);
}

.ob-mock__input--placeholder {
  color: var(--ink-4);
}

/* Invite empty */
.ob-mock__invite-empty {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border: 1px dashed var(--line-2);
  border-radius: var(--r);
  color: var(--ink-3);
  font-size: var(--t-sm);
}

/* Dropzone */
.ob-mock__dropzone {
  border: 1.5px dashed var(--line-2);
  border-radius: var(--r);
  padding: 20px 16px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.ob-mock__drop-icon {
  color: var(--ink-3);
  margin-bottom: 2px;
}

.ob-mock__drop-title {
  font-size: var(--t-base);
  color: var(--ink-2);
  font-weight: 500;
}

.ob-mock__drop-hint {
  font-size: var(--t-xs);
  color: var(--ink-4);
  font-family: var(--font-mono);
}

/* Template grid */
.ob-mock__tpl-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.ob-mock__tpl {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 11px;
  border: 1.5px solid var(--line-2);
  border-radius: var(--r);
  background: var(--surface);
}

.ob-mock__tpl--active {
  border-color: var(--brand);
  background: var(--brand-tint);
}

.ob-mock__tpl-label {
  font-size: var(--t-sm);
  font-weight: 600;
  color: var(--ink);
}

.ob-mock__tpl-desc {
  font-size: var(--t-xs);
  color: var(--ink-3);
  line-height: 1.4;
}

/* Actions bar */
.ob-mock__actions {
  padding: 14px 20px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid var(--line);
  flex-shrink: 0;
  margin-top: auto;
}

.ob-mock__actions--welcome {
  justify-content: flex-end;
  border-top: none;
  padding-top: 0;
}

.ob-mock__actions--center {
  justify-content: center;
  border-top: none;
  padding-top: 18px;
}

.ob-mock__actions-left,
.ob-mock__actions-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* Buttons */
.ob-mock__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 14px;
  height: 34px;
  border-radius: var(--r-sm);
  font: 500 var(--t-sm) / 1 var(--font-sans);
  cursor: default;
  border: none;
  white-space: nowrap;
}

.ob-mock__btn--primary {
  background: var(--brand);
  color: #fff;
}

.ob-mock__btn--secondary {
  background: var(--bg-2);
  color: var(--ink-2);
  border: 1px solid var(--line-2);
}

.ob-mock__btn--ghost {
  background: none;
  color: var(--ink-3);
  padding: 0 8px;
}

.ob-mock__btn--lg {
  height: 40px;
  padding: 0 20px;
  font-size: var(--t-base);
  border-radius: var(--r);
}

/* Welcome panel */
.ob-mock__welcome {
  padding: 24px 20px 16px;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.ob-mock__welcome-mark {
  width: 44px;
  height: 44px;
  border-radius: var(--r);
  background: var(--brand-tint);
  color: var(--brand);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 14px;
}

.ob-mock__welcome-title {
  font-size: var(--t-xl);
  font-weight: 600;
  letter-spacing: -0.015em;
  color: var(--ink);
  margin-bottom: 8px;
}

.ob-mock__welcome-text {
  font-size: var(--t-base);
  line-height: 1.55;
  color: var(--ink-3);
  margin: 0;
  max-width: 44ch;
}

/* Complete panel */
.ob-mock__complete {
  padding: 24px 20px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 8px;
}

.ob-mock__complete-badge {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--ok-bg);
  color: var(--ok);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
}

.ob-mock__complete-title {
  font-size: var(--t-xl);
  font-weight: 600;
  letter-spacing: -0.015em;
  color: var(--ink);
}

.ob-mock__complete-text {
  font-size: var(--t-base);
  line-height: 1.55;
  color: var(--ink-3);
  margin: 0;
  max-width: 44ch;
}

.ob-mock__result-list {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 0 20px;
}

.ob-mock__result {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 10px 13px;
  border: 1px solid var(--line);
  border-radius: var(--r);
  background: var(--bg);
}

.ob-mock__result--skipped {
  opacity: 0.55;
}

.ob-mock__result-icon {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}

.ob-mock__result-icon--ok {
  background: var(--ok-bg);
  color: var(--ok);
}

.ob-mock__result-icon--skip {
  background: var(--bg-2);
  color: var(--ink-4);
  font-size: 13px;
}

.ob-mock__result-main {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.ob-mock__result-label {
  font-size: var(--t-sm);
  font-weight: 600;
  color: var(--ink);
}

.ob-mock__result-value {
  font-size: var(--t-xs);
  color: var(--ink-3);
}
</style>
