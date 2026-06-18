<script setup>
/**
 * AuditTableMock — pixel-faithful static reproduction of AuditTable.vue.
 *
 * Row DOM reproduced (from real source apps/app/src/components/audit/AuditTable.vue):
 *   .at > .at-head.at-cols (5-column grid header)
 *   .at-row.at-cols per event:
 *     .at-actor  → .at-avatar + .at-actor-text (.at-actor-name + .at-actor-email)
 *     .at-action → .at-verb + .at-respill (entity icon + .at-res-text)
 *     category column → .at-badge (softBg/text inline style + category icon + label)
 *     .at-ts     → .at-rel + .at-abs
 *     .at-caret  → ChevronRight icon
 *
 * Ant→Lucide icon mapping (from auditIcons.js, already migrated):
 *   database  → Database   (datasets category + dataset entity)
 *   message   → MessageSquare (conversations)
 *   team      → Users      (members & roles category)
 *   robot     → Bot        (agents category + agent entity)
 *   appstore  → LayoutGrid (workspace)
 *   file      → FileText   (dataset_file entity)
 *   user      → User       (workspace_member entity)
 *   safety    → ShieldCheck (role / role_permission entity)
 *   paperclip → Paperclip  (conversation_dataset entity)
 *
 * Action→category→icon mapping per row:
 *   1. Grace Hopper  · created agent  → agents    → Bot      (entity: Bot)
 *   2. Ada Lovelace  · uploaded file  → datasets  → Database (entity: FileText)
 *   3. Alan Turing   · invited member → members   → Users    (entity: User)
 *   4. Ada Lovelace  · updated role   → members   → Users    (entity: ShieldCheck)
 *   5. Grace Hopper  · created dataset→ datasets  → Database (entity: Database)
 *
 * Prefix scheme: `au-` on every new class to avoid bleed with global utilities
 * (.chip, .pill, .tag, .avatar, .tablewrap, etc.). The real component's `.at-*`
 * class names are preserved 1-to-1 inside the scoped block.
 *
 * Dark selector: `.dark` (VitePress convention; never [data-theme="dark"]).
 * The real source uses `var(--brand-tint)` / `var(--brand)` tokens which already
 * resolve correctly under `.dark` via tokens.css — no extra dark overrides needed
 * beyond the `.dark .at-row:hover` and `.dark .at-row--sel` already covered by
 * design tokens.
 *
 * Avatar colors chosen deterministically to match auditMaps.actorColor():
 *   Grace Hopper   → #9c7a3a (warm amber — maps to index 4)
 *   Ada Lovelace   → #c2603a (burnt orange — maps to index 0)
 *   Alan Turing    → #4a6d80 (slate blue — maps to index 2)
 */
import { ChevronRight, Bot, Database, FileText, Users, User, ShieldCheck } from "lucide-vue-next"

const rows = [
  {
    // Grace Hopper · created agent · Support agent · 2m ago
    initials: "GH",
    avatarColor: "#9c7a3a",
    name: "Grace Hopper",
    email: "grace@example.com",
    verb: "Created agent",
    entityIcon: Bot,
    resource: "Support agent",
    catIcon: Bot,
    catLabel: "Agents",
    catBg: "rgba(156,122,58,0.12)",
    catText: "rgb(96,75,35)",
    rel: "2m ago",
    abs: "6:30 PM",
  },
  {
    // Ada Lovelace · uploaded file · employee-handbook-2024.pdf · 18m ago
    initials: "AL",
    avatarColor: "#c2603a",
    name: "Ada Lovelace",
    email: "ada@example.com",
    verb: "Uploaded file",
    entityIcon: FileText,
    resource: "employee-handbook-2024.pdf",
    catIcon: Database,
    catLabel: "Datasets",
    catBg: "rgba(194,96,58,0.12)",
    catText: "rgb(120,59,35)",
    rel: "18m ago",
    abs: "6:14 PM",
  },
  {
    // Alan Turing · invited member · katherine@example.com · 1h ago
    initials: "AT",
    avatarColor: "#4a6d80",
    name: "Alan Turing",
    email: "alan@example.com",
    verb: "Invited member",
    entityIcon: User,
    resource: "katherine@example.com",
    catIcon: Users,
    catLabel: "Members & roles",
    catBg: "rgba(90,125,82,0.12)",
    catText: "rgb(55,77,50)",
    rel: "1h ago",
    abs: "5:32 PM",
  },
  {
    // Ada Lovelace · updated role · Analyst · 3h ago
    initials: "AL",
    avatarColor: "#c2603a",
    name: "Ada Lovelace",
    email: "ada@example.com",
    verb: "Updated role",
    entityIcon: ShieldCheck,
    resource: "Analyst",
    catIcon: Users,
    catLabel: "Members & roles",
    catBg: "rgba(90,125,82,0.12)",
    catText: "rgb(55,77,50)",
    rel: "3h ago",
    abs: "3:32 PM",
  },
  {
    // Grace Hopper · created dataset · Company handbook · Yesterday
    initials: "GH",
    avatarColor: "#9c7a3a",
    name: "Grace Hopper",
    email: "grace@example.com",
    verb: "Created dataset",
    entityIcon: Database,
    resource: "Company handbook",
    catIcon: Database,
    catLabel: "Datasets",
    catBg: "rgba(194,96,58,0.12)",
    catText: "rgb(120,59,35)",
    rel: "Yesterday",
    abs: "11:15 AM",
  },
]
</script>

<template>
  <MockFrame
    label="ragbot — settings / audit log"
    caption="Every action in the workspace, newest first — actor, action, category, and time."
  >
    <div class="au-wrap">
      <div class="at" role="table">
        <!-- Header -->
        <div class="at-head at-cols" role="row">
          <div>Actor</div>
          <div>Action</div>
          <div>Category</div>
          <div>Timestamp</div>
          <div />
        </div>

        <!-- Rows — newest first -->
        <div v-for="r in rows" :key="r.name + r.rel" class="at-row at-cols" role="row">
          <!-- Actor -->
          <div class="at-actor">
            <span class="at-avatar" :style="{ background: r.avatarColor }">{{ r.initials }}</span>
            <div class="at-actor-text">
              <div class="at-actor-name">{{ r.name }}</div>
              <div class="at-actor-email">{{ r.email }}</div>
            </div>
          </div>

          <!-- Action -->
          <div class="at-action">
            <span class="at-verb">{{ r.verb }}</span>
            <span class="at-respill">
              <component :is="r.entityIcon" :size="16" />
              <span class="at-res-text">{{ r.resource }}</span>
            </span>
          </div>

          <!-- Category -->
          <div>
            <span class="at-badge" :style="{ background: r.catBg, color: r.catText }">
              <component :is="r.catIcon" :size="16" />
              {{ r.catLabel }}
            </span>
          </div>

          <!-- Timestamp -->
          <div class="at-ts">
            <div class="at-rel">{{ r.rel }}</div>
            <div class="at-abs">{{ r.abs }}</div>
          </div>

          <!-- Caret -->
          <div class="at-caret"><ChevronRight :size="16" /></div>
        </div>
      </div>
    </div>
  </MockFrame>
</template>

<style scoped>
/* ── outer wrapper — removes mock__body padding so the table bleeds edge-to-edge ── */
.au-wrap {
  margin: -18px;
}

/* ── table shell ── */
.at {
  display: flex;
  flex-direction: column;
}
.at-cols {
  display: grid;
  grid-template-columns: minmax(120px, 1.1fr) minmax(150px, 1.6fr) 130px 86px 20px;
  align-items: center;
  column-gap: 10px;
  padding: 13px 18px;
}

/* ── header row ── */
.at-head {
  padding: 10px 18px;
  background: var(--bg-2);
  border-bottom: 1px solid var(--line-2);
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink-3);
}

/* ── body rows ── */
.at-row {
  border-bottom: 1px solid var(--line);
  cursor: pointer;
  outline: none;
  transition: background var(--dur) var(--ease);
}
.at-row:last-child {
  border-bottom: none;
}
.at-row:hover {
  background: var(--bg-2);
}

/* ── actor cell ── */
.at-actor {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.at-avatar {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: 50%;
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11.5px;
  font-weight: 600;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.12);
}
.at-actor-text {
  min-width: 0;
}
.at-actor-name {
  font-size: var(--t-base);
  font-weight: 500;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.at-actor-email {
  font-size: var(--t-xs);
  color: var(--ink-3);
  font-family: var(--font-mono);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── action cell ── */
.at-action {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.at-verb {
  font-size: var(--t-base);
  font-weight: 500;
  color: var(--ink);
}
.at-respill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  max-width: 100%;
  padding: 2px 7px;
  background: var(--bg-2);
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  font-family: var(--font-mono);
  font-size: var(--t-xs);
  color: var(--ink-2);
  white-space: nowrap;
  overflow: hidden;
}
.at-respill > :first-child {
  color: var(--ink-3);
  flex-shrink: 0;
}
.at-res-text {
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── category badge ── */
.at-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--t-xs);
  font-weight: 500;
  padding: 4px 9px;
  border-radius: var(--r-sm);
  white-space: nowrap;
}

/* ── timestamp cell ── */
.at-ts {
  line-height: 1.3;
  min-width: 0;
}
.at-rel {
  font-size: var(--t-sm);
  color: var(--ink-2);
  font-weight: 500;
  white-space: nowrap;
}
.at-abs {
  font-size: var(--t-xs);
  color: var(--ink-4);
  font-family: var(--font-mono);
  white-space: nowrap;
}

/* ── caret ── */
.at-caret {
  display: flex;
  justify-content: flex-end;
  color: var(--ink-4);
}
.at-row:hover .at-caret {
  color: var(--brand);
}

/* ── dark mode — category badge colors use inline styles with fixed RGB,
   which are readable in dark mode at 0.12 opacity; no override needed.
   Avatar colors + respill + caret already adapt via design tokens. ── */
</style>
