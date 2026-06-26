---
title: Changelog
description: What's new in RAGBot — new features and improvements by version.
---

# Changelog

What's new in RAGBot. The newest release is listed first.

## 1.3.0 — 26 June 2026

You can now build datasets from YouTube videos, not just files and web pages.
Paste a video link and RAGBot reads what's said in it, so you can chat with a
talk, tutorial, or lecture the same way you chat with your documents.

### New

**YouTube videos as a source**

- Add a YouTube video to a [dataset](/concepts/datasets) by pasting its link, and
  RAGBot indexes the video's words so you can ask about it and get cited answers,
  just like any other source. It uses the video's captions when they're available
  and transcribes the audio automatically when they aren't.
- The Add source panel now has a single **Link** field that recognizes whether
  you've pasted a web page or a YouTube video and tells you which it detected
  before you add it.
- Only the transcript is stored — not the video or audio. Add videos one at a
  time; playlists and channels aren't supported.

## 1.2.0 — 21 June 2026

This release puts you in control of where your account is signed in. You can
now see every device that's logged in, sign out the ones you don't recognize,
and trust that signing out or changing your password takes effect right away.

### New

**See and manage your signed-in devices**

- A new **active sessions** list in [your account settings](/concepts/account)
  shows every device signed into your account — its browser and operating
  system, IP address, approximate location when available, and when it was last
  active — and marks the one you're using now.
- Sign out a single device, or sign out all your other devices at once while
  staying logged in where you are — handy if you ever sign in on a shared or
  public computer.

### Improvements

**Sign-out and password changes take effect immediately**

- Signing out, changing or resetting your password, deleting your account, or
  signing out another device now ends access right away, instead of leaving a
  short window where an old session could still be used.
- The app version is now shown on the sign-in screen, so you always know which
  release you're on.

### Fixes

- The sign-in, sign-up, and password screens are now vertically centered on the
  page.

## 1.1.0 — 20 June 2026

A small update to the RAGBot website. The documentation site is now linked
directly from the homepage, so these guides are easier to find.

### Improvements

**Find the docs from the homepage**

- The RAGBot homepage now links straight to this documentation site, from both
  the top navigation and the footer.

## 1.0.0 — 19 June 2026

The first public release of RAGBot. Create a workspace, add your documents, and
chat with an assistant that answers from your own content and shows you exactly
where each answer came from.

### New

**Sign in and accounts**

- Sign up with your email, verify it from the link we send, and sign in
  securely. Reset a forgotten password, change your password (which signs out
  your other sessions), and update your name and time zone. See
  [Accounts & Signing In](/getting-started/signing-in).

**Workspaces and teams**

- Organize your work into [workspaces](/concepts/workspaces), invite teammates by
  email, and manage who has access. A guided
  [onboarding](/getting-started/onboarding) walks you through creating your first
  workspace and assistant.

**Roles and permissions**

- Control what each member can do with built-in roles — owner, admin, editor,
  and viewer — or create your own [custom roles](/concepts/members-roles).

**Datasets and sources**

- Build [datasets](/concepts/datasets) by uploading files or adding a website URL
  to scrape. Each source is processed for you in the background, and RAGBot
  suggests questions you can ask about it so you can see what's in your data at a
  glance.

**Assistants**

- Create [agents](/concepts/agents) with their own instructions, choice of
  model, and response tuning (such as temperature) to shape how answers are
  written.

**Chat with cited sources**

- [Chat with your data](/concepts/chatting): answers stream in as they are
  written, and every answer includes clickable citations that link back to the
  exact source it came from. Choose which datasets and assistant a conversation
  uses, and revisit past conversations from the sidebar.

**Audit logs**

- Review a workspace's history of important changes in
  [audit logs](/concepts/audit-logs), with filtering and a detail view.

**Light and dark mode**

- Switch between light and dark themes, and see every timestamp in your own time
  zone.
