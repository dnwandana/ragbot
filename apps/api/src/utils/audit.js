import crypto from "node:crypto"
import db from "../config/database.js"

/** Builds one audit_logs row. logAuditEvent and logAuditEvents share it. */
const toAuditRow = ({
  workspace_id,
  user_id,
  entity_type,
  entity_id,
  action,
  changes,
  context = {},
}) => ({
  id: crypto.randomUUID(),
  workspace_id,
  user_id,
  entity_type,
  entity_id,
  action,
  changes: changes ? JSON.stringify(changes) : null,
  context: JSON.stringify(context),
  created_at: new Date(),
})

/**
 * Inserts an immutable audit log entry for a workspace mutation.
 *
 * Accepts an optional Knex transaction (`trx`) so the log is written atomically
 * with the mutation it records. When `trx` is omitted the global db connection
 * is used (suitable for fire-and-forget audit calls outside a transaction).
 *
 * @param {Object} opts - Audit event options.
 * @param {import('knex').Knex.Transaction} [opts.trx] - Optional Knex transaction; falls back to the global db instance.
 * @param {string} opts.workspace_id - UUID of the workspace the event belongs to.
 * @param {string} opts.user_id - UUID of the user who performed the action.
 * @param {string} opts.entity_type - Audit entity type enum value (e.g. 'workspace', 'dataset', 'agent').
 * @param {string} opts.entity_id - UUID of the affected entity.
 * @param {string} opts.action - Audit action enum value (e.g. 'created', 'updated', 'deleted', 'invited', 'role_changed').
 * @param {Object|null} [opts.changes] - Before/after diff or mutation payload; omit for deletions with no diff.
 * @param {Object} [opts.context={}] - Arbitrary metadata (e.g. IP address, request ID, user agent).
 * @returns {Promise<void>}
 */
export const logAuditEvent = ({ trx, ...event }) =>
  (trx || db)("audit_logs").insert(toAuditRow(event))

/**
 * Inserts many audit entries in one statement. A move or a delete writes up to 500 rows.
 *
 * @param {Array<Object>} events - Events with the fields of logAuditEvent, without trx
 * @param {import('knex').Knex.Transaction} [trx] - Optional Knex transaction
 * @returns {Promise<void>}
 */
export const logAuditEvents = async (events, trx) => {
  if (!events.length) return
  await (trx || db)("audit_logs").insert(events.map(toAuditRow))
}
