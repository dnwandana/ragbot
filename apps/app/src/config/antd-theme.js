import { theme as antdTheme } from "ant-design-vue"

/** Brand tokens shared by every Ant Design surface, regardless of mode. */
const BRAND_TOKEN = {
  colorPrimary: "#FF6B35",
  colorPrimaryHover: "#E25323",
  borderRadius: 6,
  fontFamily: "'Geist', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  fontSize: 13,
}

/**
 * Build the Ant Design Vue theme config for a given color mode.
 *
 * Dark mode applies `darkAlgorithm` and lets Ant derive backgrounds — pinning
 * light backgrounds here is what made portaled modals/inputs render white-on-dark.
 * Light mode keeps the warm layout background.
 *
 * @param {"light"|"dark"} mode - Active color mode.
 * @returns {{ algorithm: Function, token: Object }} ConfigProvider theme object.
 */
export function buildAntTheme(mode) {
  const isDark = mode === "dark"
  return {
    algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: isDark ? { ...BRAND_TOKEN } : { ...BRAND_TOKEN, colorBgLayout: "#FAFAF7" },
  }
}
