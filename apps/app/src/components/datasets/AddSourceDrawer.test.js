// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest"
import { mount, flushPromises } from "@vue/test-utils"

const { uploadFile, scrapeUrl, addYouTube } = vi.hoisted(() => ({
  uploadFile: vi.fn(),
  scrapeUrl: vi.fn(),
  addYouTube: vi.fn(),
}))
vi.mock("@/stores/datasetFiles", () => ({
  useDatasetFilesStore: () => ({ uploadFile, scrapeUrl, addYouTube }),
}))

import AddSourceDrawer from "@/components/datasets/AddSourceDrawer.vue"

// a-drawer stub: teleports its default slot to document.body, applies root-class-name
// as a class on the wrapper div, and only renders content when :open is true.
const ADrawerStub = {
  props: {
    open: { type: Boolean, default: false },
    rootClassName: { type: String, default: "" },
    placement: String,
    width: [Number, String],
    closable: Boolean,
    mask: Boolean,
    bodyStyle: Object,
    headerStyle: Object,
  },
  emits: ["close"],
  template: `
    <div>
      <teleport to="body">
        <div v-if="open" :class="rootClassName">
          <slot />
        </div>
      </teleport>
    </div>
  `,
}

// a-tabs stub: renders all pane slots so both tab panes are present in the DOM.
const ATabsStub = {
  props: {
    activeKey: String,
  },
  emits: ["update:activeKey"],
  template: `<div class="a-tabs-stub"><slot /></div>`,
}

// a-tab-pane stub: renders its slot. Note: "key" is a Vue reserved prop so we accept
// "tab" only; the pane is still identifiable via the .a-tab-pane-stub class.
const ATabPaneStub = {
  props: {
    tab: String,
  },
  template: `<div class="a-tab-pane-stub"><slot /></div>`,
}

const STUBS = {
  "a-drawer": ADrawerStub,
  "a-tabs": ATabsStub,
  "a-tab-pane": ATabPaneStub,
}

/**
 * Mount AddSourceDrawer with the drawer open and return a body-scoped query helper.
 * @returns {{ wrapper: import("@vue/test-utils").VueWrapper, q: (sel: string) => Element|null, qq: (sel: string) => NodeListOf<Element> }}
 */
function mountDrawer() {
  const wrapper = mount(AddSourceDrawer, {
    props: { open: true, workspaceId: "ws1", datasetId: "ds1" },
    attachTo: document.body,
    global: { stubs: STUBS },
  })
  const q = (sel) => document.querySelector(sel)
  const qq = (sel) => document.querySelectorAll(sel)
  return { wrapper, q, qq }
}

describe("AddSourceDrawer a-drawer shell", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ""
  })

  it("renders .add-source-drawer-root in the document when open", async () => {
    const { wrapper, q } = mountDrawer()
    await wrapper.vm.$nextTick()
    expect(q(".add-source-drawer-root")).not.toBe(null)
    wrapper.unmount()
  })

  it("does not render .add-source-drawer-root when closed", async () => {
    const wrapper = mount(AddSourceDrawer, {
      props: { open: false, workspaceId: "ws1", datasetId: "ds1" },
      attachTo: document.body,
      global: { stubs: STUBS },
    })
    await wrapper.vm.$nextTick()
    expect(document.querySelector(".add-source-drawer-root")).toBe(null)
    wrapper.unmount()
  })

  it("emits close when the close button is clicked", async () => {
    const { wrapper, q } = mountDrawer()
    await wrapper.vm.$nextTick()
    q(".icon-btn").click()
    expect(wrapper.emitted("close")).toBeTruthy()
    wrapper.unmount()
  })
})

describe("AddSourceDrawer a-tabs panes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ""
  })

  it("renders both tab panes — Upload files and Link", async () => {
    const { wrapper, qq } = mountDrawer()
    await wrapper.vm.$nextTick()
    const panes = qq(".a-tab-pane-stub")
    expect(panes.length).toBe(2)
    wrapper.unmount()
  })

  it("Upload files pane contains the drop zone", async () => {
    const { wrapper, q } = mountDrawer()
    await wrapper.vm.$nextTick()
    expect(q(".drop-zone")).not.toBe(null)
    wrapper.unmount()
  })

  it("Link pane contains the url-input", async () => {
    const { wrapper, q } = mountDrawer()
    await wrapper.vm.$nextTick()
    expect(q(".url-input")).not.toBe(null)
    wrapper.unmount()
  })
})

describe("AddSourceDrawer URL flow", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ""
    scrapeUrl.mockResolvedValue({})
  })

  it("empty input + Enter shows 'Enter a URL.' error and does not call scrapeUrl", async () => {
    const { wrapper, q } = mountDrawer()
    await wrapper.vm.$nextTick()

    const input = q(".url-input")
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }))
    await wrapper.vm.$nextTick()

    expect(q(".url-error").textContent).toBe("Enter a URL.")
    expect(scrapeUrl).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it("invalid scheme 'ftp://x' shows protocol error and does not call scrapeUrl", async () => {
    const { wrapper, q } = mountDrawer()
    await wrapper.vm.$nextTick()

    const input = q(".url-input")
    input.value = "ftp://x"
    input.dispatchEvent(new Event("input"))
    await wrapper.vm.$nextTick()

    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }))
    await wrapper.vm.$nextTick()

    expect(q(".url-error").textContent).toBe("URL must start with http:// or https://")
    expect(scrapeUrl).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it("valid URL calls scrapeUrl, emits 'scraped', and clears the input", async () => {
    const { wrapper, q } = mountDrawer()
    await wrapper.vm.$nextTick()

    const input = q(".url-input")
    input.value = "https://example.com"
    input.dispatchEvent(new Event("input"))
    await wrapper.vm.$nextTick()

    q(".btn-primary").click()
    await flushPromises()
    await wrapper.vm.$nextTick()

    expect(scrapeUrl).toHaveBeenCalledWith("ws1", "ds1", "https://example.com")
    expect(wrapper.emitted("scraped")[0]).toEqual(["https://example.com"])
    expect(q(".url-input").value).toBe("")
    wrapper.unmount()
  })

  it("scrapeUrl rejection shows the server error message", async () => {
    scrapeUrl.mockRejectedValueOnce({ response: { data: { message: "boom" } } })

    const { wrapper, q } = mountDrawer()
    await wrapper.vm.$nextTick()

    const input = q(".url-input")
    input.value = "https://example.com"
    input.dispatchEvent(new Event("input"))
    await wrapper.vm.$nextTick()

    q(".btn-primary").click()
    await flushPromises()
    await wrapper.vm.$nextTick()

    expect(scrapeUrl).toHaveBeenCalledOnce()
    expect(q(".url-error").textContent).toBe("boom")
    wrapper.unmount()
  })
})

describe("AddSourceDrawer Upload flow", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ""
    uploadFile.mockResolvedValue({})
  })

  it("successful upload renders .status-ok and emits 'uploaded'", async () => {
    const { wrapper, q } = mountDrawer()
    await wrapper.vm.$nextTick()

    const fileInput = q('input[type="file"]')
    const file = new File(["x"], "a.pdf", { type: "application/pdf" })
    Object.defineProperty(fileInput, "files", { value: [file], configurable: true })
    fileInput.dispatchEvent(new Event("change"))

    await flushPromises()
    await wrapper.vm.$nextTick()

    expect(q(".upload-row .status-ok")).not.toBe(null)
    expect(wrapper.emitted("uploaded")).toBeTruthy()
    wrapper.unmount()
  })

  it("failed upload renders .status-err and .upload-error with message; does not emit 'uploaded'", async () => {
    uploadFile.mockRejectedValueOnce({ response: { data: { message: "bad" } } })

    const { wrapper, q } = mountDrawer()
    await wrapper.vm.$nextTick()

    const fileInput = q('input[type="file"]')
    const file = new File(["x"], "b.pdf", { type: "application/pdf" })
    Object.defineProperty(fileInput, "files", { value: [file], configurable: true })
    fileInput.dispatchEvent(new Event("change"))

    await flushPromises()
    await wrapper.vm.$nextTick()

    expect(uploadFile).toHaveBeenCalledOnce()
    expect(q(".upload-row .status-err")).not.toBe(null)
    expect(q(".upload-error").textContent).toBe("bad")
    expect(wrapper.emitted("uploaded")).toBeFalsy()
    wrapper.unmount()
  })

  it("mixed upload (one success, one failure) emits 'uploaded' exactly once with correct row statuses", async () => {
    uploadFile
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce({ response: { data: { message: "oops" } } })

    const { wrapper, q, qq } = mountDrawer()
    await wrapper.vm.$nextTick()

    const fileInput = q('input[type="file"]')
    const f1 = new File(["x"], "good.pdf", { type: "application/pdf" })
    const f2 = new File(["y"], "bad.pdf", { type: "application/pdf" })
    Object.defineProperty(fileInput, "files", { value: [f1, f2], configurable: true })
    fileInput.dispatchEvent(new Event("change"))

    await flushPromises()
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted("uploaded")).toHaveLength(1)
    expect(qq(".status-ok").length).toBe(1)
    expect(qq(".status-err").length).toBe(1)
    wrapper.unmount()
  })
})

describe("AddSourceDrawer Link detection", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ""
    addYouTube.mockResolvedValue({ id: "f1" })
    scrapeUrl.mockResolvedValue({})
  })

  it("shows the supported-sources row when the field is empty", async () => {
    const { wrapper, q } = mountDrawer()
    await wrapper.vm.$nextTick()
    expect(q(".supported-row")).not.toBe(null)
    wrapper.unmount()
  })

  it("shows the YouTube cue when a YouTube URL is typed", async () => {
    const { wrapper, q } = mountDrawer()
    await wrapper.vm.$nextTick()

    const input = q(".url-input")
    input.value = "https://youtu.be/aircAruvnKk"
    input.dispatchEvent(new Event("input"))
    await wrapper.vm.$nextTick()

    expect(q(".source-cue--youtube")).not.toBe(null)
    expect(q(".supported-row")).toBe(null)
    wrapper.unmount()
  })

  it("shows the web cue when a plain URL is typed", async () => {
    const { wrapper, q } = mountDrawer()
    await wrapper.vm.$nextTick()

    const input = q(".url-input")
    input.value = "https://example.com/article"
    input.dispatchEvent(new Event("input"))
    await wrapper.vm.$nextTick()

    expect(q(".source-cue--web")).not.toBe(null)
    wrapper.unmount()
  })

  it("submitting a YouTube URL calls addYouTube, emits 'youtube', and clears the input", async () => {
    const { wrapper, q } = mountDrawer()
    await wrapper.vm.$nextTick()

    const input = q(".url-input")
    input.value = "https://youtu.be/aircAruvnKk"
    input.dispatchEvent(new Event("input"))
    await wrapper.vm.$nextTick()

    q(".btn-primary").click()
    await flushPromises()
    await wrapper.vm.$nextTick()

    expect(addYouTube).toHaveBeenCalledWith("ws1", "ds1", "https://youtu.be/aircAruvnKk")
    expect(scrapeUrl).not.toHaveBeenCalled()
    expect(wrapper.emitted().youtube).toBeTruthy()
    expect(q(".url-input").value).toBe("")
    wrapper.unmount()
  })
})

describe("AddSourceDrawer Reset (onClose)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ""
    uploadFile.mockResolvedValue({})
    scrapeUrl.mockResolvedValue({})
  })

  it("clicking close clears url error, upload list, url input, and emits 'close'", async () => {
    const { wrapper, q } = mountDrawer()
    await wrapper.vm.$nextTick()

    // Trigger a URL error so .url-error appears
    const urlInput = q(".url-input")
    urlInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }))
    await wrapper.vm.$nextTick()
    expect(q(".url-error")).not.toBe(null)

    // Queue a file upload so .upload-list appears
    const fileInput = q('input[type="file"]')
    const file = new File(["x"], "c.pdf", { type: "application/pdf" })
    Object.defineProperty(fileInput, "files", { value: [file], configurable: true })
    fileInput.dispatchEvent(new Event("change"))
    await flushPromises()
    await wrapper.vm.$nextTick()
    expect(q(".upload-list")).not.toBe(null)

    // Click close
    q(".icon-btn").click()
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted("close")).toBeTruthy()
    expect(q(".url-error")).toBe(null)
    expect(q(".upload-list")).toBe(null)
    expect(q(".url-input").value).toBe("")
    wrapper.unmount()
  })
})
