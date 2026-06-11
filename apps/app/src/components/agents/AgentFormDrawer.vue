<script setup>
import { computed, reactive, ref, watch } from "vue"
import { useAgentsStore } from "@/stores/agents"
import {
  DEFAULT_MODEL_CONFIG,
  MODEL_RECOMMENDATIONS,
  findModel,
  selectableModels,
} from "@/constants/models"
const agentsStore = useAgentsStore()

const settingDefault = ref(false)

const props = defineProps({
  open: { type: Boolean, default: false },
  agent: { type: Object, default: null },
  workspaceId: { type: String, required: true },
})

const emit = defineEmits(["close", "submit"])

const form = reactive({
  name: "",
  description: "",
  system_prompt: "",
  model_config: { ...DEFAULT_MODEL_CONFIG },
})

const savedModel = ref("")

const modelOptions = computed(() => selectableModels(savedModel.value))

const showGuide = ref(false)
const selectedChip = ref(null)

const recommendation = computed(
  () => MODEL_RECOMMENDATIONS.find((r) => r.key === selectedChip.value) || null,
)

/** Applies the guide's recommended model to the form and closes the panel. */
function applyRecommendation() {
  if (!recommendation.value) return
  form.model_config.model = recommendation.value.model
  showGuide.value = false
  selectedChip.value = null
}

watch(
  () => props.open,
  (open) => {
    if (!open) {
      showGuide.value = false
      selectedChip.value = null
    }
  },
)

watch(
  () => props.agent,
  (a) => {
    if (a) {
      form.name = a.name || ""
      form.description = a.description || ""
      form.system_prompt = a.system_prompt || ""
      const mc =
        typeof a.model_config === "string"
          ? (() => {
              try {
                return JSON.parse(a.model_config)
              } catch {
                return {}
              }
            })()
          : a.model_config || {}
      form.model_config = {
        model: mc.model || DEFAULT_MODEL_CONFIG.model,
        temperature: mc.temperature ?? DEFAULT_MODEL_CONFIG.temperature,
        top_p: mc.top_p ?? DEFAULT_MODEL_CONFIG.top_p,
        max_tokens: mc.max_tokens ?? DEFAULT_MODEL_CONFIG.max_tokens,
      }
      savedModel.value = mc.model || ""
    } else {
      form.name = ""
      form.description = ""
      form.system_prompt = ""
      form.model_config = { ...DEFAULT_MODEL_CONFIG }
      savedModel.value = ""
    }
  },
  { immediate: true },
)

/** @returns {string} Short model label (last path segment) */
function modelLabel() {
  return form.model_config.model?.split("/").pop() || ""
}

function onSubmit() {
  if (props.agent?.is_system) return
  const payload = {
    system_prompt: form.system_prompt,
    description: form.description,
    model_config: { ...form.model_config },
  }
  if (!props.agent?.is_system) payload.name = form.name
  emit("submit", payload)
}

/** Immediately sets this agent as the workspace default. */
async function handleToggleDefault() {
  if (!props.agent || props.agent.is_default || settingDefault.value) return
  settingDefault.value = true
  try {
    await agentsStore.setDefaultAgent(props.workspaceId, props.agent.id)
  } finally {
    settingDefault.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="scrim">
      <div v-if="open" class="scrim" @click="$emit('close')" />
    </Transition>
    <Transition name="drawer">
      <div v-if="open" class="drawer" role="dialog" aria-modal="true" aria-label="Agent form">
        <!-- Header -->
        <div class="drawer-head">
          <div class="head-info">
            <div class="drawer-title">
              {{ agent ? agent.name : "New agent" }}
              <span v-if="agent && !agent.is_system && modelLabel()" class="model-chip">
                {{ modelLabel() }}
              </span>
            </div>
            <div class="drawer-sub">
              {{
                agent?.is_system
                  ? "System agent — read only"
                  : agent
                    ? "Editing agent"
                    : "Create agent"
              }}
            </div>
          </div>
          <button class="close-btn" @click="$emit('close')" aria-label="Close">✕</button>
        </div>

        <!-- Scrollable body -->
        <div class="drawer-body">
          <a-form :model="form" layout="vertical" @finish="onSubmit">
            <!-- Name — hidden for system agents -->
            <a-form-item
              v-if="!agent?.is_system"
              label="Name"
              name="name"
              :rules="[{ required: !agent, message: 'Name is required' }, { max: 255 }]"
            >
              <a-input v-model:value="form.name" placeholder="e.g. Legal Expert" />
            </a-form-item>

            <!-- Description -->
            <a-form-item label="Description">
              <a-input
                v-model:value="form.description"
                placeholder="Optional description"
                :disabled="agent?.is_system"
              />
            </a-form-item>

            <div class="section-divider" />

            <!-- System prompt -->
            <a-form-item
              label="System prompt"
              name="system_prompt"
              :rules="[{ required: !agent, message: 'System prompt is required' }]"
            >
              <a-textarea
                v-model:value="form.system_prompt"
                :rows="8"
                placeholder="You are a helpful assistant..."
                :readonly="agent?.is_system"
              />
            </a-form-item>

            <div class="section-divider" />

            <!-- Model -->
            <a-form-item label="Model">
              <a-select
                v-model:value="form.model_config.model"
                :disabled="agent?.is_system"
                option-label-prop="label"
              >
                <a-select-option
                  v-for="opt in modelOptions"
                  :key="opt.value"
                  :value="opt.value"
                  :label="opt.label"
                >
                  <div class="model-opt">
                    <div class="model-opt-head">
                      <span class="model-opt-label">{{ opt.label }}</span>
                      <span
                        class="model-badge"
                        :class="{ 'model-badge--rec': opt.badge === 'Recommended' }"
                      >
                        {{ opt.badge }}
                      </span>
                    </div>
                    <div v-if="opt.description" class="model-opt-desc">{{ opt.description }}</div>
                  </div>
                </a-select-option>
              </a-select>
              <template v-if="!agent?.is_system">
                <button type="button" class="guide-link" @click="showGuide = !showGuide">
                  Not sure which to pick? Help me choose
                </button>
                <div v-if="showGuide" class="guide-panel">
                  <div class="guide-question">What will you mostly use it for?</div>
                  <div class="guide-chips">
                    <button
                      v-for="rec in MODEL_RECOMMENDATIONS"
                      :key="rec.key"
                      type="button"
                      class="guide-chip"
                      :class="{ 'guide-chip--on': selectedChip === rec.key }"
                      @click="selectedChip = rec.key"
                    >
                      {{ rec.label }}
                    </button>
                  </div>
                  <div v-if="recommendation" class="guide-reco">
                    <div class="guide-reco-info">
                      <span class="guide-reco-label">{{
                        findModel(recommendation.model).label
                      }}</span>
                      <span class="model-badge model-badge--rec">Our pick</span>
                      <div class="guide-reco-reason">{{ recommendation.reason }}</div>
                    </div>
                    <button type="button" class="guide-use-btn" @click="applyRecommendation">
                      Use this
                    </button>
                  </div>
                </div>
              </template>
            </a-form-item>

            <!-- Temperature + Max tokens side by side -->
            <div class="two-col">
              <a-form-item label="Temperature">
                <a-slider
                  v-model:value="form.model_config.temperature"
                  :min="0"
                  :max="2"
                  :step="0.1"
                  :marks="{ 0: '0', 1: '1', 2: '2' }"
                  :disabled="agent?.is_system"
                />
              </a-form-item>
              <a-form-item label="Max tokens">
                <a-input-number
                  v-model:value="form.model_config.max_tokens"
                  :min="256"
                  :max="32768"
                  :step="256"
                  :disabled="agent?.is_system"
                  style="width: 100%"
                />
              </a-form-item>
            </div>

            <!-- Default agent toggle — only shown when editing an existing agent -->
            <template v-if="agent">
              <div class="section-divider" />
              <div
                class="default-toggle-row"
                :class="{ 'default-toggle-row--on': agent.is_default }"
              >
                <div class="default-toggle-info">
                  <div class="default-toggle-label">Default agent</div>
                  <div class="default-toggle-sub">
                    {{
                      agent.is_default
                        ? "This agent is currently the default"
                        : "Pre-selected when starting a new conversation"
                    }}
                  </div>
                </div>
                <button
                  type="button"
                  class="toggle-switch"
                  :class="{ 'toggle-switch--on': agent.is_default }"
                  :disabled="agent.is_default || settingDefault"
                  :aria-label="agent.is_default ? 'This agent is the default' : 'Set as default'"
                  @click="handleToggleDefault"
                >
                  <span class="toggle-knob" />
                </button>
              </div>
            </template>

            <!-- Sticky footer (inside form so submit button triggers @finish) -->
            <div class="drawer-foot">
              <button v-if="!agent?.is_system" type="submit" class="btn-save">Save changes</button>
              <button type="button" class="btn-cancel" @click="$emit('close')">
                {{ agent?.is_system ? "Close" : "Cancel" }}
              </button>
            </div>
          </a-form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.scrim {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  z-index: 40;
}

.drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 420px;
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
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  padding: 16px 20px 14px;
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
}

.head-info {
  flex: 1;
  min-width: 0;
}

.drawer-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--ink);
  letter-spacing: -0.015em;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.drawer-sub {
  font-size: 12px;
  color: var(--ink-3);
  margin-top: 2px;
}

.model-chip {
  display: inline-flex;
  padding: 2px 8px;
  border-radius: 20px;
  font-size: 10.5px;
  font-weight: 600;
  font-family: var(--font-mono);
  background: var(--bg-2);
  color: var(--ink-4);
  border: 1px solid var(--line);
}

.close-btn {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--line-2);
  background: var(--surface);
  border-radius: var(--r-sm);
  font-size: 13px;
  color: var(--ink-3);
  cursor: pointer;
}

.close-btn:hover {
  background: var(--bg-2);
  color: var(--ink);
}

.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px 0;
}

.section-divider {
  border: none;
  border-top: 1px solid var(--line);
  margin: 4px 0 16px;
}

.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 16px;
}

.drawer-foot {
  position: sticky;
  bottom: 0;
  display: flex;
  gap: 8px;
  padding: 14px 0 20px;
  background: var(--surface);
  border-top: 1px solid var(--line);
  margin-top: 8px;
}

.btn-save {
  flex: 1;
  padding: 10px;
  background: var(--brand);
  color: #fff;
  border: none;
  border-radius: var(--r-sm);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.btn-save:hover {
  background: var(--brand-2);
}

.btn-cancel {
  padding: 10px 16px;
  background: var(--surface);
  color: var(--ink-2);
  border: 1px solid var(--line-2);
  border-radius: var(--r-sm);
  font-size: 13px;
  cursor: pointer;
}

.btn-cancel:hover {
  background: var(--bg-2);
}

.default-toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: var(--bg);
  border: 1px solid var(--line);
  border-radius: var(--r);
  gap: 12px;
}

.default-toggle-row--on {
  background: var(--brand-tint);
  border-color: var(--brand);
}

.default-toggle-info {
  flex: 1;
  min-width: 0;
}

.default-toggle-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--ink);
}

.default-toggle-sub {
  font-size: 11.5px;
  color: var(--ink-3);
  margin-top: 2px;
}

.default-toggle-row--on .default-toggle-sub {
  color: var(--brand);
}

.toggle-switch {
  width: 38px;
  height: 22px;
  border-radius: 11px;
  background: var(--line-2);
  border: none;
  cursor: pointer;
  position: relative;
  flex-shrink: 0;
  transition: background var(--dur) var(--ease);
  padding: 0;
}

.toggle-switch--on {
  background: var(--brand);
  cursor: default;
}

.toggle-switch:disabled {
  cursor: default;
}

.toggle-knob {
  display: block;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  position: absolute;
  top: 2px;
  left: 2px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  transition: transform var(--dur) var(--ease);
}

.toggle-switch--on .toggle-knob {
  transform: translateX(16px);
}

.model-opt {
  padding: 2px 0;
}

.model-opt-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.model-opt-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--ink);
}

.model-badge {
  padding: 1px 8px;
  border-radius: 20px;
  font-size: 10.5px;
  font-weight: 600;
  background: var(--bg-2);
  color: var(--ink-4);
  border: 1px solid var(--line);
  flex-shrink: 0;
}

.model-badge--rec {
  background: var(--brand);
  color: #fff;
  border-color: var(--brand);
}

.model-opt-desc {
  font-size: 11.5px;
  color: var(--ink-3);
  margin-top: 1px;
}

.guide-link {
  margin-top: 6px;
  padding: 0;
  border: none;
  background: none;
  font-size: 12px;
  color: var(--brand);
  cursor: pointer;
}

.guide-link:hover {
  text-decoration: underline;
}

.guide-panel {
  margin-top: 8px;
  padding: 12px;
  background: var(--brand-tint);
  border: 1px solid var(--brand);
  border-radius: var(--r);
}

.guide-question {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--ink);
  margin-bottom: 8px;
}

.guide-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.guide-chip {
  padding: 4px 12px;
  border-radius: 20px;
  border: 1px solid var(--line-2);
  background: var(--surface);
  font-size: 12px;
  color: var(--ink-2);
  cursor: pointer;
}

.guide-chip--on {
  border-color: var(--brand);
  color: var(--brand);
}

.guide-reco {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 10px;
  padding: 10px 12px;
  background: var(--surface);
  border: 1px solid var(--brand);
  border-radius: var(--r-sm);
}

.guide-reco-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
  margin-right: 6px;
}

.guide-reco-reason {
  font-size: 11.5px;
  color: var(--ink-3);
  margin-top: 2px;
}

.guide-use-btn {
  padding: 6px 12px;
  background: var(--brand);
  color: #fff;
  border: none;
  border-radius: var(--r-sm);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  flex-shrink: 0;
}

.guide-use-btn:hover {
  background: var(--brand-2);
}
</style>
