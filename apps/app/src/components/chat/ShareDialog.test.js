// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest"
import { mount } from "@vue/test-utils"
import { ref } from "vue"

// Modal/Button/Input are imported directly, so mock the module instead of stubbing by name.
vi.mock("ant-design-vue", () => ({
  Modal: {
    name: "Modal",
    props: { open: { type: Boolean, default: false }, title: { type: String, default: "" } },
    emits: ["cancel"],
    template: `<div v-if="open" class="modal-stub"><slot /></div>`,
  },
  Button: {
    name: "Button",
    props: {
      loading: { type: Boolean, default: false },
      danger: { type: Boolean, default: false },
    },
    template: `<button class="btn-stub" :class="{ danger }"><slot /></button>`,
  },
  Input: {
    name: "Input",
    props: { value: { type: String, default: "" } },
    template: `<input class="input-stub" :value="value" readonly />`,
  },
}))

const share = ref(null)
const actions = { load: vi.fn(), create: vi.fn(), update: vi.fn(), revoke: vi.fn(), copy: vi.fn() }
vi.mock("@/composables/useConversationShare", () => ({
  useConversationShare: () => ({ share, loading: ref(false), ...actions }),
}))

import ShareDialog from "./ShareDialog.vue"

const row = {
  id: "s1",
  url: "http://localhost:8080/chat/s1",
  updated_at: "2026-09-18T10:00:00.000Z",
}

async function openDialog() {
  const wrapper = mount(ShareDialog, {
    props: { open: false, workspaceId: "ws1", conversationId: "c1" },
  })
  await wrapper.setProps({ open: true })
  return wrapper
}

const buttonNamed = (wrapper, label) => wrapper.findAll("button").find((b) => b.text() === label)

describe("ShareDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    share.value = null
  })

  it("loads the share when opened and offers to create a link", async () => {
    const wrapper = await openDialog()
    expect(actions.load).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain("New messages stay private until you update the link.")
    await buttonNamed(wrapper, "Create link").trigger("click")
    expect(actions.create).toHaveBeenCalledTimes(1)
  })

  it("shows the url with copy and update actions when shared", async () => {
    share.value = row
    const wrapper = await openDialog()
    expect(wrapper.find(".input-stub").element.value).toBe(row.url)
    await buttonNamed(wrapper, "Copy").trigger("click")
    await buttonNamed(wrapper, "Update snapshot").trigger("click")
    expect(actions.copy).toHaveBeenCalledTimes(1)
    expect(actions.update).toHaveBeenCalledTimes(1)
  })

  it("asks for confirmation before it revokes", async () => {
    share.value = row
    const wrapper = await openDialog()
    await buttonNamed(wrapper, "Revoke link").trigger("click")
    expect(actions.revoke).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain("Anyone who has the link loses access.")
    await buttonNamed(wrapper, "Revoke").trigger("click")
    expect(actions.revoke).toHaveBeenCalledTimes(1)
  })

  it("emits close on cancel and resets the confirm state", async () => {
    share.value = row
    const wrapper = await openDialog()
    await buttonNamed(wrapper, "Revoke link").trigger("click")
    wrapper.findComponent({ name: "Modal" }).vm.$emit("cancel")
    expect(wrapper.emitted("close")).toHaveLength(1)
    await wrapper.setProps({ open: false })
    await wrapper.setProps({ open: true })
    expect(wrapper.text()).not.toContain("Anyone who has the link loses access.")
  })
})
