// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { mount } from "@vue/test-utils"
import WorkspaceFormModal from "@/components/WorkspaceFormModal.vue"

// Pass-through stubs for the Ant Design components used by the modal.
const AModal = { template: `<div><slot /></div>` }
const AForm = { template: `<form @submit.prevent="$emit('finish')"><slot /></form>` }
const AFormItem = { template: `<div><slot /></div>` }
const AInput = {
  props: ["value"],
  emits: ["update:value"],
  template: `<input class="ws-name" :value="value" @input="$emit('update:value', $event.target.value)" />`,
}
const ATextarea = {
  props: ["value"],
  emits: ["update:value"],
  template: `<textarea class="ws-desc" :value="value" @input="$emit('update:value', $event.target.value)" />`,
}
const AButton = { template: `<button type="submit"><slot /></button>` }

const GLOBAL = {
  stubs: {
    "a-modal": AModal,
    "a-form": AForm,
    "a-form-item": AFormItem,
    "a-input": AInput,
    "a-textarea": ATextarea,
    "a-button": AButton,
  },
}

describe("WorkspaceFormModal", () => {
  it("pre-fills name and description when editing", () => {
    const wrapper = mount(WorkspaceFormModal, {
      props: { visible: true, workspace: { id: "w1", name: "Acme", description: "Support" } },
      global: GLOBAL,
    })
    expect(wrapper.find(".ws-name").element.value).toBe("Acme")
    expect(wrapper.find(".ws-desc").element.value).toBe("Support")
  })

  it("starts empty in create mode", () => {
    const wrapper = mount(WorkspaceFormModal, {
      props: { visible: true, workspace: null },
      global: GLOBAL,
    })
    expect(wrapper.find(".ws-name").element.value).toBe("")
    expect(wrapper.find(".ws-desc").element.value).toBe("")
  })

  it("emits submit with name and description", async () => {
    const wrapper = mount(WorkspaceFormModal, {
      props: { visible: true, workspace: null },
      global: GLOBAL,
    })
    await wrapper.find(".ws-name").setValue("New WS")
    await wrapper.find(".ws-desc").setValue("A description")
    await wrapper.find("form").trigger("submit")

    expect(wrapper.emitted("submit")).toBeTruthy()
    expect(wrapper.emitted("submit")[0][0]).toEqual({
      name: "New WS",
      description: "A description",
    })
  })

  it("omits description when left blank", async () => {
    const wrapper = mount(WorkspaceFormModal, {
      props: { visible: true, workspace: null },
      global: GLOBAL,
    })
    await wrapper.find(".ws-name").setValue("Just a name")
    await wrapper.find("form").trigger("submit")

    const payload = wrapper.emitted("submit")[0][0]
    expect(payload.name).toBe("Just a name")
    expect(payload.description).toBeUndefined()
  })
})
