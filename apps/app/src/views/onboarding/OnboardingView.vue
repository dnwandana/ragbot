<script setup>
import { ref, reactive, computed, watchEffect, onMounted, onUnmounted } from "vue"
import { useRouter } from "vue-router"
import { LayoutGrid, UserPlus, Database, Bot, ArrowRight } from "lucide-vue-next"
import { useWorkspacesStore } from "@/stores/workspaces"
import { useRolesStore } from "@/stores/roles"
import { useDatasetsStore } from "@/stores/datasets"
import { useDatasetFilesStore } from "@/stores/datasetFiles"
import { useAgentsStore } from "@/stores/agents"
import { inviteMember as apiInviteMember } from "@/api/members"
import {
  DEFAULT_AGENT_NAME,
  DEFAULT_AGENT_PROMPT,
  descriptionForTemplate,
} from "./agentTemplates.js"
import { DEFAULT_MODEL_CONFIG } from "@/constants/models"
import OnboardingProgress from "@/components/onboarding/OnboardingProgress.vue"
import OnboardingToast from "@/components/onboarding/OnboardingToast.vue"
import OnboardingWelcome from "./steps/OnboardingWelcome.vue"
import OnboardingWorkspace from "./steps/OnboardingWorkspace.vue"
import OnboardingInvite from "./steps/OnboardingInvite.vue"
import OnboardingSource from "./steps/OnboardingSource.vue"
import OnboardingAgent from "./steps/OnboardingAgent.vue"
import OnboardingComplete from "./steps/OnboardingComplete.vue"
import "./onboarding.css"

const router = useRouter()
const workspacesStore = useWorkspacesStore()
const rolesStore = useRolesStore()
const datasetsStore = useDatasetsStore()
const filesStore = useDatasetFilesStore()
const agentsStore = useAgentsStore()

const LS_KEY = "ragbot-onboarding-v1"
const RESERVED = ["admin", "test", "ragbot", "demo", "www", "api"]

const STEPS = [
  { key: "workspace", label: "Create your workspace", icon: LayoutGrid, required: true },
  { key: "invites", label: "Invite your team", icon: UserPlus, required: false },
  { key: "source", label: "Add a knowledge source", icon: Database, required: false },
  { key: "agent", label: "Create your first agent", icon: Bot, required: false },
]

const view = ref("welcome")
const stepIdx = ref(0)
const formData = reactive({
  workspaceName: "",
  workspaceDescription: "",
  invites: [],
  datasetName: "",
  datasetDescription: "",
  files: [],
  agentName: DEFAULT_AGENT_NAME,
  agentTemplate: "support",
  agentPrompt: DEFAULT_AGENT_PROMPT,
})
const completed = ref(new Set())
const busy = ref(null)
const errors = ref({})
const toast = ref(null)
const createdWorkspaceId = ref(null)
const createdDatasetId = ref(null)
const roles = ref([])
const exitOpen = ref(false)
const animDir = ref(1)
const animating = ref(false)
let toastTimer = null

const doneSet = computed(() => {
  const s = new Set()
  STEPS.forEach((step, i) => {
    if (completed.value.has(step.key)) s.add(i)
  })
  return s
})

const panelKey = computed(() => {
  if (view.value === "welcome") return "welcome"
  if (view.value === "complete") return "complete"
  return STEPS[stepIdx.value]?.key ?? "step"
})

function triggerAnim(dir) {
  animDir.value = dir
  animating.value = true
  setTimeout(() => {
    animating.value = false
  }, 320)
}

function next() {
  triggerAnim(1)
  view.value = "steps"
  stepIdx.value = 0
}

function back() {
  triggerAnim(-1)
  if (view.value === "complete") {
    view.value = "steps"
    stepIdx.value = STEPS.length - 1
    return
  }
  if (stepIdx.value === 0) {
    view.value = "welcome"
  } else {
    stepIdx.value--
  }
}

function advance() {
  triggerAnim(1)
  if (stepIdx.value >= STEPS.length - 1) {
    view.value = "complete"
  } else {
    stepIdx.value++
  }
}

function skip() {
  advance()
}

function finish() {
  try {
    localStorage.removeItem(LS_KEY)
  } catch {
    /* intentional */
  }
  router.push({ name: "ConversationsList", params: { workspaceId: createdWorkspaceId.value } })
}

function exitLater() {
  exitOpen.value = false
  router.push("/workspaces")
}

/**
 * @param {'workspace'|'invites'|'source'|'agent'} key
 */
function goToItem(key) {
  try {
    localStorage.removeItem(LS_KEY)
  } catch {
    /* intentional */
  }
  const wid = createdWorkspaceId.value
  switch (key) {
    case "workspace":
      router.push("/workspaces")
      break
    case "invites":
      router.push(`/workspaces/${wid}/settings/members`)
      break
    case "source":
      router.push(`/workspaces/${wid}/datasets/${createdDatasetId.value}`)
      break
    case "agent":
      router.push(`/workspaces/${wid}/agents`)
      break
  }
}

/**
 * @param {string} msg
 * @param {'ok'|'err'} [tone]
 */
function showToast(msg, tone = "ok") {
  toast.value = { msg, tone }
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toast.value = null
  }, 2600)
}

/**
 * @param {string} key
 * @param {string|null} msg
 */
function setError(key, msg) {
  errors.value = { ...errors.value, [key]: msg }
}

/**
 * @param {string} s
 * @returns {string}
 */
function slugify(s) {
  return (s || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/**
 * @param {string} key
 */
async function runAction(key) {
  if (key !== "workspace" && !createdWorkspaceId.value) {
    showToast("Please complete the workspace step first", "err")
    view.value = "steps"
    stepIdx.value = 0
    return
  }

  if (key === "workspace") {
    const name = formData.workspaceName.trim()
    if (!name) {
      setError("workspace", "Workspace name is required.")
      return
    }
    if (RESERVED.includes(slugify(name))) {
      setError("workspace", `"${name}" is a reserved name. Try another.`)
      return
    }
    busy.value = "workspace"
    try {
      const workspace = await workspacesStore.createWorkspace({
        name,
        description: formData.workspaceDescription.trim() || undefined,
      })
      createdWorkspaceId.value = workspace.id
      await rolesStore.fetchRoles(workspace.id)
      roles.value = rolesStore.roles
      completed.value = new Set([...completed.value, "workspace"])
      showToast("Workspace created")
      advance()
    } catch {
      showToast("Failed to create workspace", "err")
    } finally {
      busy.value = null
    }
  }

  if (key === "invites") {
    const list = formData.invites
    busy.value = "invites"
    try {
      const results = await Promise.allSettled(
        list.map(({ email, role_id }) =>
          apiInviteMember(createdWorkspaceId.value, { email, role_id }),
        ),
      )
      const sent = results.filter((r) => r.status === "fulfilled").length
      if (sent === 0 && list.length > 0) {
        showToast("Failed to send invites — check the addresses and try again", "err")
      } else {
        completed.value = new Set([...completed.value, "invites"])
        showToast(`${sent} of ${list.length} ${list.length === 1 ? "invite" : "invites"} sent`)
        advance()
      }
    } finally {
      busy.value = null
    }
  }

  if (key === "source") {
    if (!formData.datasetName.trim()) {
      showToast("Please name your dataset before continuing", "err")
      return
    }
    busy.value = "source"
    try {
      const dataset = await datasetsStore.createDataset(createdWorkspaceId.value, {
        name: formData.datasetName,
        description: formData.datasetDescription.trim() || undefined,
      })
      createdDatasetId.value = dataset.id
      await Promise.allSettled([
        ...formData.files
          .filter((f) => f.type === "file" && f.raw)
          .map((f) => filesStore.uploadFile(createdWorkspaceId.value, dataset.id, f.raw)),
        ...formData.files
          .filter((f) => f.type === "url")
          .map((f) => filesStore.scrapeUrl(createdWorkspaceId.value, dataset.id, f.name)),
      ])
      completed.value = new Set([...completed.value, "source"])
      showToast("Dataset added")
      advance()
    } catch {
      showToast("Failed to create dataset", "err")
    } finally {
      busy.value = null
    }
  }

  if (key === "agent") {
    if (!formData.agentName.trim()) {
      setError("agent", "Give your agent a name.")
      return
    }
    busy.value = "agent"
    try {
      await agentsStore.createAgent(createdWorkspaceId.value, {
        name: formData.agentName,
        description: descriptionForTemplate(formData.agentTemplate),
        system_prompt: formData.agentPrompt,
        model_config: { ...DEFAULT_MODEL_CONFIG },
        is_default: true,
      })
      completed.value = new Set([...completed.value, "agent"])
      showToast("Agent created")
      advance()
    } catch {
      showToast("Failed to create agent", "err")
    } finally {
      busy.value = null
    }
  }
}

const ctx = computed(() => ({
  formData,
  steps: STEPS,
  completed: completed.value,
  busy: busy.value,
  errors: errors.value,
  roles: roles.value,
  createdWorkspaceId: createdWorkspaceId.value,
  createdDatasetId: createdDatasetId.value,
  next,
  back,
  advance,
  skip,
  finish,
  runAction,
  setError,
  goToItem,
}))

function saveState() {
  try {
    const safeFiles = formData.files
      .filter((f) => f.status === "ready" || f.status === "done")
      // eslint-disable-next-line no-unused-vars
      .map(({ raw: _raw, ...rest }) => ({ ...rest, raw: null }))
    localStorage.setItem(
      LS_KEY,
      JSON.stringify({
        view: view.value,
        stepIdx: stepIdx.value,
        formData: { ...formData, files: safeFiles },
        completed: [...completed.value],
        createdWorkspaceId: createdWorkspaceId.value,
        createdDatasetId: createdDatasetId.value,
      }),
    )
  } catch {
    /* intentional */
  }
}

function restoreState() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return
    // finish() calls localStorage.removeItem(LS_KEY), so a completed
    // session can never be restored here.
    const saved = JSON.parse(raw)
    if (saved.view) view.value = saved.view
    if (typeof saved.stepIdx === "number") stepIdx.value = saved.stepIdx
    if (saved.formData) Object.assign(formData, saved.formData)
    if (saved.completed) completed.value = new Set(saved.completed)
    if (saved.createdWorkspaceId) createdWorkspaceId.value = saved.createdWorkspaceId
    if (saved.createdDatasetId) createdDatasetId.value = saved.createdDatasetId
  } catch {
    /* intentional */
  }
}

restoreState()
// Persist wizard state on every change. Registered synchronously so it is
// captured by the component's effect scope and auto-disposed on unmount.
watchEffect(saveState)

onMounted(async () => {
  if (createdWorkspaceId.value && !roles.value.length) {
    try {
      await rolesStore.fetchRoles(createdWorkspaceId.value)
      roles.value = [...rolesStore.roles]
    } catch {
      /* non-fatal — invite step remains skippable */
    }
  }
})

onUnmounted(() => clearTimeout(toastTimer))
</script>

<template>
  <div class="ob-stage">
    <OnboardingToast :toast="toast" />

    <div class="ob-card">
      <div class="ob-topbar">
        <img src="/logo.svg" alt="RAGBot" class="ob-topbar-logo" />
        <button v-if="view !== 'complete'" class="ob-exit" @click="exitOpen = true">
          Exit &amp; resume later
        </button>
      </div>

      <div v-if="view === 'steps'" class="ob-progress-wrap">
        <OnboardingProgress :steps="STEPS" :current="stepIdx" :done="doneSet" />
      </div>

      <div class="ob-card-body">
        <div
          class="ob-panel"
          :class="{
            'ob-in-fwd': animating && animDir > 0,
            'ob-in-back': animating && animDir < 0,
          }"
          :key="panelKey"
        >
          <OnboardingWelcome v-if="view === 'welcome'" :ctx="ctx" />
          <template v-else-if="view === 'steps'">
            <OnboardingWorkspace
              v-if="STEPS[stepIdx].key === 'workspace'"
              :ctx="ctx"
              :workspace-name="formData.workspaceName"
              :workspace-description="formData.workspaceDescription"
              @update:workspace-name="formData.workspaceName = $event"
              @update:workspace-description="formData.workspaceDescription = $event"
            />
            <OnboardingInvite
              v-else-if="STEPS[stepIdx].key === 'invites'"
              :ctx="ctx"
              :invites="formData.invites"
              @update:invites="formData.invites = $event"
            />
            <OnboardingSource
              v-else-if="STEPS[stepIdx].key === 'source'"
              :ctx="ctx"
              :dataset-name="formData.datasetName"
              :dataset-description="formData.datasetDescription"
              :files="formData.files"
              @update:dataset-name="formData.datasetName = $event"
              @update:dataset-description="formData.datasetDescription = $event"
              @update:files="formData.files = $event"
            />
            <OnboardingAgent
              v-else-if="STEPS[stepIdx].key === 'agent'"
              :ctx="ctx"
              :agent-name="formData.agentName"
              :agent-template="formData.agentTemplate"
              :agent-prompt="formData.agentPrompt"
              @update:agent-name="formData.agentName = $event"
              @update:agent-template="formData.agentTemplate = $event"
              @update:agent-prompt="formData.agentPrompt = $event"
            />
          </template>
          <OnboardingComplete v-else-if="view === 'complete'" :ctx="ctx" />
        </div>
      </div>
    </div>

    <div v-if="exitOpen" class="ob-scrim" @click="exitOpen = false">
      <div class="ob-modal" role="dialog" aria-modal="true" @click.stop>
        <h2 class="ob-modal-title">Exit setup?</h2>
        <p class="ob-modal-body">
          Your progress is saved. You can pick up right where you left off whenever you're ready.
        </p>
        <div class="ob-modal-actions">
          <button class="ob-btn ob-btn-secondary" @click="exitOpen = false">Keep setting up</button>
          <button class="ob-btn ob-btn-primary" @click="exitLater">
            Exit to dashboard <ArrowRight :size="16" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
