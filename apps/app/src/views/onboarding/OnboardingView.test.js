// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { mount, flushPromises } from "@vue/test-utils"

const {
  createAgent,
  createWorkspace,
  createDataset,
  fetchRoles,
  fetchWorkspaces,
  wsState,
  inviteMember,
} = vi.hoisted(() => ({
  createAgent: vi.fn().mockResolvedValue({}),
  createWorkspace: vi.fn().mockResolvedValue({ id: "ws1" }),
  createDataset: vi.fn().mockResolvedValue({ id: "ds1" }),
  fetchRoles: vi.fn().mockResolvedValue(undefined),
  fetchWorkspaces: vi.fn().mockResolvedValue(undefined),
  wsState: { workspaces: [] },
  inviteMember: vi.fn(),
}))

vi.mock("vue-router", async (importOriginal) => ({
  ...(await importOriginal()),
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock("@/stores/workspaces", () => ({
  useWorkspacesStore: () => ({
    createWorkspace,
    fetchWorkspaces,
    get workspaces() {
      return wsState.workspaces
    },
  }),
}))
vi.mock("@/stores/roles", () => ({
  useRolesStore: () => ({ fetchRoles, roles: [] }),
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
vi.mock("@/api/members", () => ({ inviteMember }))

import OnboardingView from "@/views/onboarding/OnboardingView.vue"
import { DEFAULT_MODEL_CONFIG } from "@/constants/models"
import {
  descriptionForTemplate,
  DEFAULT_AGENT_NAME,
  DEFAULT_AGENT_PROMPT,
} from "@/views/onboarding/agentTemplates.js"

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
  "a-button": true,
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

const InviteStepStub = {
  props: ["ctx"],
  template: `<button class="run-invites" @click="ctx.runAction('invites')">Send invites</button>`,
}

describe("OnboardingView source step", () => {
  beforeEach(() => {
    wsState.workspaces = [{ id: "ws1" }]
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
    wsState.workspaces = []
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
    wsState.workspaces = [{ id: "ws1" }]
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
    wsState.workspaces = []
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

describe("OnboardingView stale workspace guard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorage.removeItem("ragbot-onboarding-v1")
    wsState.workspaces = []
  })

  const seed = (createdWorkspaceId) =>
    localStorage.setItem(
      "ragbot-onboarding-v1",
      JSON.stringify({
        view: "steps",
        stepIdx: 3,
        completed: ["workspace"],
        createdWorkspaceId,
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

  it("discards a createdWorkspaceId the current user no longer belongs to", async () => {
    wsState.workspaces = [{ id: "ws1" }] // current user's real workspaces
    seed("stale-ws") // not in the list
    mount(OnboardingView, { global: { stubs: STUBS } })
    await flushPromises()

    expect(fetchRoles).not.toHaveBeenCalled()
    const saved = JSON.parse(localStorage.getItem("ragbot-onboarding-v1"))
    expect(saved.createdWorkspaceId).toBeNull()
    expect(saved.stepIdx).toBe(0)
    expect(saved.view).toBe("steps")
    expect(saved.completed).not.toContain("workspace")
    // Form fields from the previous account must not bleed through.
    expect(saved.formData.workspaceName).toBe("")
    expect(saved.formData.datasetName).toBe("")
    expect(saved.formData.agentName).toBe(DEFAULT_AGENT_NAME)
    expect(saved.formData.agentPrompt).toBe(DEFAULT_AGENT_PROMPT)
  })

  it("keeps a createdWorkspaceId the current user still belongs to and loads its roles", async () => {
    wsState.workspaces = [{ id: "ws1" }]
    seed("ws1")
    mount(OnboardingView, { global: { stubs: STUBS } })
    await flushPromises()

    expect(fetchRoles).toHaveBeenCalledWith("ws1")
    const saved = JSON.parse(localStorage.getItem("ragbot-onboarding-v1"))
    expect(saved.createdWorkspaceId).toBe("ws1")
  })

  it("preserves restored state when membership cannot be verified (fetch fails)", async () => {
    wsState.workspaces = [] // store empty -> guard must fetch to verify
    fetchWorkspaces.mockResolvedValueOnce(false) // verification failed
    seed("real-ws") // a workspace that IS the user's, but we can't confirm right now
    mount(OnboardingView, { global: { stubs: STUBS } })
    await flushPromises()

    expect(fetchWorkspaces).toHaveBeenCalled()
    // Must NOT discard: no roles fetched, state left intact.
    expect(fetchRoles).not.toHaveBeenCalled()
    const saved = JSON.parse(localStorage.getItem("ragbot-onboarding-v1"))
    expect(saved.createdWorkspaceId).toBe("real-ws")
    expect(saved.stepIdx).toBe(3)
    expect(saved.formData.workspaceName).toBe("Acme")
  })

  it("clears all completed step markers when discarding stale state", async () => {
    wsState.workspaces = [{ id: "ws1" }] // populated -> guard skips fetch, deterministic
    localStorage.setItem(
      "ragbot-onboarding-v1",
      JSON.stringify({
        view: "steps",
        stepIdx: 3,
        completed: ["workspace", "invites"], // later step also marked done
        createdWorkspaceId: "stale-ws", // not in the user's list
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
    mount(OnboardingView, { global: { stubs: STUBS } })
    await flushPromises()

    const saved = JSON.parse(localStorage.getItem("ragbot-onboarding-v1"))
    expect(saved.completed).toEqual([])
  })
})

describe("OnboardingView invites step", () => {
  beforeEach(() => {
    wsState.workspaces = [{ id: "ws1" }]
    vi.clearAllMocks()
    localStorage.setItem(
      "ragbot-onboarding-v1",
      JSON.stringify({
        view: "steps",
        stepIdx: 1,
        completed: ["workspace"],
        createdWorkspaceId: "ws1",
        formData: {
          workspaceName: "Acme",
          workspaceDescription: "",
          invites: [
            { email: "a@x.com", role_id: "r1" },
            { email: "bad@x.com", role_id: "r1" },
            { email: "c@x.com", role_id: "r1" },
          ],
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
    wsState.workspaces = []
  })

  it("partial failure retains only the failed invite, does not advance, does not complete", async () => {
    inviteMember.mockImplementation((_wsId, { email }) =>
      email === "bad@x.com" ? Promise.reject(new Error("nope")) : Promise.resolve({}),
    )
    const wrapper = mount(OnboardingView, {
      global: { stubs: { ...STUBS, OnboardingInvite: InviteStepStub } },
    })
    await flushPromises()
    await wrapper.find(".run-invites").trigger("click")
    await flushPromises()

    const saved = JSON.parse(localStorage.getItem("ragbot-onboarding-v1"))
    expect(saved.formData.invites).toEqual([{ email: "bad@x.com", role_id: "r1" }])
    expect(saved.stepIdx).toBe(1)
    expect(saved.completed).not.toContain("invites")
  })

  it("all success advances and marks complete", async () => {
    inviteMember.mockResolvedValue({})
    const wrapper = mount(OnboardingView, {
      global: { stubs: { ...STUBS, OnboardingInvite: InviteStepStub } },
    })
    await flushPromises()
    await wrapper.find(".run-invites").trigger("click")
    await flushPromises()

    const saved = JSON.parse(localStorage.getItem("ragbot-onboarding-v1"))
    expect(saved.completed).toContain("invites")
    expect(saved.stepIdx).toBe(2)
  })
})
