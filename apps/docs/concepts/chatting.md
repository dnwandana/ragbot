---
title: Chatting with your data
---

# Chatting with your data

<p class="lede">Chat is where it all comes together. You pick an agent, choose which sources to search, ask a question in plain language, and get an answer drawn from your documents — with citations you can click to check the source for yourself.</p>

## Start a chat

Open **Conversations** and choose **New conversation**, or hit **Start chat** from any dataset. You'll land on a clean welcome screen with a single message box.

Two controls sit next to it:

- **Agent** — which assistant answers. The workspace default is preselected; switch it if you've built a specialized agent.
- **Choose sources to search** — the datasets this conversation can read. Open the picker and select one or more. The button shows a running count (`1 source`, `3 sources`).

<NewChatMock />

Open the **agent** button to switch which assistant answers — your workspace default is preselected:

<AgentPickerMock />

Open **Choose sources to search** to pick the datasets this conversation can read:

<SourcePickerMock />

::: tip Pick your sources before you ask
A conversation answers only from the datasets you select here — that's how the same agent can stay focused on contracts in one chat and the handbook in another. If answers seem to miss obvious facts, check that the right dataset is selected.
:::

Then type your question and send it, just like any messaging app. Ask naturally — _"What's our refund window?"_ works as well as a precise query. If a first answer is close but not quite right, follow up in the same conversation; the thread is remembered and the agent refines as you go.

## Read answers and their cited sources

As the agent works, you'll see it **searching your sources**, then the answer streams in. Throughout the answer you'll find small numbered markers like <span class="cite">1</span> — these are **citations**. Each one points to the exact passage the agent used.

<ChatMock />

Use the **sources** toggle beneath an answer (it shows a count like `1 source`) to open the citations panel. There, every cited passage is grouped by the document it came from, labelled with a rough relevance (for example **Med** or **Low**), and shown with the actual quoted text. Click a citation or an excerpt to read it in context. This is what makes an answer trustworthy: you never have to take the agent's word for it.

<CitationsPanelMock />

::: tip Always spot-check the sources
Citations are there to be used. When an answer matters, click through to confirm the document really says what the agent summarized. It takes a second and turns a good answer into a verified one.
:::

## Find past conversations

Every conversation is saved automatically. Your **chat history** sits in the sidebar and in the Conversations list, newest first, so you can reopen a thread, keep asking, or revisit an answer you found useful. Each entry shows the agent it used and how many sources it searched. History belongs to the workspace you're in — switch workspaces and you'll see that workspace's conversations instead.

## When an agent can't find something

Sometimes an agent will say it couldn't find an answer. That's a feature, not a failure — it means the agent stayed honest instead of guessing. A few common reasons and quick fixes:

- **No sources are selected.** Open **Choose sources to search** and pick the dataset that holds the answer.
- **The document is still processing.** Check the dataset; wait for it to read **Indexed**.
- **The wording is far off.** Try rephrasing with terms that appear in the document itself.
- **The file isn't readable.** A scanned PDF with no selectable text can't be searched — replace it with a text-based version.
