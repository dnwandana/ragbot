---
title: FAQ
---

<script setup>
const items = [
  {
    q: "Who can see my data?",
    a: `<p>Only the people you've invited to the same workspace. Documents, agents, and chats live inside a single workspace, and a person has to be a member of that workspace to see anything in it.</p><p>Their <a href="/concepts/members-roles">role</a> then decides what they can do — a Viewer can read and chat, while only Owners and Admins can manage members or delete things.</p>`,
  },
  {
    q: "How is data kept separate between workspaces?",
    a: `<p>Each workspace is fully isolated. Its datasets, agents, and conversations are sealed off from every other workspace — an agent can only ever read documents in its own workspace.</p><p>So even if you belong to several workspaces, nothing crosses between them. See <a href="/concepts/workspaces">Workspaces</a> for more on what isolation means.</p>`,
  },
  {
    q: "What file types can I upload?",
    a: `<p>PDF (<code class="inl">.pdf</code>), Word (<code class="inl">.docx</code>, <code class="inl">.doc</code>), plain text or Markdown (<code class="inl">.txt</code>, <code class="inl">.md</code>), and data files — Excel (<code class="inl">.xlsx</code>, <code class="inl">.xls</code>), delimited text (<code class="inl">.csv</code>, <code class="inl">.tsv</code>), and JSON records (<code class="inl">.json</code>). Text-based files work best — a scanned PDF that's really an image of a page may not be readable. The <a href="/concepts/datasets">Datasets</a> page has the full list.</p>`,
  },
  {
    q: "Can RAGBot analyze a spreadsheet or draw a chart?",
    a: `<p>Yes. Upload a spreadsheet or another data file to a dataset, select that dataset in a chat, and ask for a count, a sum, a comparison, or a chart. The agent writes Python code, runs it in a locked-down sandbox, and answers from the result. A <strong>Code interpreter</strong> card above the answer shows the code and its output, and charts appear inline.</p><p>This needs the code interpreter to be enabled on your RAGBot deployment. See <a href="/concepts/data-analysis">Analyzing data files</a>.</p>`,
  },
  {
    q: "What happens to my data when the agent runs code?",
    a: `<p>Only the data files the agent asked for are copied into the sandbox for that one run, and they are deleted when the run ends. The sandbox has no access to the internet, to RAGBot's database, or to any other workspace. What is kept is the code, its printed output, and the chart specs, all saved with the conversation so you can review them later.</p>`,
  },
  {
    q: "Why might an agent not find something in my document?",
    a: `<p>Usually one of four things: the document is still <strong>processing</strong> and isn't searchable yet; the dataset holding it isn't connected to that agent; your wording is far from the document's own words; or the file is a scan with no selectable text.</p><p>Confirm the document reads <strong>Ready</strong>, check the agent's connected datasets, and try rephrasing. The <a href="/concepts/chatting">Chatting</a> page covers this in detail.</p>`,
  },
  {
    q: "How do I change someone's role?",
    a: `<p>If you're an Owner or Admin, open <strong>Workspace settings › Members</strong>, find the person, and pick a new role. The change takes effect immediately — including removing edit access if you move someone down to Viewer. Keep at least one Owner or Admin in every workspace.</p>`,
  },
  {
    q: "Can one agent use more than one dataset?",
    a: `<p>Yes. Connect as many datasets to an agent as the questions need — a handbook plus a benefits guide, for example. The agent searches across all of them and cites whichever documents it draws from. Keep the set focused, though: connecting unrelated datasets can pull in sources you didn't intend.</p>`,
  },
]
</script>

# Frequently asked questions

<p class="lede">Short answers to the things people ask most. If you're after the full story, each answer links to the page that covers it in depth.</p>

<Faq :items="items" />
