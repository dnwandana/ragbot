---
title: Changelog
description: What's new in RAGBot — new features and improvements by version.
---

# Changelog

What's new in RAGBot. The newest release is listed first.

## 1.8.0 — 1 October 2026

Citations are now more precise. Each source in the sources panel highlights
the passage that supports the answer, and the panel shows only the sources
that the answer cites.

### New

**Highlighted passages**

- Each source in the sources panel marks the passage that supports the
  claim, with some text before and after it. Choose **Show full excerpt** to
  read the full excerpt, and **Show less** to go back. See
  [Read answers and their cited sources](/concepts/chatting#read-answers-and-their-cited-sources).
- When you select a citation number in an answer, the sources panel now
  scrolls to that source.

### Improvements

- The sources panel shows only the sources that the answer cites. Before, it
  also showed passages that the agent found but did not use.
- A shared link, a Markdown export, and a PDF export show only the cited
  passage of each source, as plain text. Before, they showed the first 500
  characters of the passage.
- The agent now reads the full text of each search result. Before, it saw
  only the first 200 characters.

### Fixes

- When the agent searches more than one time in one answer, each citation
  number now points to the correct source. Before, a new search started again
  at 1, so a number could point to a different source.

## 1.7.0 — 28 September 2026

Datasets can now hold folders. Put your sources in folders and subfolders,
move them with a drag, and upload a full folder from your computer in one
step.

### New

**Folders in datasets**

- Choose **New folder** to add a folder in the folder that is open now.
  Folders can hold more folders. Two items in the same folder cannot have the
  same name, and the check ignores case. See
  [Organize with folders](/concepts/datasets#organize-with-folders).
- Breadcrumbs above the table show where you are. The browser back button
  goes back to the previous folder, and you can bookmark or share the link to
  a folder.
- Select rows and choose **Move to…**, or drag the rows onto a folder row or
  onto a crumb.
- Delete a folder to delete everything inside it. Before you confirm, RAGBot
  tells you how many subfolders and files the delete includes.
- Open a file to see its **Location**. Select a folder in the location to open
  that folder.
- Folders only organize files. A chat that uses a dataset still searches every
  file in it, in all folders.
- The audit log records every folder create, rename, move, and delete as a
  **Dataset folder** entry.

**Upload a folder**

- The Add source panel has a new **Upload folder** tab. RAGBot creates the
  same subfolders in the dataset and uploads each file into its folder. Files
  of a type that RAGBot does not support are skipped, and the panel tells you
  how many.
- You can also drag files or full folders from your computer into the dataset
  page. They go into the folder that is open.
- The top of the Add source panel shows the folder that receives the new
  sources.

### Improvements

- The search box looks in the open folder and in all its subfolders. Each
  result shows the folder it is in.
- The file list loads in pages. Choose **Load more** to see the next page, so
  a large dataset opens quickly.

### Fixes

- A file that you delete while it is still processing now stays deleted. Its
  passages and suggested questions no longer come back after the processing
  ends.

## 1.6.0 — 25 September 2026

Conversations can now leave the app. Share a read-only link with anyone, or
export a conversation as Markdown or PDF.

### New

**Share links and export**

- **Share** creates a public read-only link to a conversation. The link is a
  snapshot: update it to include new messages, or revoke it at any time. See
  [Share and export](/concepts/sharing).
- **Export** downloads the conversation as a Markdown file or opens a print
  view for a PDF.
- The audit log records every share, update, and revoke as a **Share link**
  entry.

## 1.5.0 — 18 September 2026

Conversations now name themselves, and the agent form offers a shorter,
current list of models. This is a small release with no action required.

### New

**Conversation titles**

- Every new conversation gets a short title after its first answer, drawn from
  what you asked and what the agent replied. The title appears in the sidebar
  and in the Conversations list, so you can tell threads apart at a glance. See
  [Chatting with your data](/concepts/chatting#find-past-conversations).

### Improvements

**Models**

- The agent form now offers three models: GPT-5.4, GPT-5.4 Mini (the default),
  and GPT-5.4 Nano. The earlier GPT-4.1 and GPT-4o options are no longer
  offered. An agent that was saved with one of them keeps working and keeps
  its model, and the form marks it **No longer offered**. See
  [Agents](/concepts/agents#model).

## 1.4.0 — 14 September 2026

RAGBot can now analyze your spreadsheets, not only read them. Upload a data
file, ask a question about the numbers, and the agent writes and runs Python
code to work out the answer, with the code, the output, and any charts shown
right in the chat.

### New

**Ask questions about your data files**

- Add Excel workbooks, CSV or TSV files, and JSON records to a
  [dataset](/concepts/datasets). RAGBot profiles each file's sheets and columns
  instead of splitting it into text passages, and shows the result under a new
  **Schema** section in the file's detail panel.
- Ask for a count, a sum, a comparison, or a trend, and the agent computes it
  with a **code interpreter** that runs in a locked-down sandbox with no internet
  access. See [Analyzing data files](/concepts/data-analysis).
- Every answer that ran code shows a **Code interpreter** card with one cell per
  run: a title, the code, its output, and how long it took. Copy the code with
  one click.

**Charts in the chat**

- Ask for a bar, line, pie, doughnut, scatter, radar, bubble, or polar area
  chart, and the agent draws it inline. Charts are saved with the conversation
  and are still there when you reopen it.

### Improvements

- The agent can now reason over more steps in one answer, so it can look at
  your data first, then compute, then fix a mistake, before it replies.
- The file picker in the Add source panel now offers every format RAGBot
  accepts, including the new data file types.

### Fixes

- The answer to your first message in a new conversation now appears as it
  streams, instead of only after it finishes.
- The message you just sent no longer reappears in the composer after you send
  it.

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
