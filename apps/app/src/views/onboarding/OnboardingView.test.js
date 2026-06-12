// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { mount, flushPromises } from "@vue/test-utils"

const { createAgent } = vi.hoisted(() => ({ createAgent: vi.fn().mockResolvedValue({}) }))

vi.mock("vue-router", async (importOriginal) => ({
  ...(await importOriginal()),
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock("@/stores/workspaces", () => ({
  useWorkspacesStore: () => ({ createWorkspace: vi.fn() }),
}))
vi.mock("@/stores/roles", () => ({
  useRolesStore: () => ({ fetchRoles: vi.fn().mockResolvedValue(undefined), roles: [] }),
}))
vi.mock("@/stores/datasets", () => ({
  useDatasetsStore: () => ({ createDataset: vi.fn() }),
}))
vi.mock("@/stores/datasetFiles", () => ({
  useDatasetFilesStore: () => ({ uploadFile: vi.fn(), scrapeUrl: vi.fn() }),
}))
vi.mock("@/stores/agents", () => ({
  useAgentsStore: () => ({ createAgent }),
}))
vi.mock("@/api/members", () => ({ inviteMember: vi.fn() }))

import OnboardingView from "@/views/onboarding/OnboardingView.vue"
import { DEFAULT_MODEL_CONFIG } from "@/constants/models"
import { descriptionForTemplate } from "@/views/onboarding/agentTemplates.js"

const AgentStepStub = {
  props: ["ctx"],
  template: `<button class="run-agent" @click="ctx.runAction('agent')">Create agent</button>`,
}

const STUBS = {
  OnboardingProgress: true,
  OnboardingToast: true,
  OnboardingWelcome: true,
  OnboardingWorkspace: true,
  OnboardingInvite: true,
  OnboardingSource: true,
  OnboardingAgent: AgentStepStub,
  OnboardingComplete: true,
}

describe("OnboardingView agent step", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Land directly on the agent step with a workspace already created —
    // the view restores this state from localStorage in onMounted.
    localStorage.setItem(
      "ragbot-onboarding-v1",
      JSON.stringify({
        view: "steps",
        stepIdx: 3,
        completed: ["workspace"],
        createdWorkspaceId: "ws1",
        formData: {
          workspaceName: "Acme",
          invites: [],
          datasetName: "",
          files: [],
          agentName: "Helper",
          agentTemplate: "support",
          agentPrompt: "You are helpful.",
        },
      }),
    )
  })

  afterEach(() => {
    localStorage.removeItem("ragbot-onboarding-v1")
  })

  it("creates the agent with the catalog default model_config", async () => {
    const wrapper = mount(OnboardingView, { global: { stubs: STUBS } })
    await flushPromises()
    await wrapper.find(".run-agent").trigger("click")
    await flushPromises()
    expect(createAgent).toHaveBeenCalledWith("ws1", {
      name: "Helper",
      description: descriptionForTemplate("support"),
      system_prompt: "You are helpful.",
      model_config: { ...DEFAULT_MODEL_CONFIG },
      is_default: true,
    })
  })
})
