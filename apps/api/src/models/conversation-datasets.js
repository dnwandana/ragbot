import db from "../config/database.js"

const TABLE = "conversation_datasets"

/**
 * Insert a new conversation-dataset link row.
 * @param {Object} row - Column values to insert (conversation_id, dataset_id, workspace_id).
 * @returns {Promise<Object[]>}
 */
export const create = (row) => db.insert(row).into(TABLE)

/**
 * Find all dataset links for a conversation.
 * @param {string} conversationId - Conversation UUID.
 * @returns {Promise<Object[]>} Array of { dataset_id, workspace_id }.
 */
export const findByConversationId = (conversationId) =>
  db.select(["dataset_id", "workspace_id"]).from(TABLE).where({ conversation_id: conversationId })

/**
 * Get just the dataset IDs linked to a conversation.
 * @param {string} conversationId - Conversation UUID.
 * @returns {Promise<string[]>} Array of dataset_id values.
 */
export const findDatasetIds = async (conversationId) => {
  const rows = await findByConversationId(conversationId)
  return rows.map((r) => r.dataset_id)
}

/**
 * Remove a specific dataset link from a conversation.
 * @param {string} conversationId - Conversation UUID.
 * @param {string} datasetId - Dataset UUID.
 * @returns {Promise<number>} Number of affected rows.
 */
export const remove = (conversationId, datasetId) =>
  db(TABLE).where({ conversation_id: conversationId, dataset_id: datasetId }).delete()

/**
 * Remove all dataset links for a conversation.
 * @param {string} conversationId - Conversation UUID.
 * @returns {Promise<number>} Number of affected rows.
 */
export const removeByConversationId = (conversationId) =>
  db(TABLE).where({ conversation_id: conversationId }).delete()
