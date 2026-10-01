import {
  getGuestbookEntries as fetchGuestbookEntries,
  submitGuestbook as postGuestbook,
  type GuestbookEntry,
} from '../api-client'

export type { GuestbookEntry }

export interface SubmitGuestbookResult {
  success: boolean
  error?: string
}

export async function submitGuestbook(
  entry: Omit<GuestbookEntry, 'id' | 'created_at'>,
): Promise<SubmitGuestbookResult> {
  try {
    await postGuestbook(entry)
    return { success: true }
  } catch (error: any) {
    console.error('[guestbook] Submit failed:', error)
    return {
      success: false,
      error: error?.message || 'Ucapan belum dapat dikirim. Coba lagi.',
    }
  }
}

export async function getGuestbookEntries(): Promise<GuestbookEntry[]> {
  try {
    return await fetchGuestbookEntries()
  } catch (error) {
    console.error('[guestbook] Fetch failed:', error)
    return []
  }
}
