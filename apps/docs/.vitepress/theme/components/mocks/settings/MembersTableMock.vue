<script setup>
/**
 * MembersTableMock — pixel-faithful static reproduction of MembersTable + InvitationsTable.
 *
 * Columns reproduced (from real sources):
 *   Members section  : Member (avatar + name + email), Role (tag), Joined
 *   Invitations section: Invitee (email), Status (tag), Expires, Created
 *
 * Ant Design controls recreated with plain HTML:
 *   <a-table>  → <table> with tablewrap border + thead/tbody styles
 *   <a-tag>    → .mt-role pill (neutral, outlined) and .mt-status badge (green/amber)
 *   <a-select> → not shown (static mock; role is read-only tag in the non-owner view)
 *   <a-button> → not shown (actions column omitted; static)
 *
 * Prefix scheme: `mt-` (members-table) on every new class to avoid bleed with
 * fill-less global utilities (.chip, .spill, .tag, etc.). One fully-styled
 * global is deliberately reused as-is: `.avatar` (initials circle). The table
 * shell is now fully `mt-`-scoped and full-bleed (no `.tablewrap`).
 *
 * Status colors:
 *   Pending invitation  → amber  (--warn / --warn-bg / --warn-border)
 *
 * Role tag color: neutral outlined (--bg-2 bg, --ink-2 text, --line border).
 *
 * Dark selector: .dark (VitePress convention; never [data-theme="dark"]).
 */

const members = [
  {
    initials: "AL",
    name: "Ada Lovelace",
    email: "ada@example.com",
    role: "Owner",
    joined: "Jan 5, 2025",
  },
  {
    initials: "GH",
    name: "Grace Hopper",
    email: "grace@example.com",
    role: "Admin",
    joined: "Feb 12, 2025",
  },
  {
    initials: "AT",
    name: "Alan Turing",
    email: "alan@example.com",
    role: "Member",
    joined: "Mar 3, 2025",
  },
]

const invitations = [
  {
    email: "katherine@example.com",
    status: "pending",
    expires: "in 6 days",
    created: "2 days ago",
  },
]
</script>

<template>
  <MockFrame
    label="ragbot — settings / members"
    caption="Current members with their role and status, plus anyone with a pending invitation."
  >
    <div class="mt-bleed">
      <!-- Members table -->
      <div class="mt-wrap">
        <table class="mt-table">
          <thead>
            <tr>
              <th class="mt-th">Member</th>
              <th class="mt-th">Role</th>
              <th class="mt-th">Joined</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in members" :key="m.email" class="mt-row">
              <td class="mt-td">
                <div class="mt-cell">
                  <span class="avatar">{{ m.initials }}</span>
                  <div class="mt-meta">
                    <div class="mt-name">{{ m.name }}</div>
                    <div class="mt-email">{{ m.email }}</div>
                  </div>
                </div>
              </td>
              <td class="mt-td">
                <span class="mt-role">{{ m.role }}</span>
              </td>
              <td class="mt-td mt-muted">{{ m.joined }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pending invitations section -->
      <div class="mt-inv-head">Pending invitations</div>
      <div class="mt-wrap mt-wrap--inv">
        <table class="mt-table">
          <thead>
            <tr>
              <th class="mt-th">Invitee</th>
              <th class="mt-th">Status</th>
              <th class="mt-th">Expires</th>
              <th class="mt-th">Created</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="inv in invitations" :key="inv.email" class="mt-row">
              <td class="mt-td mt-inv-email">{{ inv.email }}</td>
              <td class="mt-td">
                <span class="mt-status mt-status--pending">{{ inv.status }}</span>
              </td>
              <td class="mt-td mt-muted">{{ inv.expires }}</td>
              <td class="mt-td mt-muted">{{ inv.created }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </MockFrame>
</template>

<style scoped>
/* ── full-bleed wrapper: cancels the .mock__body 18px padding ── */
.mt-bleed {
  margin: -18px;
}

/* ── table shell (flush, no inset border/radius) ── */
.mt-wrap {
  margin: 0;
  overflow: hidden;
}
.mt-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--t-base);
}

/* ── header ── */
.mt-th {
  text-align: left;
  padding: 10px 18px;
  background: var(--bg-2);
  font-size: 11.5px;
  font-weight: 600;
  color: var(--ink-3);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid var(--line-2);
}

/* ── body rows ── */
.mt-row:last-child .mt-td {
  border-bottom: none;
}
.mt-td {
  padding: 10px 18px;
  border-bottom: 1px solid var(--line-2);
  vertical-align: middle;
}
.mt-row:hover .mt-td {
  background: var(--bg);
}

/* ── member cell (avatar + name + email) ── */
.mt-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}
.mt-meta {
  min-width: 0;
}
.mt-name {
  font-weight: 600;
  color: var(--ink);
  font-size: var(--t-base);
  line-height: 1.3;
}
.mt-email {
  font-size: var(--t-xs);
  color: var(--ink-3);
  margin-top: 2px;
}
.mt-inv-email {
  font-size: var(--t-base);
  color: var(--ink-2);
}
.mt-muted {
  color: var(--ink-2);
  font-size: var(--t-sm);
}

/* ── role tag — neutral outlined pill (stronger contrast) ── */
.mt-role {
  display: inline-flex;
  align-items: center;
  font: 500 var(--t-xs)/1 var(--font-sans);
  padding: 4px 9px;
  border-radius: 999px;
  background: var(--bg-2);
  color: var(--ink);
  border: 1px solid var(--line-2);
  white-space: nowrap;
}

/* ── status badges ── */
.mt-status {
  display: inline-flex;
  align-items: center;
  font: 500 var(--t-xs)/1 var(--font-sans);
  padding: 4px 9px;
  border-radius: 999px;
  white-space: nowrap;
}
.mt-status--pending {
  background: var(--warn-bg);
  color: var(--warn);
  border: 1px solid var(--warn-border);
}

/* ── section label for invitations (re-add gutter after bleed) ── */
.mt-inv-head {
  font-size: var(--t-sm);
  font-weight: 600;
  color: var(--ink-2);
  padding: 14px 18px 6px;
}

/* ── divider between the two flush tables ── */
.mt-wrap--inv {
  border-top: 1px solid var(--line-2);
}

/* ── dark mode overrides ── */
.dark .mt-status--pending {
  background: var(--bg);
}
</style>
