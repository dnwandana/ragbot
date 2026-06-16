// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { mount, flushPromises } from "@vue/test-utils"

const { createAgent, createWorkspace, createDataset } = vi.hoisted(() => ({
  createAgent: vi.fn().mockResolvedValue({}),
  createWorkspace: vi.fn().mockResolvedValue({ id: "ws1" }),
  createDataset: vi.fn().mockResolvedValue({ id: "ds1" }),
}))

vi.mock("vue-router", async (importOriginal) => ({
  ...(await importOriginal()),
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock("@/stores/workspaces", () => ({
  useWorkspacesStore: () => ({ createWorkspace }),
}))
vi.mock("@/stores/roles", () => ({
  useRolesStore: () => ({ fetchRoles: vi.fn().mockResolvedValue(undefined), roles: [] }),
}))
vi.mock("@/stores/datasets", () => ({
  useDatasetsStore: () => ({ createDataset }),
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

const WorkspaceStepStub = {
  props: ["ctx"],
  template: `<button class="run-ws" @click="ctx.runAction('workspace')">Create workspace</button>`,
}

describe("OnboardingView workspace step", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.setItem(
      "ragbot-onboarding-v1",
      JSON.stringify({
        view: "steps",
        stepIdx: 0,
        completed: [],
        formData: {
          workspaceName: "Acme",
          workspaceDescription: "Support team space",
          invites: [],
          datasetName: "",
          datasetDescription: "",
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

  it("creates the workspace with name and description", async () => {
    const wrapper = mount(OnboardingView, {
      global: { stubs: { ...STUBS, OnboardingWorkspace: WorkspaceStepStub } },
    })
    await flushPromises()
    await wrapper.find(".run-ws").trigger("click")
    await flushPromises()
    expect(createWorkspace).toHaveBeenCalledWith({
      name: "Acme",
      description: "Support team space",
    })
  })

  it("omits description when workspaceDescription is blank whitespace", async () => {
    localStorage.setItem(
      "ragbot-onboarding-v1",
      JSON.stringify({
        view: "steps",
        stepIdx: 0,
        completed: [],
        formData: {
          workspaceName: "Acme",
          workspaceDescription: "   ",
          invites: [],
          datasetName: "",
          datasetDescription: "",
          files: [],
          agentName: "Helper",
          agentTemplate: "support",
          agentPrompt: "You are helpful.",
        },
      }),
    )
    const wrapper = mount(OnboardingView, {
      global: { stubs: { ...STUBS, OnboardingWorkspace: WorkspaceStepStub } },
    })
    await flushPromises()
    await wrapper.find(".run-ws").trigger("click")
    await flushPromises()
    expect(createWorkspace.mock.calls[0][0]).toEqual({ name: "Acme" })
  })
})

const SourceStepStub = {
  props: ["ctx"],
  template: `<button class="run-source" @click="ctx.runAction('source')">Add source</button>`,
}

describe("OnboardingView source step", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.setItem(
      "ragbot-onboarding-v1",
      JSON.stringify({
        view: "steps",
        stepIdx: 2,
        completed: ["workspace"],
        createdWorkspaceId: "ws1",
        formData: {
          workspaceName: "Acme",
          workspaceDescription: "",
          invites: [],
          datasetName: "Company knowledge",
          datasetDescription: "HR + policies",
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

  it("creates the dataset with name and description", async () => {
    const wrapper = mount(OnboardingView, {
      global: { stubs: { ...STUBS, OnboardingSource: SourceStepStub } },
    })
    await flushPromises()
    await wrapper.find(".run-source").trigger("click")
    await flushPromises()
    expect(createDataset).toHaveBeenCalledWith("ws1", {
      name: "Company knowledge",
      description: "HR + policies",
    })
  })

  it("omits description when datasetDescription is blank whitespace", async () => {
    localStorage.setItem(
      "ragbot-onboarding-v1",
      JSON.stringify({
        view: "steps",
        stepIdx: 2,
        completed: ["workspace"],
        createdWorkspaceId: "ws1",
        formData: {
          workspaceName: "Acme",
          workspaceDescription: "",
          invites: [],
          datasetName: "Company knowledge",
          datasetDescription: "   ",
          files: [],
          agentName: "Helper",
          agentTemplate: "support",
          agentPrompt: "You are helpful.",
        },
      }),
    )
    const wrapper = mount(OnboardingView, {
      global: { stubs: { ...STUBS, OnboardingSource: SourceStepStub } },
    })
    await flushPromises()
    await wrapper.find(".run-source").trigger("click")
    await flushPromises()
    expect(createDataset.mock.calls[0][1]).toEqual({ name: "Company knowledge" })
  })
})

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
