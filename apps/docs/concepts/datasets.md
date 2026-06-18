---
title: Datasets
---

# Datasets

<p class="lede">A dataset is a collection of documents you've uploaded. RAGBot reads and indexes every file so a chat can search inside it and answer from it. Group documents into datasets by topic, and you'll keep answers focused and easy to manage.</p>

## Create a dataset

Open the **Datasets** area in the sidebar and choose **New dataset**. Give it a name that describes what's inside — `Company handbook`, `Product specs`, `2024 contracts` — and an optional description. A dataset starts empty; you add documents to it next.

<DatasetsListMock />

::: tip One topic per dataset
Smaller, focused datasets give sharper answers than one giant pile of everything. Split by subject — a single chat can always search several datasets at once if it needs a wider view.
:::

## Add sources

Open a dataset and choose **Add source**. A panel slides in with two tabs:

- **Upload files** — drag documents into the drop zone, or browse to select them. You can add several at once.
- **Web URL** — paste the address of a public web page and RAGBot fetches its readable text.

Either way, each new source uploads and then begins processing automatically — there's nothing else to press.

<DatasetMock />

### Supported file types

RAGBot reads the document formats people use every day:

- **PDF** — reports, handbooks, scanned policies, contracts (`.pdf`)
- **Word** — documents and memos (`.docx`, `.doc`)
- **Plain text & Markdown** — notes and exports (`.txt`, `.md`)

Text-based documents work best. A PDF that's really a photo of a page (a scan with no selectable text) may not be readable — if you can't highlight the words in the file, an agent probably can't read them either.

### When to use a URL instead of a file

Use **Web URL** when the canonical version lives on the web and changes rarely — a help article, a product page, a published policy. If a page sits behind a login or renders entirely from scripts, upload an exported copy (PDF or text) instead — RAGBot only reads what a public visitor would see.

## What "processing" and "indexing" mean

When you add a source, RAGBot doesn't just store it — it **reads** the text, splits it into small passages called **chunks**, and builds a searchable index of them. That index is what lets a chat later find the few most relevant passages out of hundreds of pages in a fraction of a second. It also auto-generates a handful of starter questions for each document (see below).

You don't have to do anything during this step. Each file shows one of three statuses next to its name:

- **Parsing** — RAGBot is still reading and indexing the file. It isn't searchable yet. Large PDFs take longer than short text files.
- **Indexed** — the document is fully processed and available to any chat that searches this dataset.
- **Failed** — something went wrong reading the file. Open the file's options and choose **Reprocess** to try again, or replace it with a cleaner copy.

::: info How to tell when it's ready
Wait for every file you care about to read **Indexed** before you rely on the answers — a document still **Parsing** won't show up in results yet. The chunk count next to a file (for example `34`) tells you how many searchable passages it produced.
:::

## Explore a document

Click any indexed file to open its detail panel. You'll see its status, size, and chunk count, plus two things RAGBot generated for you:

- **Explore this document** — a set of ready-made questions drawn from the text. Pick one to open a chat already grounded in that file. Hit **Shuffle** to see more.
- **Chunk preview** — a look at the actual passages RAGBot extracted, so you can confirm it read the document correctly.

<FileDetailMock />

## Organizing and deleting

Rename a dataset or a file whenever its contents drift. Inside a dataset you can remove a single document — handy when a file is out of date — without touching the rest. Deleting a document removes it from every answer that drew on it, so chats simply stop citing it.

Deleting an entire dataset removes all of its documents and unlinks it from any conversations that used it. Those chats keep working; they just have one fewer source to draw on.

::: warning Deleting is permanent
Removing a document or a dataset can't be undone. If you're replacing a file with a newer version, add the new one first and confirm it's **Indexed** before deleting the old.
:::
