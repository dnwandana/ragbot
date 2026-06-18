import { defineConfig } from "vitepress"

export default defineConfig({
  title: "RAGBot Docs",
  description:
    "Chat with your documents — workspaces, datasets, agents, and answers with cited sources.",
  lang: "en-US",
  cleanUrls: true,
  lastUpdated: false,
  // Keep internal package docs (AGENTS.md / its CLAUDE.md symlink) out of the published site.
  srcExclude: ["**/AGENTS.md", "**/CLAUDE.md", "**/README.md"],
  head: [["link", { rel: "icon", href: "/mark.svg" }]],
  themeConfig: {
    logo: { light: "/logo.svg", dark: "/logo-dark.svg" },
    siteTitle: false,
    search: { provider: "local" },
    outline: { label: "On this page", level: [2, 3] },
    nav: [
      { text: "Quick Start", link: "/getting-started/quick-start" },
      { text: "Product Tour", link: "/reference/tour" },
      { text: "Developers", link: "/developer/architecture" },
      { text: "FAQ", link: "/help/faq" },
    ],
    sidebar: [
      {
        text: "Getting Started",
        items: [
          { text: "Overview", link: "/" },
          { text: "Accounts & Signing In", link: "/getting-started/signing-in" },
          { text: "Onboarding", link: "/getting-started/onboarding" },
          { text: "Quick Start", link: "/getting-started/quick-start" },
        ],
      },
      {
        text: "Concepts & How-To",
        items: [
          { text: "Workspaces", link: "/concepts/workspaces" },
          { text: "Members & Roles", link: "/concepts/members-roles" },
          { text: "Datasets", link: "/concepts/datasets" },
          { text: "Agents", link: "/concepts/agents" },
          { text: "Chatting with your data", link: "/concepts/chatting" },
          { text: "Audit logs", link: "/concepts/audit-logs" },
          { text: "Your profile & account", link: "/concepts/account" },
        ],
      },
      {
        text: "Reference",
        items: [{ text: "Product tour", link: "/reference/tour" }],
      },
      {
        text: "For developers",
        items: [
          { text: "Architecture", link: "/developer/architecture" },
          { text: "Running locally", link: "/developer/running-locally" },
          { text: "Deployment", link: "/developer/deployment" },
        ],
      },
      {
        text: "Help",
        items: [
          { text: "FAQ", link: "/help/faq" },
          { text: "Troubleshooting", link: "/help/troubleshooting" },
        ],
      },
    ],
  },
})
