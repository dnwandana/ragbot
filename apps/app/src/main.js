import { createApp, watch } from "vue"
import { createPinia } from "pinia"
import Antd, { ConfigProvider } from "ant-design-vue"
import "ant-design-vue/dist/reset.css"
import "./assets/design-system.css"

import App from "./App.vue"
import router from "./router"
import { buildAntTheme } from "./config/antd-theme.js"
import { useTheme } from "./composables/useTheme"

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(Antd)

// Static APIs (message/Modal/notification) render outside the component tree, so
// they don't inherit <ConfigProvider>'s theme. Re-apply the global config whenever
// the mode changes so subsequently-opened portals match. (A portal already on
// screen at toggle time keeps its colors until it next opens — accepted edge case.)
// useTheme() exposes a module-level singleton ref, so it is safe to call here
// outside any component setup() context.
const { theme } = useTheme()
watch(theme, (mode) => ConfigProvider.config({ theme: buildAntTheme(mode) }), { immediate: true })

app.mount("#app")
