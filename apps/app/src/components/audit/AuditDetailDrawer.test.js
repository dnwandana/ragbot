// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest"
import { mount } from "@vue/test-utils"
import AuditDetailDrawer from "./AuditDetailDrawer.vue"

vi.mock("@/composables/useFormattedTime", () => ({
  useFormattedTime: () => ({ absoluteDateTime: () => "June 19, 2026, 09:00" }),
}))

// a-drawer stub: teleports its default slot to document.body, applies root-class-name
// as a class, and only renders content when :open is true.
const ADrawerStub = {
  props: {
    open: { type: Boolean, default: false },
    rootClassName: { type: String, default: "" },
  },
  template: `
    <teleport to="body">
      <div v-if="open" :class="rootClassName">
        <slot />
      </div>
    </teleport>
  `,
}

const event = {
  id: "evt_1",
  entity_type: "agent",
  action: "create",
  created_at: "2026-06-19T02:00:00Z",
  changes: null,
  context: null,
}

describe("AuditDetailDrawer", () => {
  it("does not render an open drawer when event is null", () => {
    const wrapper = mount(AuditDetailDrawer, {
      props: { event: null, actor: null },
      attachTo: document.body,
      global: { stubs: { "a-drawer": ADrawerStub } },
    })
    expect(document.querySelector(".ad-drawer-root")).toBe(null)
    wrapper.unmount()
  })

  it("renders an open a-drawer with the event title when event is set", async () => {
    const wrapper = mount(AuditDetailDrawer, {
      props: { event, actor: null },
      attachTo: document.body,
      global: { stubs: { "a-drawer": ADrawerStub } },
    })
    await wrapper.vm.$nextTick()
    expect(document.querySelector(".ad-drawer-root")).not.toBe(null)
    wrapper.unmount()
  })

  it("emits close when the drawer requests close", async () => {
    const wrapper = mount(AuditDetailDrawer, {
      props: { event, actor: null },
      attachTo: document.body,
      global: { stubs: { "a-drawer": ADrawerStub } },
    })
    await wrapper.vm.$nextTick()
    document.querySelector(".ad-iconbtn").click()
    expect(wrapper.emitted("close")).toBeTruthy()
    wrapper.unmount()
  })
})
