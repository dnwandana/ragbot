import { ref, watchEffect, onMounted } from "vue"

const theme = ref("light")

/**
 * Persisted dark-mode toggle.
 * Sets data-theme="dark"|"light" on <html> element.
 * @returns {{ theme: import('vue').Ref<string>, toggleTheme: () => void }}
 */
export function useTheme() {
  onMounted(() => {
    const saved = localStorage.getItem("theme") || "light"
    theme.value = saved
  })

  watchEffect(() => {
    document.documentElement.setAttribute("data-theme", theme.value)
    localStorage.setItem("theme", theme.value)
  })

  function toggleTheme() {
    theme.value = theme.value === "light" ? "dark" : "light"
  }

  return { theme, toggleTheme }
}
