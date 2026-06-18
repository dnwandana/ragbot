import DefaultTheme from "vitepress/theme"
import type { Theme } from "vitepress"
import "./styles/tokens.css"
import "./styles/components.css"

import MockFrame from "./components/primitives/MockFrame.vue"
import Cards from "./components/primitives/Cards.vue"
import Card from "./components/primitives/Card.vue"
import Steps from "./components/primitives/Steps.vue"
import Step from "./components/primitives/Step.vue"
import Faq from "./components/primitives/Faq.vue"
import Shot from "./components/primitives/Shot.vue"
import RolesTable from "./components/mocks/settings/RolesTable.vue"
import ChatMock from "./components/mocks/chat/ChatMock.vue"
import NewChatMock from "./components/mocks/chat/NewChatMock.vue"
import AgentPickerMock from "./components/mocks/chat/AgentPickerMock.vue"
import SourcePickerMock from "./components/mocks/chat/SourcePickerMock.vue"
import CitationsPanelMock from "./components/mocks/chat/CitationsPanelMock.vue"
import DatasetMock from "./components/mocks/datasets/DatasetMock.vue"
import DatasetsListMock from "./components/mocks/datasets/DatasetsListMock.vue"
import FileDetailMock from "./components/mocks/datasets/FileDetailMock.vue"
import AgentMock from "./components/mocks/agents/AgentMock.vue"
import AgentDrawerMock from "./components/mocks/agents/AgentDrawerMock.vue"
import WorkspaceMock from "./components/mocks/workspaces/WorkspaceMock.vue"
import MembersTableMock from "./components/mocks/settings/MembersTableMock.vue"
import AuditTableMock from "./components/mocks/audit/AuditTableMock.vue"
import AuthCardMock from "./components/mocks/auth/AuthCardMock.vue"
import OnboardingMock from "./components/mocks/onboarding/OnboardingMock.vue"

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
    app.component("Shot", Shot)
    app.component("NewChatMock", NewChatMock)
    app.component("AgentPickerMock", AgentPickerMock)
    app.component("SourcePickerMock", SourcePickerMock)
    app.component("CitationsPanelMock", CitationsPanelMock)
    app.component("DatasetsListMock", DatasetsListMock)
    app.component("FileDetailMock", FileDetailMock)
    app.component("AgentDrawerMock", AgentDrawerMock)
    app.component("MembersTableMock", MembersTableMock)
    app.component("AuditTableMock", AuditTableMock)
    app.component("AuthCardMock", AuthCardMock)
    app.component("OnboardingMock", OnboardingMock)
  },
} satisfies Theme
