<script setup>
/**
 * MembersTable — Displays workspace members in an Ant Design table.
 *
 * Features:
 *   - Optional role-change dropdown (controlled by `canUpdateRole`)
 *   - Optional remove button with confirmation (controlled by `canRemove`)
 *
 * Props:
 *   - members: array of member objects
 *   - roles: available roles for the role-change dropdown
 *   - loading: table loading state
 *   - canUpdateRole: whether to show the role-change Select
 *   - canRemove: whether to show the remove (delete) button
 *
 * Emits:
 *   - roleChange({ memberId, roleId }) — when a member's role is changed
 *   - remove(memberId) — when a member is removed (after Popconfirm)
 */

import { h, computed } from "vue"
import { Table, Tag, Select, Button, Space, Popconfirm } from "ant-design-vue"
import { Trash2 } from "lucide-vue-next"

const props = defineProps({
  members: {
    type: Array,
    required: true,
  },
  roles: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
  canUpdateRole: {
    type: Boolean,
    default: false,
  },
  canRemove: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(["roleChange", "remove"])

/**
 * Handle role change from the Select dropdown.
 * @param {string} memberId - The workspace_members record ID
 * @param {string} roleId - The newly selected role ID
 */
function handleRoleChange(memberId, roleId) {
  emit("roleChange", { memberId, roleId })
}

/**
 * Handle member removal after Popconfirm confirmation.
 * @param {string} memberId - The workspace_members record ID
 */
function handleRemove(memberId) {
  emit("remove", memberId)
}

/**
 * Table column definitions.
 * The Actions column is conditionally included based on the canRemove prop.
 */
const columns = computed(() => {
  const cols = [
    {
      title: "Name",
      dataIndex: "full_name",
      key: "full_name",
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      // Show a dash when email is not available
      customRender: ({ text }) => {
        if (text) {
          return text
        }
        return "—"
      },
    },
    {
      title: "Role",
      key: "role",
      /**
       * Render either a Select dropdown (when role changes are allowed)
       * or a static Tag showing the current role name.
       */
      customRender: ({ record }) => {
        if (props.canUpdateRole) {
          return h(
            Select,
            {
              value: record.role_id,
              style: { width: "140px" },
              onChange: (value) => handleRoleChange(record.id, value),
            },
            () =>
              props.roles.map((role) =>
                h(Select.Option, { key: role.id, value: role.id }, () => role.name),
              ),
          )
        }
        return h(Tag, null, () => record.role_name)
      },
    },
    {
      title: "Joined",
      dataIndex: "joined_at",
      key: "joined_at",
      // Format the ISO timestamp as a locale date string
      customRender: ({ text }) => {
        if (text) {
          return new Date(text).toLocaleDateString()
        }
        return "—"
      },
    },
  ]

  // Only add the Actions column when the consumer allows member removal
  if (props.canRemove) {
    cols.push({
      title: "Actions",
      key: "actions",
      customRender: ({ record }) => {
        return h(Space, null, () => [
          h(
            Popconfirm,
            {
              title: "Are you sure you want to remove this member?",
              okText: "Yes",
              cancelText: "No",
              onConfirm: () => handleRemove(record.id),
            },
            () =>
              h(Button, { danger: true, size: "small" }, () => [
                h(Trash2, { size: 16 }),
                " Remove",
              ]),
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
    :data-source="members"
    :loading="loading"
    :row-key="(record) => record.id"
    :pagination="false"
  />
</template>

<style scoped>
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
