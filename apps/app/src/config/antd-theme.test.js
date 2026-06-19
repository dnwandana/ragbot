import { describe, it, expect } from "vitest"
import { theme as antdTheme } from "ant-design-vue"
import { buildAntTheme } from "@/config/antd-theme.js"

describe("buildAntTheme", () => {
  it("uses the dark algorithm in dark mode", () => {
    expect(buildAntTheme("dark").algorithm).toBe(antdTheme.darkAlgorithm)
  })

  it("uses the default algorithm in light mode", () => {
    expect(buildAntTheme("light").algorithm).toBe(antdTheme.defaultAlgorithm)
  })

  it("keeps the brand primary color in both modes", () => {
    expect(buildAntTheme("dark").token.colorPrimary).toBe("#FF6B35")
    expect(buildAntTheme("light").token.colorPrimary).toBe("#FF6B35")
  })

  it("does not pin a white container background in either mode", () => {
    expect(buildAntTheme("dark").token.colorBgContainer).toBeUndefined()
    expect(buildAntTheme("light").token.colorBgContainer).toBeUndefined()
  })

  it("keeps the warm layout background only in light mode", () => {
    expect(buildAntTheme("light").token.colorBgLayout).toBe("#FAFAF7")
    expect(buildAntTheme("dark").token.colorBgLayout).toBeUndefined()
  })
})
