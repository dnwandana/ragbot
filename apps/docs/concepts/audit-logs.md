---
title: Audit logs
---

# Audit logs

<p class="lede">The audit log is a complete, tamper-proof record of who did what in a workspace — every meaningful change, in one place. It's there when you need to answer "who changed this, and when?"</p>

## What gets recorded

RAGBot writes an audit entry whenever someone makes a **change** in the workspace — for example creating a conversation, adding or deleting a dataset, uploading or removing a file, inviting or removing a member, or editing workspace settings. Each entry captures:

- **Actor** — the person who performed the action (name and email).
- **Action** — what they did, in plain language ("Created conversation", "Deleted dataset").
- **Category** — the area it touched (Conversations, Datasets, Members, Workspace, and so on).
- **Timestamp** — when it happened, shown both relatively ("1m ago") and as an exact time.

<AuditTableMock />

## Reading and filtering

Entries are listed newest-first. Use the **Action** and **Category** filters at the top to narrow the list — for instance, show only member changes, or only deletions. Select any row to open its full detail.

::: info Read-only by design
Audit entries are **append-only**: they're written automatically and can never be edited or deleted, not even by an Owner. That's what makes the log trustworthy as a record.
:::

## Who can see it

Viewing the audit log requires the **audit:read** permission, which Owners and Admins have by default. If you've built a custom role, grant it that permission to let those members review the trail. See [Members & Roles](/concepts/members-roles) for how roles and permissions work.
