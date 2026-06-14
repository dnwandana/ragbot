import { ref, watch } from "vue"

const theme = ref(
  typeof localStorage !== "undefined" ? localStorage.getItem("theme") || "light" : "light",
)

// Run once on import: keep <html data-theme> and localStorage in sync with the
// shared theme ref. Module scope so N consumers don't each add a redundant effect.
watch(
  theme,
  (value) => {
    document.documentElement.setAttribute("data-theme", value)
    localStorage.setItem("theme", value)
  },
  { immediate: true },
)

function toggleTheme() {
  theme.value = theme.value === "light" ? "dark" : "light"
}

/**
 * Persisted dark-mode toggle (shared singleton).
 * @returns {{ theme: import('vue').Ref<string>, toggleTheme: () => void }}
 */
export function useTheme() {
  return { theme, toggleTheme }
}
