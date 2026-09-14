---
title: Analyzing data files
---

# Analyzing data files

<p class="lede">Upload a spreadsheet or a data file, ask a question about the numbers, and the agent writes and runs Python code to work out the answer. It shows you the code, the output, and any charts it drew, so you can check every step of the work.</p>

A text document answers a question with a quote. A data file answers it with a computation. When you ask _"What was our revenue by month?"_ about a sales export, the agent does not search for a passage that already says so. It opens the file, sums the numbers, and answers from the result. This is RAGBot's **code interpreter**.

::: info Your administrator turns this on
The code interpreter runs in a separate, locked-down service that a self-hosted deployment enables on purpose. When it is off, RAGBot still accepts `.csv`, `.xls`, and `.xlsx` files and reads them as text, but it cannot compute with them, and `.tsv` and `.json` uploads are refused. Ask whoever runs your RAGBot if you are not sure. Developers: see [Deployment](/developer/deployment#the-sandbox-container).
:::

## What counts as a data file

RAGBot treats these formats as data rather than text:

- **Spreadsheets** — Excel workbooks (`.xlsx`, `.xls`)
- **Delimited text** — comma-separated and tab-separated values (`.csv`, `.tsv`)
- **JSON** — an array of records, one object per row (`.json`)

Add them to a [dataset](/concepts/datasets) the same way as any other file. Instead of splitting the file into text passages, RAGBot **profiles** it: it reads every sheet and records each column's name, type, how many values it holds, how many are unique, its lowest and highest value, and a few sample values. That profile is what the agent reads before it writes code, and it is what gets indexed for search.

Open a data file's detail panel to see the profile under **Schema**. Each sheet lists its row count and a table of columns. Check it once after upload: if a column you expect is missing or has the wrong type, the file probably needs a clean header row.

::: tip Files that profile well
Put the column names in the first row. Keep one table per sheet, and start it in cell A1. Avoid merged cells, notes above the table, and totals rows mixed in with the data. A file that a human reads easily is a file the agent computes with easily.
:::

## Ask a question about your data

Start a [chat](/concepts/chatting) and pick a dataset that holds an **Indexed** data file under **Choose sources to search**. Then ask as you would ask an analyst:

- _"How many orders shipped late in Q2?"_
- _"Which region had the highest average order value?"_
- _"Plot monthly signups for 2025 as a line chart."_
- _"Are there duplicate customer IDs in this file?"_

The agent decides when to use the code interpreter. A question that a text passage can answer still gets a normal cited answer. A question that needs a count, a sum, a comparison, or a chart gets a code run. The agent may run code more than once: a first run to look at the data, a second to compute the answer, a third to fix a mistake.

The agent can only reach data files in the datasets this conversation searches. It cannot see files in other datasets, other workspaces, or other conversations.

## Read a code interpreter answer

When the agent runs code, a **Code interpreter** card appears in the thread before the answer. While the run is in progress, the card shows a **Running** status. When it finishes, the card header shows the file it used, how many code cells it ran, and a **Done** or **Failed** status.

Open the card to see each run as a numbered cell, in the same style as a notebook:

- **Title** — a short label the agent gives to the step, such as _Sum fulfilled revenue by month_.
- **Input** — the Python code that ran. Use **Copy** to take it into your own tools.
- **Output** — everything the code printed, or the error it raised. A failed cell is marked in red and names the error.
- **Elapsed time** — how long the run took.

The answer below the card is written from that output, and any charts appear between the card and the answer. Everything is saved with the conversation, so a code run and its charts are still there when you reopen the thread later.

::: tip Check the work
The code is shown so you can read it. If a number surprises you, open the cell and check which column the code summed or how it filtered the rows. A wrong assumption in the code is the most common cause of a wrong answer, and you can correct it in your next message.
:::

## Charts

Ask for a chart and the agent draws one inline. It can draw **bar**, **line**, **pie**, **doughnut**, **scatter**, **radar**, **bubble**, and **polar area** charts, up to five per code run. Charts render in your browser, so you can hover over a point to read its value. Name the chart type in your question if you have a preference: _"as a bar chart"_ or _"on a line chart"_.

## Limits and safety

The code interpreter is built so that model-written code can do no harm:

- **Isolated** — the code runs in a separate, locked-down service with no access to the internet, to RAGBot's database, or to any other user's files. Only the data files the agent asked for are copied in, and they are deleted when the run ends.
- **Bounded** — each run has a time limit (30 seconds by default), a memory cap, and a cap on how much output it can produce. One run executes at a time. If the service is busy or unavailable, the agent is told so and answers as best it can without it.
- **A fixed toolkit** — the code can use pandas, numpy, DuckDB, pyarrow, and openpyxl. It cannot install packages or load other libraries.

Data files are handled the same way as every other document in RAGBot. Nothing about a run is stored except the code, its printed output, and the chart specs that appear in the conversation.

## When a run fails

A **Failed** cell is not the end of the answer. The agent sees the error and usually tries again with corrected code. If it gives up:

- **Check the schema.** Open the file in its dataset and confirm the columns and types under **Schema** match what you expected. Fix the file and reprocess it if they do not.
- **Name the column.** If the agent guessed a column wrong, tell it the exact column name in your next message.
- **Reduce the job.** A very large file or a very slow computation can hit the time limit. Ask a narrower question, or filter to a date range first.
- **Try again in a moment.** A busy or unavailable code interpreter clears on its own, usually within seconds.
