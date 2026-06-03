---
title: Agents
---

# Agents

<p class="lede">An agent is the assistant you actually talk to. You connect it to one or more datasets, give it a model and a persona, and it answers your questions using only the documents you've pointed it at.</p>

## Create an agent

Open the **Agents** area and choose **New agent**. Name it after the job it does — `Support agent`, `Policy helper`, `Research assistant`. You'll then choose its datasets and settings, all of which you can change later.

## Connect one or more datasets

This is the most important choice you'll make. The datasets you connect are the **only** documents the agent can read — its entire world of knowledge. Connect a single dataset for a focused helper, or several when a question might span topics (say, a handbook plus a benefits guide).

::: tip Connect only what's relevant
More datasets isn't always better. If an agent keeps pulling from documents you didn't mean, disconnect the ones that don't belong. A tight set of sources gives more precise answers.
:::

## Configuration options

Beyond its datasets, an agent has a few settings that shape how it responds.

<AgentMock />

### Model

The model is the engine behind the answers. A **balanced** model is a great default — quick and capable for most questions. Choose a stronger model when answers need more careful reasoning, and a faster one when you want speed over depth. You can switch any time.

### Instructions & persona

Instructions tell the agent how to behave — its tone, who it's helping, and any rules to follow. A couple of clear sentences go a long way. For example:

- _"You are a friendly support assistant. Answer only from the connected handbook. If something isn't covered, say so and suggest contacting HR."_
- _"Be concise. Prefer bullet points. Always mention which document an answer came from."_

### Behavior

Behavior settings fine-tune the experience — for instance, keeping **cited sources** on so every answer shows where it came from, or asking the agent to say plainly when it can't find something rather than guessing. When in doubt, leave the defaults: cite sources on, stay grounded in the documents.

## How to test your agent

The best test is a real one. Open a chat with the agent and ask the questions your readers actually ask. Check three things:

1. **Is the answer correct?** Click the cited sources to confirm they say what the agent claims.
2. **Did it use the right documents?** If it's citing the wrong dataset, revisit what's connected.
3. **Does it admit gaps?** Ask something your documents _don't_ cover — a good agent should say it couldn't find an answer rather than invent one.

Adjust the instructions or connected datasets, then ask again. A few rounds of this is usually all it takes to get an agent you trust.
