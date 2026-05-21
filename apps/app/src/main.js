import { createApp } from "vue"
import { createPinia } from "pinia"
import Antd from "ant-design-vue"
import "ant-design-vue/dist/reset.css"
import "./assets/design-system.css"

import App from "./App.vue"
import router from "./router"

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(Antd, {
  theme: {
    token: {
      colorPrimary: "#FF6B35",
      colorPrimaryHover: "#E25323",
      colorBgContainer: "#ffffff",
      colorBgLayout: "#FAFAF7",
      borderRadius: 6,
      fontFamily: "'Geist', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      fontSize: 13,
    },
  },
})

app.mount("#app")
