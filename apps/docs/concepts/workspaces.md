---
title: Workspaces
---

# Workspaces

<p class="lede">A workspace is an isolated environment that holds everything you do in RAGBot — its datasets, agents, chats, and members. You can belong to several and switch between them, and nothing crosses from one to another.</p>

## What "isolation" means, in plain terms

Think of each workspace as a separate room with its own locked filing cabinet. The documents, assistants, and conversations inside one room are **completely sealed off** from every other room. An agent in your `Acme Support` workspace can never read a document that lives in your `Personal` workspace, even if you belong to both.

This is what keeps a client's files from leaking into another client's answers, and your personal notes out of a shared team space. When in doubt, ask: _"which workspace am I in?"_ — that single question determines what any agent can see.

::: info Nothing is shared across workspaces
Datasets, agents, chat history, and members all live **inside one workspace**. Moving to another workspace is like walking into a different room — a fresh set of documents and assistants, none of the previous ones.
:::

## Creating a workspace

Open the workspace menu at the top of the sidebar and choose **Create workspace**. Give it a clear, specific name — usually a client, team, or project. You become its **Owner**, which means you can invite people and manage its settings. From there you can add your first dataset right away.

## Switching between workspaces

The same menu lists every workspace you belong to. Select one to switch into it; the entire app — sidebar, datasets, agents, chats — swaps to that workspace's contents. Your place in each workspace is kept, so switching back picks up where you left off.

<WorkspaceMock />

## Workspace settings

Owners and Admins can open **Workspace settings** to rename the workspace, manage its members and their roles, and review what it contains. Most people never need to visit settings day to day — it's there for the person keeping the room tidy.

::: tip Use separate workspaces on purpose
A new client, a sensitive project, or a personal experiment each deserves its own workspace. It's the cleanest way to guarantee documents and answers never mix.
:::
