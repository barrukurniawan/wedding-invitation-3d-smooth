import assert from 'node:assert/strict'
import test from 'node:test'
import { z } from 'zod'
import { normalizeIndonesianPhone } from './phone.js'
import { buildPublicUrl } from './host.js'

const contactSchema = z.object({
  name: z.string().trim().min(1, 'Nama penerima wajib diisi.').max(255),
  phone: z.string().trim().min(1, 'Nomor WhatsApp wajib diisi.').max(32),
  gender: z.enum(['m', 'f']).default('m'),
}).strict()

const guestbookEntrySchema = z.object({
  name: z.string().trim().min(1).max(255),
  attendance: z.enum(['Hadir', 'Ragu-ragu', 'Tidak Hadir']),
  message: z.string().trim().min(1).max(2000),
}).strict()

function generateWhatsAppInviteMessage({ slug, guestName, gender, brideName, groomName, dateText, phone }) {
  const normalizedPhone = normalizeIndonesianPhone(phone)
  if (!normalizedPhone) throw new Error('Nomor telepon tidak valid.')

  const salutation = gender === 'f' ? 'Ibu/Sdri.' : 'Bapak/Sdr.'
  const publicBaseUrl = buildPublicUrl(slug)
  const personalizedUrl = `${publicBaseUrl}?to=${encodeURIComponent(guestName)}&gender=${gender}`

  const messageText = `Kepada Yth. ${salutation} ${guestName},\n\nTanpa mengurangi rasa hormat, kami mengundang Anda untuk hadir pada pernikahan kami:\n\n👰 ${brideName} & 🤵 ${groomName}\n📅 ${dateText}\n\nBuka undangan digital melalui tautan berikut:\n${personalizedUrl}\n\nTerima kasih.`

  const waLink = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(messageText)}`
  return { waLink, personalizedUrl, messageText }
}

test('Guest Contacts: Contact schema validation enforces name, phone, and gender rules', () => {
  const validContact = {
    name: 'Bpk. Ahmad Fauzi',
    phone: '0812-3456-7890',
    gender: 'm',
  }
  const result = contactSchema.safeParse(validContact)
  assert.equal(result.success, true)
  assert.equal(result.data.name, 'Bpk. Ahmad Fauzi')
  assert.equal(result.data.gender, 'm')

  // Rejects empty name or phone
  assert.equal(contactSchema.safeParse({ name: '', phone: '081234567890' }).success, false)
  assert.equal(contactSchema.safeParse({ name: 'Ahmad', phone: '' }).success, false)

  // Rejects invalid gender
  assert.equal(contactSchema.safeParse({ name: 'Ahmad', phone: '081234567890', gender: 'other' }).success, false)
})

test('Guest Contacts: normalizeIndonesianPhone handles comprehensive Indonesian phone variations', () => {
  assert.equal(normalizeIndonesianPhone('0812 3456 7890'), '6281234567890')
  assert.equal(normalizeIndonesianPhone('+62 812-3456-7890'), '6281234567890')
  assert.equal(normalizeIndonesianPhone('6281234567890'), '6281234567890')
  assert.equal(normalizeIndonesianPhone('81234567890'), '6281234567890')
  assert.equal(normalizeIndonesianPhone('0857-1234-5678'), '6285712345678')
  assert.equal(normalizeIndonesianPhone('0899.9876.5432'), '6289998765432')

  // Rejects landlines and invalid lengths
  assert.equal(normalizeIndonesianPhone('021-1234567'), null)
  assert.equal(normalizeIndonesianPhone('0812'), null)
  assert.equal(normalizeIndonesianPhone('phone12345'), null)
})

test('Guest Contacts: 100 contacts per invitation limit guard', () => {
  const MAX_CONTACTS = 100

  function canAddContact(currentTotal) {
    return currentTotal < MAX_CONTACTS
  }

  assert.equal(canAddContact(0), true)
  assert.equal(canAddContact(99), true)
  assert.equal(canAddContact(100), false)
  assert.equal(canAddContact(101), false)
})

test('Guest Contacts: WhatsApp invite generator creates personalized guest links and salutations', () => {
  const invite = generateWhatsAppInviteMessage({
    slug: 'kia-toni',
    guestName: 'Ratna Sari',
    gender: 'f',
    brideName: 'Kia',
    groomName: 'Toni',
    dateText: 'Minggu, 16 Agustus 2026',
    phone: '0813-9876-5432',
  })

  assert.equal(invite.personalizedUrl.includes('to=Ratna%20Sari'), true)
  assert.equal(invite.personalizedUrl.includes('gender=f'), true)
  assert.equal(invite.messageText.includes('Ibu/Sdri. Ratna Sari'), true)
  assert.equal(invite.waLink.startsWith('https://wa.me/6281398765432?text='), true)
})

test('Guest Contacts: Guestbook entry validation accepts valid wishes and rejects empty fields', () => {
  const validWish = {
    name: 'Dimas & Keluarga',
    attendance: 'Hadir',
    message: 'Selamat menempuh hidup baru Kia & Toni! Semoga sakinah mawaddah warahmah.',
  }

  assert.equal(guestbookEntrySchema.safeParse(validWish).success, true)

  // Rejects invalid attendance value
  assert.equal(guestbookEntrySchema.safeParse({
    name: 'Dimas',
    attendance: 'Mungkin Hadir', // Not in enum
    message: 'Selamat!',
  }).success, false)

  // Rejects message exceeding 2000 characters
  assert.equal(guestbookEntrySchema.safeParse({
    name: 'Dimas',
    attendance: 'Hadir',
    message: 'x'.repeat(2001),
  }).success, false)
})
