// Alamat kirim hadiah (opsional). Data publik untuk tamu dibentuk di sini supaya no. HP
// hanya ikut bila pasangan mengizinkan (gift_phone_public).
const clean = (value) => {
  const text = typeof value === 'string' ? value.replace(/\r\n/g, '\n').trim() : ''
  return text || null
}

export function publicGiftShipping(row = {}) {
  const address = clean(row.gift_address)
  if (!address) return null
  return {
    recipient: clean(row.gift_recipient),
    address,
    phone: Number(row.gift_phone_public) === 1 ? clean(row.gift_phone) : null,
    note: clean(row.gift_note),
  }
}
