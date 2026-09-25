import db from "../config/database.js"

const TABLE = "conversation_shares"
/** Row columns without the snapshot body. Private responses use these. */
const META_COLUMNS = [
  "id",
  "conversation_id",
  "workspace_id",
  "created_by",
  "created_at",
  "updated_at",
]

/** Insert a share. `snapshot` is serialised for the JSONB column. */
export const create = (share, trx = db) =>
  trx
    .insert({ ...share, snapshot: JSON.stringify(share.snapshot) })
    .into(TABLE)
    .returning(META_COLUMNS)

/** Find the share of a conversation, without the snapshot. */
export const findByConversationId = (conversationId) =>
  db.select(META_COLUMNS).from(TABLE).where({ conversation_id: conversationId }).first()

/** Find the public payload of a share by its id. Returns no ids. */
export const findById = (id) =>
  db.select(["snapshot", "created_at", "updated_at"]).from(TABLE).where({ id }).first()

/** Replace the snapshot. The id does not change, so the public url stays valid. */
export const updateSnapshot = (id, snapshot, trx = db) =>
  trx(TABLE)
    .where({ id })
    .update({ snapshot: JSON.stringify(snapshot) })
    .returning(META_COLUMNS)

/** Delete a share. Returns the deleted row count. */
export const remove = (id, trx = db) => trx(TABLE).where({ id }).del()
