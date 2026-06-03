---
title: What is RAGBot?
---

# What is RAGBot?

<p class="lede">RAGBot lets you chat with your own documents. Upload the files you already rely on, and a set of AI assistants can read them and answer your questions — in plain language, with links back to the exact pages they pulled from.</p>

Instead of searching through folders or scrolling a 90-page PDF, you just ask. Behind the scenes RAGBot finds the relevant passages across your files and writes an answer grounded in them, so you can trust what you read and check the source yourself.

::: info A quick word on "RAG"
RAG stands for **retrieval-augmented generation** — a fancy way of saying the assistant looks things up in your documents _before_ it answers, rather than guessing from memory. You never have to think about it. You just upload, then ask.
:::

## The four building blocks

Everything in RAGBot is made of four simple pieces. Once these click, the rest of the product follows naturally.

<Cards>
  <Card to="/concepts/workspaces" icon="layers" title="Workspaces" desc="A sealed space that holds all your datasets, agents, chats, and people. Nothing is shared between workspaces." />
  <Card to="/concepts/datasets" icon="database" title="Datasets" desc="Collections of uploaded documents — PDFs, Word files, text. RAGBot indexes them so agents can search inside." />
  <Card to="/concepts/agents" icon="bot" title="Agents" desc="Assistants you configure and connect to datasets. Each has a model, a persona, and answers from its sources." />
  <Card to="/concepts/chatting" icon="chat" title="Chat" desc="The conversation view. Pick an agent, ask a question, and read answers with cited sources. History is saved." />
</Cards>

## How it fits together

The pieces stack in one direction. A **workspace** contains everything. Inside it, you gather documents into **datasets**. You then create an **agent** and point it at one or more of those datasets. Finally, you open a **chat** with that agent and start asking.

Put simply: `workspace › datasets › agent › chat`. If you can remember that order, you can find your way around the whole product.

::: tip New here?
The fastest way to understand RAGBot is to build a tiny example yourself. The [Quick Start](/getting-started/quick-start) walks you from an empty workspace to your first answered question in five short steps.
:::
