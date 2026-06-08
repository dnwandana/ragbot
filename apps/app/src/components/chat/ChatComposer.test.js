// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { mount } from "@vue/test-utils"
import ChatComposer from "@/components/chat/ChatComposer.vue"

function mountComposer(props = {}) {
  return mount(ChatComposer, {
    props,
    global: { stubs: { DatasetDrawer: true } },
  })
}

describe("ChatComposer seeding", () => {
  it("seeds the textarea from initialText once", async () => {
    const wrapper = mountComposer({ initialText: "How do I authenticate?" })
    await wrapper.vm.$nextTick()
    expect(wrapper.find("textarea").element.value).toBe("How do I authenticate?")
  })

  it("does not clobber text the user already typed", async () => {
    const wrapper = mountComposer({ initialText: "" })
    const textarea = wrapper.find("textarea")
    await textarea.setValue("my own text")
    await wrapper.setProps({ initialText: "seeded question" })
    expect(textarea.element.value).toBe("my own text")
  })

  it("seeds only once, even after the field is cleared", async () => {
    const wrapper = mountComposer({ initialText: "first question" })
    await wrapper.vm.$nextTick()
    const textarea = wrapper.find("textarea")
    expect(textarea.element.value).toBe("first question")

    await textarea.setValue("") // user clears it
    await wrapper.setProps({ initialText: "second question" })
    expect(textarea.element.value).toBe("") // one-shot guard: no re-seed
  })
})
