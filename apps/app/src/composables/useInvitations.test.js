// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest"
import { mount } from "@vue/test-utils"
import { createPinia, setActivePinia } from "pinia"

vi.mock("@/api/invitations", () => ({ acceptInvitation: vi.fn() }))
vi.mock("@/api/members", () => ({ inviteMember: vi.fn() }))
vi.mock("ant-design-vue", () => ({ message: { success: vi.fn(), error: vi.fn() } }))

import { useInvitations } from "@/composables/useInvitations"
import { useInvitationsStore } from "@/stores/invitations"

/** Mount a throwaway host so the composable runs inside a component setup. */
function withInvitations(pinia) {
  let api
  mount(
    {
      setup() {
        api = useInvitations()
        return () => null
      },
    },
    { global: { plugins: [pinia] } },
  )
  return api
}

describe("useInvitations", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Regression: MyInvitationsView destructures handleDecline and the Decline
  // popconfirm calls it; the composable previously never returned it, so the
  // call site resolved to `undefined` and threw at runtime.
  it("exposes handleDecline as a function", () => {
    const pinia = createPinia()
    const api = withInvitations(pinia)
    expect(typeof api.handleDecline).toBe("function")
  })

  it("handleDecline delegates to the store's declineInvitation", async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useInvitationsStore()
    const spy = vi.spyOn(store, "declineInvitation")
    const api = withInvitations(pinia)

    await api.handleDecline("inv-1")

    expect(spy).toHaveBeenCalledWith("inv-1")
  })
})
