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
        <a href="${process.env.ROOT_ORIGIN || 'http://localhost:5173'}/account" 
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
      from: `"MarryMe" <${process.env.SMTP_USER}>`,
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
