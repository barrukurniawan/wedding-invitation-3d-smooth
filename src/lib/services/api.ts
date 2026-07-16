export interface GuestbookEntry {
  name: string
  attendance: string
  message: string
}

export async function submitGuestbook(entry: GuestbookEntry): Promise<void> {
  // TODO: hubungkan ke backend/Firebase/Supabase sebelum produksi.
  // Saat ini hanya simulasi (alert) — sesuai kontrak lama.
  return Promise.resolve()
}
