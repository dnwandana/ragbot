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
    a: `<p>PDF (<code class="inl">.pdf</code>), Word (<code class="inl">.docx</code>, <code class="inl">.doc</code>), and plain text or Markdown (<code class="inl">.txt</code>, <code class="inl">.md</code>). Text-based files work best — a scanned PDF that's really an image of a page may not be readable. The <a href="/concepts/datasets">Datasets</a> page has the full list.</p>`,
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
