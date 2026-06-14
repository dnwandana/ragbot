import { useWorkspacesStore } from "./workspaces.js"
import { useRolesStore } from "./roles.js"
import { useMembersStore } from "./members.js"
import { useInvitationsStore } from "./invitations.js"
import { useAgentsStore } from "./agents.js"
import { useConversationsStore } from "./conversations.js"
import { useChatStore } from "./chat.js"
import { useDatasetsStore } from "./datasets.js"
import { useDatasetFilesStore } from "./datasetFiles.js"
import { useAuditLogsStore } from "./auditLogs.js"

/**
 * Reset every non-auth Pinia store to its initial state. Called on logout so a
 * subsequent login (without a hard reload) never sees the previous user's data.
 */
export function resetAllStores() {
  useWorkspacesStore().reset()
  useRolesStore().reset()
  useMembersStore().reset()
  useInvitationsStore().reset()
  useAgentsStore().reset()
  useConversationsStore().reset()
  useChatStore().reset()
  useDatasetsStore().reset()
  useDatasetFilesStore().reset()
  useAuditLogsStore().reset()
}
