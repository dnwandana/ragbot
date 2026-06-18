---
title: Quick Start
---

# Quick Start

<p class="lede">The fastest path from nothing to a working chatbot that answers from your own documents. Set aside about ten minutes — most of that is waiting for files to upload.</p>

::: info Before you begin
You'll need an account and at least one source to add — a document to upload (a PDF, Word file, or plain text) or the URL of a public web page. Anything you already use to answer questions — a handbook, a policy doc, meeting notes — works perfectly.
:::

## Five steps end to end

<Steps>
  <Step title="Join or create a workspace">
    <p>When you sign in, you land in a <strong>workspace</strong> — your sealed space for everything that follows. If a teammate invited you, accept the invite and you're in. Otherwise, create a new workspace and give it a name like <code class="inl">Acme Support</code>.</p>
  </Step>
  <Step title="Create a dataset">
    <p>A <strong>dataset</strong> is just a labelled bucket for related documents. Open the Datasets area, choose <strong>New dataset</strong>, and name it after the topic — for example <code class="inl">Company handbook</code>. It starts empty; you'll fill it next.</p>
  </Step>
  <Step title="Add your documents">
    <p>Open the dataset and choose <strong>Add source</strong>. Drag files into the <strong>Upload files</strong> tab, or switch to <strong>Web URL</strong> to pull in a public web page. RAGBot reads and indexes each source so it can be searched. A file shows <strong>Parsing</strong> while it works and <strong>Indexed</strong> when it's ready.</p>
  </Step>
  <Step title="Pick an agent (the default is fine)">
    <p>An <strong>agent</strong> is the assistant you'll talk to. Your workspace already includes a ready-to-use default, <strong>RAGBot Assistant</strong>, so you can skip ahead. Create your own later if you want a different persona or model.</p>
  </Step>
  <Step title="Start chatting">
    <p>Open a <strong>chat</strong>, use <strong>Choose sources to search</strong> to select the dataset you just filled, and ask a real question about your documents. You'll get an answer in plain language with <strong>cited sources</strong> you can click to verify. That's the whole loop — you're done.</p>
  </Step>
</Steps>

<ChatMock />

::: tip If an answer looks thin
Make sure the document finished processing (it should say **Indexed**), and that the dataset is selected under **Choose sources to search** in the chat. The [Chatting](/concepts/chatting) page covers how to read answers and what to do when something's missing.
:::

## Where to go next

You now have the full picture. Dive deeper into whichever piece you'll touch most:

<Cards>
  <Card to="/concepts/datasets" icon="database" title="Datasets" desc="Supported file types, what processing means, and how to keep documents organized." />
  <Card to="/concepts/agents" icon="bot" title="Agents" desc="Tune the model, write better instructions, and test your agent." />
</Cards>
