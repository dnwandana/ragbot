// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { mount } from "@vue/test-utils"
import InviteFormModal from "@/components/InviteFormModal.vue"

// Pass-through stubs so the template renders without a real Ant Modal portal,
// while the component's setup() still runs the real `Form.useForm(formState,
// rules)` — which is where the prior `[Vue warn]: Invalid watch source` came
// from when `rules` was a plain (non-reactive) object. Stubs are keyed by the
// Ant components' registered names (the template uses them via local imports).
const STUBS = {
  AModal: { template: "<div><slot /></div>" },
  AForm: { template: "<form><slot /></form>" },
  AFormItem: { template: "<div><slot /></div>" },
  AInput: { props: ["value"], template: "<input />" },
  ASelect: { props: ["value"], template: "<select><slot /></select>" },
  ASelectOption: { template: "<option><slot /></option>" },
}

describe("InviteFormModal validation rules", () => {
  let warnSpy
  let errorSpy

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    warnSpy.mockRestore()
    errorSpy.mockRestore()
  })

  it("mounts without an 'Invalid watch source' Vue warning", () => {
    mount(InviteFormModal, {
      props: { visible: true, roles: [{ id: "r1", name: "Admin" }] },
      global: { stubs: STUBS },
    })

    const logged = [...warnSpy.mock.calls, ...errorSpy.mock.calls]
      .flat()
      .map((arg) => String(arg))
      .join("\n")
    expect(logged).not.toMatch(/Invalid watch source/)
  })
})
