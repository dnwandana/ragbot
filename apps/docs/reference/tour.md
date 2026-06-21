---
title: Product tour
---

# Product tour

<p class="lede">A screen-by-screen walk through RAGBot, in roughly the order you'll meet each page. Use it as a visual map — every screenshot here is the real app.</p>

## Signing in

You start at the sign-in screen. New users create an account and verify their email first; see [Accounts & signing in](/getting-started/signing-in).

<Shot src="/screenshots/auth/login.png" label="Sign in" caption="Sign-in screen with links to create an account and reset a forgotten password." />

<Shot src="/screenshots/auth/signup.png" label="Create account" caption="Sign-up: full name, work email, and a password entered twice." />

<Shot src="/screenshots/auth/forgot-password.png" label="Reset password" caption="Forgot your password? Enter your email to receive a reset link." />

## Workspaces

After signing in you land on your workspaces — the sealed spaces that hold everything. Pick one to enter it, or create a new one.

<Shot src="/screenshots/workspaces/list.png" label="Workspaces" caption="The workspaces list, with your role and last-updated time per workspace." />

<Shot src="/screenshots/workspaces/new-modal.png" label="New workspace" caption="Creating a workspace — just a name and optional description. You become its Owner." />

::: info First time here?
Brand-new users who don't belong to any workspace yet are walked through a short **onboarding wizard** — welcome, create a workspace, invite teammates, add a source, and meet your agent. Once you have a workspace, the app takes you straight to it instead. See the full [Onboarding](/getting-started/onboarding) walkthrough.
:::

<Shot src="/screenshots/onboarding/welcome.png" label="Onboarding" caption="The first-run wizard's welcome screen. Returning users with a workspace skip straight to it." />

## Datasets

Inside a workspace, **Datasets** is your knowledge base. Browse as cards or a table, search, and sort.

<Shot src="/screenshots/datasets/list.png" label="Datasets" caption="The Datasets area." />

<Shot src="/screenshots/datasets/new-modal.png" label="New dataset" caption="Creating a dataset — a name and optional description; you add files next." />

Open a dataset to see its files, each with type, size, chunk count, status, and date.

<Shot src="/screenshots/datasets/detail.png" label="Dataset detail" caption="A dataset's files, with status filters and Start chat / Add source actions." />

Add documents through the **Add source** panel — upload files or scrape a web page.

<Shot src="/screenshots/datasets/add-source.png" label="Add source" caption="The Add source panel: an Upload files tab and a Web URL tab." />

Click a file to explore it: its info, auto-generated questions, and a preview of the indexed passages.

<Shot src="/screenshots/datasets/file-detail-panel.png" label="File detail" caption="The file detail panel — file info, 'Explore this document' questions, and a chunk preview." />

## Agents

**Agents** are the assistants you talk to — each a persona plus a model. Every workspace ships a ready-to-use default.

<Shot src="/screenshots/agents/list.png" label="Agents" caption="The Agents area, showing the default system agent." />

<Shot src="/screenshots/agents/drawer.png" label="Agent settings" caption="An agent's settings: system prompt, model, and temperature." />

## Conversations & chat

**Conversations** lists your chat history, grouped by day, each tagged with its agent and source count.

<Shot src="/screenshots/chat/conversations-list.png" label="Conversations" caption="Conversation history for the workspace." />

A new chat opens on a clean welcome screen. Pick an agent and choose which datasets to search.

<Shot src="/screenshots/chat/new.png" label="New conversation" caption="Starting a fresh conversation." />

<Shot src="/screenshots/chat/source-picker.png" label="Choose sources" caption="The source picker — select the datasets this conversation can read." />

Ask a question and the answer streams in, with inline citations you can open.

<Shot src="/screenshots/chat/conversation.png" label="Conversation" caption="An answer with inline citations and a per-message source toggle." />

<Shot src="/screenshots/chat/citations-panel.png" label="Sources panel" caption="The citations panel — passages grouped by source file, each with a relevance label and the exact text." />

## Workspace settings

**Settings** gathers everything an Owner or Admin manages. The **General** tab renames or deletes the workspace.

<Shot src="/screenshots/settings/general.png" label="Settings · General" caption="General workspace settings." />

**Members** manages who's in the workspace and their roles.

<Shot src="/screenshots/settings/members.png" label="Settings · Members" caption="Members and pending invitations." />

**Roles** shows the four built-in roles and lets you create custom ones.

<Shot src="/screenshots/settings/roles.png" label="Settings · Roles" caption="Built-in and custom roles." />

Open a role to see its permissions. Built-in roles are read-only; create a custom role to set your own.

<Shot src="/screenshots/settings/role-permissions.png" label="Role permissions" caption="The permission matrix, grouped by resource. Destructive permissions are flagged." />

**Profile** and **Account** hold your personal settings — name, timezone, password, and the devices signed in to your account — covered in [Your profile & account](/concepts/account).

<Shot src="/screenshots/settings/profile.png" label="Settings · Profile" caption="Your profile: display name and timezone." />

<Shot src="/screenshots/settings/account.png" label="Settings · Account" caption="Your account: change your password, manage the devices signed in to your account, or delete your account." />

## Audit logs

Finally, **Audit logs** records every change in the workspace — see [Audit logs](/concepts/audit-logs).

<Shot src="/screenshots/audit/logs.png" label="Audit logs" caption="A complete, append-only record of workspace activity." />
