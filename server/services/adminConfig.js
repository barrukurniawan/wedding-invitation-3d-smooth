export const ADMIN_CONFIG_FIELDS = [
  'bride_name',
  'groom_name',
  'bride_parents',
  'groom_parents',
  'wedding_photo',
  'wedding_date',
  'akad_date',
  'akad_time',
  'akad_location',
  'resepsi_date',
  'resepsi_time',
  'resepsi_location',
  'qris_image',
  'bank_name',
  'bank_account',
  'bank_holder',
  'maps_url',
  'venue_address',
  'gallery_photos',
  'quote',
]

export function pickAdminConfigFields(config) {
  return Object.fromEntries(
    ADMIN_CONFIG_FIELDS
      .filter((field) => config[field] !== undefined)
      .map((field) => [field, config[field]]),
  )
}
