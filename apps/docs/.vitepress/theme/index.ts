import DefaultTheme from "vitepress/theme"
import type { Theme } from "vitepress"
import "./styles/tokens.css"
import "./styles/components.css"

import MockFrame from "./components/MockFrame.vue"
import Cards from "./components/Cards.vue"
import Card from "./components/Card.vue"
import Steps from "./components/Steps.vue"
import Step from "./components/Step.vue"
import ChatMock from "./components/ChatMock.vue"
import DatasetMock from "./components/DatasetMock.vue"
import AgentMock from "./components/AgentMock.vue"
import WorkspaceMock from "./components/WorkspaceMock.vue"
import RolesTable from "./components/RolesTable.vue"
import Faq from "./components/Faq.vue"

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component("MockFrame", MockFrame)
    app.component("Cards", Cards)
    app.component("Card", Card)
    app.component("Steps", Steps)
    app.component("Step", Step)
    app.component("ChatMock", ChatMock)
    app.component("DatasetMock", DatasetMock)
    app.component("AgentMock", AgentMock)
    app.component("WorkspaceMock", WorkspaceMock)
    app.component("RolesTable", RolesTable)
    app.component("Faq", Faq)
  },
} satisfies Theme
