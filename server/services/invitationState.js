import pool from '../db.js'

const transitions = new Map([
  ['draft', new Set(['awaiting_payment', 'pending_verification'])],
  ['awaiting_payment', new Set(['pending_verification', 'draft'])],
  ['pending_verification', new Set(['active', 'draft'])],
  ['active', new Set(['suspended', 'expired'])],
  ['suspended', new Set(['active'])],
  ['expired', new Set()],
  ['deleted', new Set()],
])

export function canTransition(fromStatus, toStatus) {
  return transitions.get(fromStatus)?.has(toStatus) === true
}

export async function transitionInvitation({
  invitationId,
  toStatus,
  actorType = 'system',
  actorId = null,
  reason = null,
  paymentId = null,
  connection = pool,
}) {
  const [rows] = await connection.query(
    'SELECT id, status FROM invitations WHERE id = ? AND deleted_at IS NULL FOR UPDATE',
    [invitationId],
  )
  const invitation = rows[0]
  if (!invitation) {
    const error = new Error('Undangan tidak ditemukan.')
    error.code = 'INVITATION_NOT_FOUND'
    throw error
  }
  if (invitation.status === toStatus) return invitation.status
  if (!canTransition(invitation.status, toStatus)) {
    const error = new Error(`Perubahan status ${invitation.status} ke ${toStatus} tidak diizinkan.`)
    error.code = 'INVALID_STATUS_TRANSITION'
    throw error
  }

  await connection.query(
    `UPDATE invitations
     SET status = ?,
         rejection_reason = CASE WHEN ? = 'draft' THEN ? ELSE NULL END,
         activated_at = CASE WHEN ? = 'active' THEN UTC_TIMESTAMP() ELSE activated_at END,
         verified_by = CASE WHEN ? = 'active' AND ? = 'admin' THEN ? ELSE verified_by END,
         verified_at = CASE WHEN ? = 'active' THEN UTC_TIMESTAMP() ELSE verified_at END
     WHERE id = ?`,
    [toStatus, toStatus, reason, toStatus, toStatus, actorType, actorId, toStatus, invitationId],
  )
  await connection.query(
    `INSERT INTO invitation_status_events
       (invitation_id, from_status, to_status, actor_type, actor_id, reason, payment_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [invitationId, invitation.status, toStatus, actorType, actorId, reason, paymentId],
  )
  return toStatus
}

export async function withTransaction(callback) {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const result = await callback(connection)
    await connection.commit()
    return result
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}
