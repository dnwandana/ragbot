---
title: Troubleshooting
---

# Troubleshooting

<p class="lede">Quick fixes for the snags people hit most. If your question is more "how does this work?" than "why isn't this working?", the <a href="/help/faq">FAQ</a> and the concept pages have you covered.</p>

## I can't sign in

- **"Verify your email first."** New accounts must confirm their email before signing in. Open the verification link we sent; request a fresh one from the verification screen if it expired.
- **Wrong password too many times.** Repeated failures temporarily lock an account. Wait a few minutes, or reset your password from **Forgot password?**.
- **The reset email didn't arrive.** Check spam, and confirm you used the same email you signed up with. For security, RAGBot shows the same confirmation whether or not an account exists.

## My document won't become "Indexed"

A file moves from **Parsing** to **Indexed** when processing finishes. If it's stuck or shows **Failed**:

- **Give it a moment.** Large PDFs take longer than short text files.
- **Check it's readable text.** A scanned PDF that's really an image of a page has no selectable text, so there's nothing to index. Replace it with a text-based version.
- **Reprocess it.** Open the file's options and choose **Reprocess** to run the pipeline again.
- **Confirm the format is supported** — PDF, Word (`.docx`/`.doc`), or text/Markdown. See [Datasets](/concepts/datasets).

## A web page didn't scrape well

RAGBot only reads what a public visitor sees. If a page is behind a login, or builds itself entirely from scripts, the extracted text may be thin or empty. Export the page to PDF and upload that instead.

## The agent says it can't find the answer

This is usually a sources problem, not a bug:

- **No sources selected.** Open **Choose sources to search** in the chat and select the dataset that holds the answer.
- **Still parsing.** Confirm the file reads **Indexed**.
- **Wording mismatch.** Rephrase using terms that actually appear in the document.

See [Chatting](/concepts/chatting) for the full checklist.

## Answers cite the wrong material

The conversation is searching datasets you didn't intend. Reopen **Choose sources to search** and narrow the selection to just the relevant datasets. Keeping a chat's sources focused gives more precise, better-cited answers.

## I can't edit the default agent or a built-in role

That's expected — both are **read-only by design**. The workspace's default **system agent** and the four built-in roles (owner/admin/editor/viewer) can be viewed but not changed. Create a **new agent** or a **custom role** to make your own variation. See [Agents](/concepts/agents) and [Members & Roles](/concepts/members-roles).

## I can't delete my account

You can't close your account while you're the **sole Owner** of a workspace, or it would be left orphaned. Invite someone else and make them an Owner first (or delete the workspace), then try again. See [Your profile & account](/concepts/account).

## I made someone a Viewer and they lost access

Role changes take effect **immediately**, including removing edit access — even to datasets and agents that person created. Promote them back to Editor if it was a mistake, and always keep at least one Owner or Admin in every workspace.

## Times look wrong

Dates and times follow the timezone on your profile. Set it under **Workspace settings › Profile**; if it's unset, times fall back to UTC. See [Your profile & account](/concepts/account).
