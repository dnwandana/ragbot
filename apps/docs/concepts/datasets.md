---
title: Datasets
---

# Datasets

<p class="lede">A dataset is a collection of documents you've uploaded. RAGBot reads and indexes every file so your agents can search inside it and answer from it. Group documents into datasets by topic, and you'll keep answers focused and easy to manage.</p>

## Create a dataset

Open the **Datasets** area in the sidebar and choose **New dataset**. Give it a name that describes what's inside — `Company handbook`, `Product specs`, `2024 contracts`. A dataset starts empty; you add documents to it next.

::: tip One topic per dataset
Smaller, focused datasets give sharper answers than one giant pile of everything. Split by subject — an agent can always be connected to several datasets at once if it needs a wider view.
:::

## Upload documents

Open a dataset and drag your files in, or use **Upload** to browse. You can add many files at once. Each one uploads and then begins processing automatically — there's nothing else you need to press.

<DatasetMock />

### Supported file types

RAGBot reads the document formats people use every day:

- **PDF** — reports, handbooks, scanned policies, contracts (`.pdf`)
- **Word** — documents and memos (`.docx`, `.doc`)
- **Plain text & Markdown** — notes and exports (`.txt`, `.md`)

Text-based documents work best. A PDF that's really a photo of a page (a scan with no selectable text) may not be readable — if you can't highlight the words in the file, an agent probably can't read them either.

## What "processing" and "indexing" mean

When you upload a file, RAGBot doesn't just store it — it **reads** the text, splits it into small passages, and builds a searchable **index** of them. That index is what lets an agent later find the three most relevant paragraphs out of hundreds of pages in a fraction of a second.

You don't have to do anything during this step. You just need to know two states:

- **Processing** — RAGBot is still reading and indexing the file. It isn't searchable yet. Large PDFs take longer than short text files.
- **Ready** — the document is fully indexed and available to any agent connected to this dataset.

::: info How to tell when it's ready
Each document shows its status next to its name. Wait for every file you care about to read **Ready** before you rely on the answers — a document still **Processing** won't show up in results yet.
:::

## Organizing and deleting

Rename a dataset whenever its contents drift. Inside a dataset you can remove a single document — handy when a file is out of date — without touching the rest. Deleting a document removes it from every agent that drew on it, so those agents simply stop citing it.

Deleting an entire dataset removes all of its documents and disconnects it from any agents that used it. The agents keep working; they just have one fewer source to draw on.

::: warning Deleting is permanent
Removing a document or a dataset can't be undone. If you're replacing a file with a newer version, upload the new one first and confirm it's **Ready** before deleting the old.
:::
