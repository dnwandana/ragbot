import db from "../config/database.js"

const TABLE = "message_citations"
const COLUMNS = [
  "id",
  "message_id",
  "chunk_id",
  "citation_number",
  "relevance_score",
  "cited_text",
  "created_at",
]

/**
 * Bulk insert citations for a message.
 * @param {Object[]} citations - Array of citation row objects.
 * @returns {Promise<Object[]|[]>} Array of inserted rows, or empty array if input is empty.
 */
export const bulkInsert = (citations) =>
  citations.length ? db.insert(citations).into(TABLE).returning(COLUMNS) : []

/**
 * Find all citations for a message, ordered by citation_number.
 * @param {string} messageId - Message UUID.
 * @returns {Promise<Object[]>}
 */
export const findByMessageId = (messageId) =>
  db.select(COLUMNS).from(TABLE).where({ message_id: messageId }).orderBy("citation_number")

/**
 * Find all citations across all messages in a conversation.
 * @param {string} conversationId - Conversation UUID.
 * @returns {Promise<Object[]>}
 */
export const findByConversationId = (conversationId) =>
  // Relies on controller-level soft-delete check before this is called.
  db(TABLE)
    .select(COLUMNS.map((col) => `${TABLE}.${col}`))
    .join("messages", "messages.id", `${TABLE}.message_id`)
    .where("messages.conversation_id", conversationId)
    .orderBy(`${TABLE}.created_at`, "asc")
