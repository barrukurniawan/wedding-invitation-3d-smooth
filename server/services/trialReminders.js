// Email pengingat uji coba + harga khusus (sekali per undangan/akun). Dijalankan timer berkala di index.js.
import pool from '../db.js'
import { sendTrialReminderEmail } from './email.js'
import { buildPublicUrl } from './host.js'
import { invitationPriceIdr } from './paymentConfig.js'
import { toIso, trialConfig, utcMs } from './trial.js'

export async function sendTrialReminders(now = Date.now()) {
  const { offerPrice, offerHours } = trialConfig()
  const normal = invitationPriceIdr()
  const offer = offerPrice && normal && offerPrice < normal ? offerPrice : null
  // Sisa ≤ 24 jam, atau sudah habis < 24 jam lalu (server sempat mati), belum bayar, belum diingatkan.
  const [rows] = await pool.query(
    `SELECT i.id, i.slug, i.trial_ends_at, u.email, u.display_name
     FROM invitations i JOIN users u ON u.id = i.owner_user_id
     WHERE i.deleted_at IS NULL AND i.paid_at IS NULL AND i.trial_reminder_sent_at IS NULL
       AND i.trial_ends_at IS NOT NULL
       AND i.trial_ends_at <= UTC_TIMESTAMP() + INTERVAL 24 HOUR
       AND i.trial_ends_at > UTC_TIMESTAMP() - INTERVAL 24 HOUR
     LIMIT 50`,
  )
  for (const row of rows) {
    // Klaim dulu (atomik) supaya pengingat & harga khusus hanya diberikan sekali.
    const [claim] = await pool.query(
      `UPDATE invitations
       SET trial_reminder_sent_at = UTC_TIMESTAMP(),
           offer_price = ?, offer_expires_at = IF(? IS NULL, NULL, UTC_TIMESTAMP() + INTERVAL ? HOUR)
       WHERE id = ? AND trial_reminder_sent_at IS NULL AND paid_at IS NULL`,
      [offer, offer, offerHours, row.id],
    )
    if (!claim.affectedRows) continue
    const trialEnd = utcMs(row.trial_ends_at)
    await sendTrialReminderEmail(row.email, {
      name: row.display_name,
      slug: row.slug,
      publicUrl: buildPublicUrl(row.slug),
      trialEndsAt: toIso(trialEnd),
      ended: trialEnd <= now,
      normalPrice: normal,
      offerPrice: offer,
      offerExpiresAt: offer ? toIso(now + offerHours * 3600 * 1000) : null,
    })
  }
  return rows.length
}
