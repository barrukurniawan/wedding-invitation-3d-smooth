import {
  getGuestbookEntries as fetchGuestbookEntries,
  submitGuestbook as postGuestbook,
  type GuestbookEntry,
} from '../api-client'

export type { GuestbookEntry }

export async function submitGuestbook(entry: Omit<GuestbookEntry, 'id' | 'created_at'>): Promise<boolean> {
  try {
    await postGuestbook(entry)
    return true
  } catch (error) {
    console.error('[guestbook] Submit failed:', error)
    return false
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
