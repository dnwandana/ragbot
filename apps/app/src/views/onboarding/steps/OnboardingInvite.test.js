// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest"
import { mount } from "@vue/test-utils"
import { reactive } from "vue"
import OnboardingInvite from "@/views/onboarding/steps/OnboardingInvite.vue"

/**
 * Ant Design component stubs — pass-through so the component's setup() runs in
 * jsdom without Ant's real DOM / teleport behaviour.
 */
const STUBS = {
  /** Renders as <input> so v-model / value + @change wiring is exercisable. */
  AInput: {
    props: ["value", "placeholder", "status"],
    emits: ["update:value", "change"],
    template: `<input
      class="a-input-stub"
      :value="value"
      :placeholder="placeholder"
      @input="$emit('update:value', $event.target.value)"
    />`,
  },
  /** Renders <option>s from the :options prop so selection can be simulated. */
  ASelect: {
    props: ["value", "options", "placeholder", "disabled"],
    emits: ["update:value", "change"],
    template: `<select
      class="a-select-stub"
      :value="value"
      @change="$emit('update:value', $event.target.value); $emit('change', $event.target.value)"
    ><option v-for="o in options" :key="o.value" :value="o.value">{{ o.label }}</option></select>`,
  },
}

/**
 * Build a reactive fake of the onboarding shell context.
 * @returns {object} Reactive ctx with shell actions stubbed
 */
function makeCtx() {
  return reactive({
    roles: [
      { id: "role-1", name: "Member" },
      { id: "role-2", name: "Admin" },
    ],
    errors: {},
    busy: null,
    setError: vi.fn(),
    back: vi.fn(),
    skip: vi.fn(),
    runAction: vi.fn(),
  })
}

/**
 * Mount OnboardingInvite with a fresh ctx and optional prop overrides.
 * @param {object} [props] - Extra props passed to the component
 * @param {object} [ctx] - Shell ctx (defaults to makeCtx())
 * @returns {import("@vue/test-utils").VueWrapper}
 */
function mountInvite(props = {}, ctx = makeCtx()) {
  return mount(OnboardingInvite, {
    props: { ctx, invites: [], ...props },
    global: { stubs: STUBS },
  })
}

describe("OnboardingInvite", () => {
  // ── Rendering ──────────────────────────────────────────────────────────────

  it("renders the step heading and subtitle", () => {
    const wrapper = mountInvite()
    expect(wrapper.find(".ob-title").text()).toBe("Invite your team")
    expect(wrapper.find(".ob-subtitle").text()).toContain("Add teammates by email")
  })

  it("renders an a-input stub for the email field", () => {
    const wrapper = mountInvite()
    expect(wrapper.find(".a-input-stub").exists()).toBe(true)
    expect(wrapper.find(".a-input-stub").attributes("placeholder")).toBe("teammate@acme.com")
  })

  it("renders an a-select stub for the role field", () => {
    const wrapper = mountInvite()
    expect(wrapper.find(".a-select-stub").exists()).toBe(true)
  })

  it("shows the empty-state prompt when the invite list is empty", () => {
    const wrapper = mountInvite()
    expect(wrapper.find(".ob-invite-empty").exists()).toBe(true)
  })

  it("shows the invite list when invites are provided", () => {
    const wrapper = mountInvite({
      invites: [{ email: "alice@acme.com", role_id: "role-1" }],
    })
    expect(wrapper.find(".ob-invite-empty").exists()).toBe(false)
    expect(wrapper.find(".ob-invite-list").exists()).toBe(true)
    expect(wrapper.findAll(".ob-invite-item")).toHaveLength(1)
  })

  it("renders role options inside the select stub", () => {
    const wrapper = mountInvite()
    // The select renders ctx.roles as options
    const options = wrapper.findAll(".a-select-stub option")
    expect(options.length).toBeGreaterThanOrEqual(2)
    expect(options[0].text()).toBe("Member")
    expect(options[1].text()).toBe("Admin")
  })

  // ── Skip path ──────────────────────────────────────────────────────────────

  it("calls ctx.skip() when Skip for now is clicked", async () => {
    const ctx = makeCtx()
    const wrapper = mountInvite({}, ctx)
    await wrapper.find("button.ob-btn-secondary").trigger("click")
    expect(ctx.skip).toHaveBeenCalledOnce()
  })

  it("calls ctx.back() when Back is clicked", async () => {
    const ctx = makeCtx()
    const wrapper = mountInvite({}, ctx)
    await wrapper.find("button.ob-btn-ghost").trigger("click")
    expect(ctx.back).toHaveBeenCalledOnce()
  })

  // ── Submit path ────────────────────────────────────────────────────────────

  it("calls ctx.runAction('invites') when Send invites is clicked with invites present", async () => {
    const ctx = makeCtx()
    const wrapper = mountInvite({ invites: [{ email: "alice@acme.com", role_id: "role-1" }] }, ctx)
    const sendBtn = wrapper.find("button.ob-btn-primary")
    expect(sendBtn.attributes("disabled")).toBeUndefined()
    await sendBtn.trigger("click")
    expect(ctx.runAction).toHaveBeenCalledWith("invites")
  })

  it("disables the Send button when the invite list is empty", () => {
    const wrapper = mountInvite()
    expect(wrapper.find("button.ob-btn-primary").attributes("disabled")).toBeDefined()
  })

  // ── Add invite path ────────────────────────────────────────────────────────

  it("emits update:invites with a new entry when Add is clicked with a valid email", async () => {
    const wrapper = mountInvite()
    // Type into the a-input stub
    const input = wrapper.find(".a-input-stub")
    await input.setValue("bob@example.com")
    await wrapper.find("button.ob-btn-icon").trigger("click")
    const emitted = wrapper.emitted("update:invites")
    expect(emitted).toBeTruthy()
    expect(emitted[0][0]).toEqual([{ email: "bob@example.com", role_id: "role-1" }])
  })

  it("shows a validation error for an invalid email and does NOT emit", async () => {
    const wrapper = mountInvite()
    const input = wrapper.find(".a-input-stub")
    await input.setValue("not-an-email")
    await wrapper.find("button.ob-btn-icon").trigger("click")
    expect(wrapper.emitted("update:invites")).toBeFalsy()
    expect(wrapper.find(".ob-error-text").exists()).toBe(true)
  })

  it("emits update:invites to remove an invite when remove button is clicked", async () => {
    const wrapper = mountInvite({
      invites: [
        { email: "alice@acme.com", role_id: "role-1" },
        { email: "bob@acme.com", role_id: "role-2" },
      ],
    })
    // Click the first remove button
    await wrapper.find("button.ob-icon-btn").trigger("click")
    const emitted = wrapper.emitted("update:invites")
    expect(emitted).toBeTruthy()
    // alice removed, bob remains
    expect(emitted[0][0]).toEqual([{ email: "bob@acme.com", role_id: "role-2" }])
  })

  it("emits an empty array when Clear all is clicked", async () => {
    const wrapper = mountInvite({
      invites: [{ email: "alice@acme.com", role_id: "role-1" }],
    })
    await wrapper.find("button.ob-link").trigger("click")
    expect(wrapper.emitted("update:invites")?.[0]?.[0]).toEqual([])
  })
})
