import nodemailer from 'nodemailer'
import dotenv from 'dotenv'

dotenv.config()

// Create a transporter using SMTP settings from environment variables.
// If these are not configured, it will still be created but won't send successfully.
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

// Alamat pengirim: MAIL_FROM (mis. "MarryMe <admin@marryme.web.id>"). Untuk SMTP Gmail lama, SMTP_USER
// sendiri adalah alamat email, jadi tetap dipakai sebagai cadangan.
const mailFrom = () => process.env.MAIL_FROM || `"MarryMe" <${process.env.SMTP_USER}>`
const dashboardUrl = () => `${process.env.ROOT_ORIGIN || 'http://localhost:5173'}/account`

export function isEmailConfigured() {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS)
}

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

/**
 * Send activation email to the user.
 * @param {string} toEmail 
 * @param {object} param1 
 */
export async function sendActivationEmail(toEmail, { bride_name, groom_name, public_url, slug }) {
  if (!process.env.SMTP_USER) {
    console.log('[EmailService] SMTP_USER is not configured. Skipping email send for:', toEmail)
    return
  }

  const coupleName = bride_name && groom_name ? `${bride_name} & ${groom_name}` : 'Kalian'

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <h2 style="color: #8f1d45;">Undangan Pernikahan Kalian Sudah Aktif! 🎉</h2>
      <p>Halo,</p>
      <p>Pembayaran untuk undangan pernikahan <strong>${coupleName}</strong> telah kami verifikasi dan saat ini undangan sudah <strong>aktif sepenuhnya</strong>.</p>
      
      <div style="background-color: #f8f4f0; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #eadbd6;">
        <p style="margin-top: 0; font-size: 14px; color: #706662;">Link undangan kalian:</p>
        <h3 style="margin: 5px 0;">
          <a href="${public_url}" style="color: #8f1d45; text-decoration: none;">${slug}.marryme.web.id</a>
        </h3>
      </div>
      
      <p>Sekarang kalian sudah bisa menyebarkan undangan ini kepada keluarga dan kerabat, memantau buku tamu dan RSVP, serta mengedit informasi kapan pun diperlukan melalui dashboard.</p>
      
      <div style="margin: 30px 0;">
        <a href="${dashboardUrl()}" 
           style="background-color: #8f1d45; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
          Buka Dashboard
        </a>
      </div>
      
      <p style="font-size: 13px; color: #666; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee;">
        Salam hangat,<br>
        Tim MarryMe by Jago Institute
      </p>
    </div>
  `

  try {
    const info = await transporter.sendMail({
      from: mailFrom(),
      to: toEmail,
      subject: 'Undangan Aktif - MarryMe by Jago Institute',
      html: htmlContent,
    })
    console.log(`[EmailService] Activation email sent to ${toEmail}. MessageId: ${info.messageId}`)
    return true
  } catch (error) {
    console.error(`[EmailService] Failed to send email to ${toEmail}:`, error)
    return false
  }
}

/**
 * Salinan pesan chat admin ke email pemilik akun (hanya bila admin mencentang "Kirim juga ke email").
 * Isi pesan teks bebas, jadi selalu di-escape. Mengembalikan true/false, tidak melempar error.
 */
export async function sendSupportMessageEmail(toEmail, { name, body }) {
  if (!isEmailConfigured() || !toEmail) return false
  const greeting = name ? `Halo ${name},` : 'Halo,'
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <h2 style="color: #8f1d45; margin-bottom: 4px;">Pesan dari Admin MarryMe</h2>
      <p>${escapeHtml(greeting)}</p>
      <div style="background-color: #f8f4f0; padding: 16px 20px; border-radius: 8px; margin: 16px 0; border: 1px solid #eadbd6; white-space: pre-wrap; line-height: 1.5;">${escapeHtml(body)}</div>
      <p>Kamu bisa membalas lewat chat di dashboard MarryMe, atau langsung membalas email ini.</p>
      <div style="margin: 24px 0;">
        <a href="${dashboardUrl()}"
           style="background-color: #8f1d45; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
          Balas di Dashboard
        </a>
      </div>
      <p style="font-size: 13px; color: #666; margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee;">
        Salam hangat,<br>
        Tim MarryMe by Jago Institute
      </p>
    </div>
  `
  const text = `${greeting}\n\n${body}\n\nBalas lewat chat di dashboard: ${dashboardUrl()}\natau langsung balas email ini.\n\nTim MarryMe by Jago Institute`
  try {
    const info = await transporter.sendMail({
      from: mailFrom(),
      replyTo: process.env.MAIL_REPLY_TO || mailFrom(),
      to: toEmail,
      subject: 'Pesan dari Admin MarryMe',
      html,
      text,
    })
    console.log(`[EmailService] Support message emailed to ${toEmail}. MessageId: ${info.messageId}`)
    return true
  } catch (error) {
    console.error(`[EmailService] Failed to email support message to ${toEmail}:`, error.message)
    return false
  }
}

const fmtWib = (iso) =>
  new Date(iso).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) + ' WIB'
const fmtRp = (n) => `Rp${Number(n).toLocaleString('id-ID')}`

/**
 * Pengingat uji coba (sisa ≤ 24 jam) + harga khusus bila ada. Mengembalikan true/false, tidak melempar error.
 */
export async function sendTrialReminderEmail(toEmail, { name, slug, publicUrl, trialEndsAt, ended, normalPrice, offerPrice, offerExpiresAt }) {
  if (!isEmailConfigured() || !toEmail) return false
  const hello = name ? `Halo ${escapeHtml(name)},` : 'Halo,'
  const status = ended
    ? `Masa uji coba undangan <strong>${escapeHtml(slug)}.marryme.web.id</strong> sudah berakhir, jadi tamu belum bisa membukanya.`
    : `Undangan <strong>${escapeHtml(slug)}.marryme.web.id</strong> bisa dibuka tamu sampai <strong>${fmtWib(trialEndsAt)}</strong>.`
  const offer = offerPrice
    ? `<div style="background-color: #fff7e6; padding: 16px 20px; border-radius: 8px; margin: 16px 0; border: 1px solid #f3d9a4;">
        <p style="margin: 0 0 6px; font-size: 13px; color: #8a6a1f; font-weight: bold;">HARGA KHUSUS UNTUK KALIAN</p>
        <p style="margin: 0; font-size: 22px;"><s style="color: #999; font-size: 15px;">${fmtRp(normalPrice)}</s> <strong style="color: #8f1d45;">${fmtRp(offerPrice)}</strong></p>
        <p style="margin: 6px 0 0; font-size: 13px; color: #706662;">Berlaku sampai ${fmtWib(offerExpiresAt)}. Bayar sekali, undangan aktif selamanya.</p>
      </div>`
    : `<p>Bayar sekali ${fmtRp(normalPrice)}, undangan aktif selamanya.</p>`
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <h2 style="color: #8f1d45; margin-bottom: 4px;">${ended ? 'Uji coba undangan kalian sudah berakhir' : 'Uji coba undangan kalian segera berakhir'}</h2>
      <p>${hello}</p>
      <p>${status}</p>
      ${offer}
      <p>Bayar lewat QRIS, GoPay, DANA, atau PayPal langsung dari dashboard. Undangan aktif otomatis, semua isi tetap tersimpan.</p>
      <div style="margin: 24px 0;">
        <a href="${dashboardUrl()}" style="background-color: #8f1d45; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Aktifkan selamanya</a>
      </div>
      <p style="font-size: 13px; color: #666;">Lihat undangan: <a href="${publicUrl}" style="color: #8f1d45;">${escapeHtml(slug)}.marryme.web.id</a></p>
      <p style="font-size: 13px; color: #666; margin-top: 32px; padding-top: 16px; border-top: 1px solid #eee;">Salam hangat,<br>Tim MarryMe by Jago Institute</p>
    </div>
  `
  try {
    const info = await transporter.sendMail({
      from: mailFrom(),
      replyTo: process.env.MAIL_REPLY_TO || mailFrom(),
      to: toEmail,
      subject: offerPrice ? `Harga khusus ${fmtRp(offerPrice)} untuk undangan kalian` : 'Uji coba undangan kalian segera berakhir',
      html,
    })
    console.log(`[EmailService] Trial reminder sent to ${toEmail}. MessageId: ${info.messageId}`)
    return true
  } catch (error) {
    console.error(`[EmailService] Failed to send trial reminder to ${toEmail}:`, error.message)
    return false
  }
}
