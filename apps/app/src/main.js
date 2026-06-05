import { createApp } from "vue"
import { createPinia } from "pinia"
import Antd, { ConfigProvider } from "ant-design-vue"
import "ant-design-vue/dist/reset.css"
import "./assets/design-system.css"

import App from "./App.vue"
import router from "./router"
import { antTheme } from "./config/antd-theme.js"

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(Antd)

// Static APIs (message/Modal/notification) render outside the component tree, so
// they don't inherit <ConfigProvider>'s theme — configure them globally here.
ConfigProvider.config({ theme: antTheme })

app.mount("#app")
