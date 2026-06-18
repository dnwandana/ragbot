---
title: Onboarding
---

# Onboarding — your first five minutes

<p class="lede">The first time you sign in without a workspace, RAGBot greets you with a short setup wizard instead of an empty screen. It gets you from "fresh account" to "ready to chat" in a few guided steps — and you can skip almost all of them.</p>

::: info When does this appear?
The wizard shows automatically whenever you're signed in and belong to **no workspace** yet — typically right after you verify a brand-new account. Once you have at least one workspace, RAGBot takes you straight to your [Workspaces](/concepts/workspaces) list instead. You can always re-run a step later from the normal product screens.
:::

## The welcome screen

RAGBot lays out what's ahead: one required step (create a workspace) and three optional ones. The whole thing takes about five minutes — and **Exit & resume later** (top-right) saves your progress if you'd rather come back.

<OnboardingMock :step="1" />

Choose **Get started** to begin.

## Step 1 — Create your workspace <Badge type="danger" text="Required" />

A **workspace** is the home for your team, knowledge sources, and agents — and the boundary that keeps your data separate from everyone else's. Give it a name (and an optional description); you can rename it later.

<OnboardingMock :step="2" />

This is the one step you can't skip. Selecting **Create workspace** provisions it and moves you on.

## Step 2 — Invite your team <Badge type="info" text="Optional" />

Add teammates by email and pick the role each should get. Type an address and press <kbd>Enter</kbd> (or paste several separated by commas) to queue them up. Each person receives an invitation to join the workspace.

<OnboardingMock :step="3" />

Not ready? **Skip for now** — you can invite anyone later from [Members & Roles](/concepts/members-roles).

## Step 3 — Add a knowledge source <Badge type="info" text="Optional" />

Group related documents into a **dataset** — the collection your agents search and cite across. Name it something you'll recognize ("HR policies", "Product specs"), add an optional description, and you can attach files or a URL.

<OnboardingMock :step="4" />

Skip it if you'd rather set up your library later from [Datasets](/concepts/datasets).

## Step 4 — Create your first agent <Badge type="info" text="Optional" />

An **agent** is your knowledge base with a job and a personality. Pick a **template** to start from — Blank, Support, Research, Policy Q&A, Onboarding buddy, or Docs expert — and RAGBot fills in a sensible system prompt you can edit. The agent you create here becomes your workspace's default.

<OnboardingMock :step="5" />

::: tip Templates are just a starting point
Each template seeds the **system prompt** and a description; the model and other settings use sensible defaults. Tweak any of it now or later — see [Agents](/concepts/agents) for the full picture, including the read-only system agent that's always available even if you skip this step.
:::

## Setup complete

The final screen recaps what you created (and what you skipped, with a link to do it later). Choose **Go to dashboard** to land in your new workspace and start [chatting with your data](/concepts/chatting).

<OnboardingMock :step="6" />

## Skipping and resuming

- **Required vs. optional** — only the workspace step is required. The other three can each be skipped and done later from the normal screens.
- **Exit & resume later** — leaves the wizard with your progress saved, so you can pick up where you left off.
- **Re-running steps** — everything the wizard does (workspaces, invites, datasets, agents) is also available any time from the sidebar once you're in a workspace.

## Next steps

<Cards>
  <Card to="/getting-started/quick-start" icon="bolt" title="Quick Start" desc="From an empty workspace to your first answered question in five steps." />
  <Card to="/concepts/chatting" icon="message" title="Chatting with your data" desc="Ask questions, pick which sources to search, and read answers with citations." />
</Cards>
