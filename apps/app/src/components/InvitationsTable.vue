<script setup>
/**
 * InvitationsTable — Displays a list of invitations in an Ant Design table.
 *
 * Features:
 *   - Color-coded status tags (pending, accepted, declined, revoked, expired)
 *   - Optional revoke button with confirmation (only for pending invitations)
 *
 * Props:
 *   - invitations: array of invitation objects
 *   - loading: table loading state
 *   - canRevoke: whether to show the revoke action column
 *
 * Emits:
 *   - revoke(invitationId) — when the user confirms revoking an invitation
 */

import { h, computed } from "vue"
import { Table, Tag, Button, Space, Popconfirm } from "ant-design-vue"

const props = defineProps({
  invitations: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
  canRevoke: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(["revoke"])

/**
 * Map invitation status values to Ant Design Tag colors.
 * @param {string} status - The invitation status
 * @returns {string} Ant Design tag color name
 */
function getStatusColor(status) {
  if (status === "pending") return "blue"
  if (status === "accepted") return "green"
  if (status === "declined") return "red"
  if (status === "revoked") return "default"
  if (status === "expired") return "orange"
  return "default"
}

/**
 * Handle invitation revocation after Popconfirm confirmation.
 * @param {string} invitationId - The invitation being revoked
 */
function handleRevoke(invitationId) {
  emit("revoke", invitationId)
}

/**
 * Table column definitions.
 * The Actions column is conditionally included based on the canRevoke prop.
 */
const columns = computed(() => {
  const cols = [
    {
      title: "Invitee",
      key: "invitee",
      /**
       * Show the invitee email if available, otherwise fall back to the
       * invitee_id (UUID). We do not have a username lookup in this context.
       */
      customRender: ({ record }) => {
        if (record.invitee_email) {
          return record.invitee_email
        }
        return record.invitee_id
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      // Render a color-coded tag based on the invitation status
      customRender: ({ text }) => {
        return h(Tag, { color: getStatusColor(text) }, () => text)
      },
    },
    {
      title: "Expires",
      dataIndex: "expires_at",
      key: "expires_at",
      // Format the ISO timestamp as a locale date string
      customRender: ({ text }) => {
        if (text) {
          return new Date(text).toLocaleDateString()
        }
        return "—"
      },
    },
    {
      title: "Created",
      dataIndex: "created_at",
      key: "created_at",
      // Format the ISO timestamp as a locale date string
      customRender: ({ text }) => {
        if (text) {
          return new Date(text).toLocaleDateString()
        }
        return "—"
      },
    },
  ]

  // Only add the Actions column when the consumer allows revoking invitations
  if (props.canRevoke) {
    cols.push({
      title: "Actions",
      key: "actions",
      /**
       * Show the revoke button only for invitations that are still pending.
       * Non-pending invitations cannot be revoked.
       */
      customRender: ({ record }) => {
        if (record.status !== "pending") {
          return null
        }
        return h(Space, null, () => [
          h(
            Popconfirm,
            {
              title: "Are you sure you want to revoke this invitation?",
              okText: "Yes",
              cancelText: "No",
              onConfirm: () => handleRevoke(record.id),
            },
            () => h(Button, { danger: true, size: "small" }, () => "Revoke"),
          ),
        ])
      },
    })
  }

  return cols
})
</script>

<template>
  <Table
    :columns="columns"
    :data-source="invitations"
    :loading="loading"
    :row-key="(record) => record.id"
    :pagination="false"
  />
</template>

<style scoped>
.invites-wrap {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--r);
  overflow: hidden;
  box-shadow: var(--shadow-1);
}
.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--line);
  flex-wrap: wrap;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 20px;
  font-size: 11.5px;
  font-weight: 500;
}
.chip--warn {
  background: var(--warn-bg);
  color: var(--warn);
  border: 1px solid var(--warn-border);
}
.chip--err {
  background: var(--err-bg);
  color: var(--err);
  border: 1px solid var(--err-border);
}
.chip--ghost {
  background: var(--bg-2);
  color: var(--ink-4);
  border: 1px solid var(--line);
}
.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}
.email-cell {
  font-size: 13px;
  font-weight: 500;
  color: var(--ink);
}
.muted {
  font-size: 12.5px;
  color: var(--ink-4);
}
.row-actions {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
}
.btn-sm {
  padding: 4px 10px;
  font-size: 12px;
  background: var(--surface);
  color: var(--ink-2);
  border: 1px solid var(--line-2);
  border-radius: var(--r-sm);
  cursor: pointer;
}
.btn-sm:hover {
  border-color: var(--brand);
  color: var(--brand);
}
.btn-danger-sm {
  padding: 4px 10px;
  font-size: 12px;
  background: transparent;
  color: var(--err);
  border: 1px solid var(--err-border);
  border-radius: var(--r-sm);
  cursor: pointer;
}
.btn-danger-sm:hover {
  background: var(--err-bg);
}
:deep(.ant-table-thead > tr > th) {
  background: var(--bg-2);
  font-size: 11.5px;
  font-weight: 600;
  color: var(--ink-4);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid var(--line);
}
:deep(.ant-table-tbody > tr > td) {
  border-bottom: 1px solid var(--line);
  padding: 10px 16px;
}
:deep(.ant-table-tbody > tr:hover > td) {
  background: var(--bg) !important;
}
</style>
