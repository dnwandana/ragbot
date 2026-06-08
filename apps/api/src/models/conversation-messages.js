import db from "../config/database.js"

const TABLE = "conversation_messages"
const COLUMNS = [
  "id",
  "conversation_id",
  "workspace_id",
  "role",
  "step_type",
  "content",
  "content_json",
  "model",
  "prompt_tokens",
  "completion_tokens",
  "total_tokens",
  "latency_ms",
  "created_by",
  "created_at",
  "updated_at",
]

/**
 * Insert a new message row.
 * @param {Object} message - Column values to insert.
 * @returns {Promise<Object[]>} Array containing the inserted row.
 */
export const create = (message) => db.insert(message).into(TABLE).returning(COLUMNS)

/**
 * Find a single message matching conditions.
 * @param {Object} conditions - Knex where conditions (e.g. { id, conversation_id }).
 * @returns {Promise<Object|undefined>}
 */
export const findOne = (conditions) => db.select(COLUMNS).from(TABLE).where(conditions).first()

/**
 * Find all messages for a conversation, ordered chronologically.
 * @param {string} conversationId - Conversation UUID.
 * @returns {Promise<Object[]>}
 */
export const findByConversationId = (conversationId) =>
  db
    .select(COLUMNS)
    .from(TABLE)
    .where({ conversation_id: conversationId })
    .orderBy("created_at", "asc")

/**
 * Find only visible messages for a conversation (input and final_answer steps).
 * @param {string} conversationId - Conversation UUID.
 * @returns {Promise<Object[]>}
 */
export const findVisibleByConversationId = (conversationId) =>
  db
    .select(COLUMNS)
    .from(TABLE)
    .where({ conversation_id: conversationId })
    .whereIn("step_type", ["input", "final_answer"])
    .orderBy("created_at", "asc")
