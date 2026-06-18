---
title: Agents
---

# Agents

<p class="lede">An agent is the assistant you talk to. It carries a <strong>persona</strong> (its instructions) and a <strong>model</strong> (the engine behind its answers). You choose which documents it can read when you start a chat — so the same agent can answer from different sources in different conversations.</p>

::: info Agents hold the persona; chats hold the sources
This is the one thing worth getting straight. An agent is **not** tied to a fixed set of datasets. You pick the datasets to search **per conversation**, in the chat itself. The agent decides _how_ to answer (tone, model, rules); the chat decides _what_ it reads. See [Chatting](/concepts/chatting) for choosing sources.
:::

## The built-in assistant

Every workspace starts with one agent — **RAGBot Assistant** — already set as the default. It's tuned to answer from your indexed sources and cite every claim, so you can start chatting immediately without configuring anything.

This default is a **system agent**: you can open and read its settings, but they're locked. To create your own variation, make a new agent.

<AgentMock />

## Create an agent

Open the **Agents** area and choose **New agent**. Name it after the job it does — `Support agent`, `Policy helper`, `Research assistant` — then set its persona and model. Everything is editable later.

<AgentDrawerMock />

## Configuration options

### System prompt (instructions & persona)

The system prompt tells the agent how to behave — its tone, who it's helping, and any rules to follow. A couple of clear sentences go a long way. For example:

- _"You are a friendly support assistant. Answer only from the sources in the conversation. If something isn't covered, say so and suggest contacting HR."_
- _"Be concise. Prefer bullet points. Always mention which document an answer came from."_

The built-in assistant's prompt is a good template: answer only from the linked sources, cite every claim, and say plainly when the sources don't cover a question rather than guessing.

### Model

The model is the engine behind the answers. The default (**GPT-5.4 Mini**) is quick and capable for most questions. Choose a stronger model when answers need more careful reasoning, and a faster one when you want speed over depth. You can switch any time.

### Temperature

Temperature (0–2) controls how creative the wording is. Lower values stay close to the source text and are best for factual, document-grounded answers; higher values are looser. For most RAG use, keep it low.

### Default agent

One agent in the workspace is the **default** — the one preselected when you start a new chat. Mark whichever agent you reach for most as the default.

## How to test your agent

The best test is a real one. Start a chat with the agent, **choose the sources** that hold the answers, and ask the questions your readers actually ask. Check three things:

1. **Is the answer correct?** Click the cited sources to confirm they say what the agent claims.
2. **Did it use the right documents?** If it's citing the wrong material, revisit which datasets you selected for the conversation.
3. **Does it admit gaps?** Ask something your documents _don't_ cover — a good agent should say it couldn't find an answer rather than invent one.

Adjust the system prompt or model, then ask again. A few rounds of this is usually all it takes to get an agent you trust.
