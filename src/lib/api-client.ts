export interface WeddingConfig {
  id: number
  bride_name: string
  groom_name: string
  bride_parents: string
  groom_parents: string
  wedding_photo: string
  wedding_date: string
  akad_date: string
  akad_time: string
  akad_location: string
  resepsi_date: string
  resepsi_time: string
  resepsi_location: string
  qris_image: string
  bank_name: string
  bank_account: string
  bank_holder: string
  maps_url: string
  venue_address: string
  gallery_photos: string[]
  quote: string
  bgm_url?: string
  bgm_title?: string
  updated_at: string
}

export interface GuestbookEntry {
  id: string
  name: string
  attendance: 'Hadir' | 'Ragu-ragu' | 'Tidak Hadir'
  message: string
  created_at: string
}

export interface GuestbookPage {
  items: GuestbookEntry[]
  page: number
  limit: number
  total: number
}

export interface GuestbookStats {
  total: number
  hadir: number
  ragu: number
  tidakHadir: number
}

export interface AdminSession {
  authenticated: true
  user: { id: number; username: string }
}

export interface UserAccount {
  id: number
  email: string | null
  displayName: string
  avatarUrl: string | null
}

export interface UserSession {
  authenticated: true
  user: UserAccount
  csrfToken: string
}

export interface OwnerInvitation {
  id: number
  slug: string
  status: string
  payment_proof_url: string | null
  payment_submitted_at: string | null
  reception_at: string
  timezone: string
  expires_at: string
  retention_until: string
  activated_at: string | null
  rejection_reason?: string | null
  public_url: string
  config: {
    bride_name: string
    groom_name: string
    wedding_date: string
    resepsi_date: string
    resepsi_location: string
  } | null
}

export interface AdminInvitation {
  id: number
  slug: string
  status: string
  payment_proof_url: string | null
  payment_submitted_at: string | null
  created_at: string
  activated_at: string | null
  bride_name: string | null
  groom_name: string | null
  user_email: string | null
  user_display_name: string | null
  rejection_reason?: string | null
}

export interface InvitationContact {
  id: string
  name: string
  phone: string
  created_at: string
  updated_at: string
}

let csrfToken = ''

export function setCsrfToken(token: string) {
  csrfToken = token || ''
}

export function getCsrfToken() {
  return csrfToken
}

export const defaultConfig: WeddingConfig = {
  id: 1,
  bride_name: 'Kia Anindya',
  groom_name: 'Toni Pratama',
  bride_parents: 'Bpk. ... & Ibu. ...',
  groom_parents: 'Bpk. ... & Ibu. ...',
  wedding_photo: '',
  wedding_date: '2026-08-16T08:00:00+07:00',
  akad_date: 'Minggu, 16 Agustus 2026',
  akad_time: '08:00 - 10:00 WIB',
  akad_location: 'Kediaman Mempelai Wanita',
  resepsi_date: 'Minggu, 16 Agustus 2026',
  resepsi_time: '11:00 - 14:00 WIB',
  resepsi_location: 'Gedung Serbaguna',
  qris_image: '',
  bank_name: 'BCA',
  bank_account: '1234567890',
  bank_holder: 'Toni Pratama',
  maps_url: '',
  venue_address: '',
  gallery_photos: [],
  quote: '',
  bgm_url: '/audio/Marry%20You.mp3',
  bgm_title: 'Marry You',
  updated_at: '',
}

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

const ADMIN_EDITABLE_CONFIG_FIELDS = [
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
] as const

export type AdminConfigUpdate = Partial<Pick<WeddingConfig, (typeof ADMIN_EDITABLE_CONFIG_FIELDS)[number]>>

export function buildAdminConfigPayload(config: Partial<WeddingConfig>): AdminConfigUpdate {
  const payload = {} as AdminConfigUpdate
  for (const field of ADMIN_EDITABLE_CONFIG_FIELDS) {
    if (config[field] !== undefined) {
      payload[field] = config[field] as never
    }
  }
  return payload
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  const method = (init.method || 'GET').toUpperCase()
  if (csrfToken && method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
    headers.set('X-CSRF-Token', csrfToken)
  }
  const response = await fetch(`/api${path}`, { ...init, headers, credentials: 'same-origin' })
  if (!response.ok) {
    let message = 'Permintaan tidak dapat diproses.'
    let code = 'REQUEST_FAILED'
    try {
      const body = await response.json()
      message = body.error?.message || message
      code = body.error?.code || code
    } catch {
      // Use the generic message for non-JSON gateway errors.
    }
    throw new ApiError(response.status, code, message)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export function getPublicConfig() {
  return request<WeddingConfig>('/config')
}

export function submitGuestbook(entry: Omit<GuestbookEntry, 'id' | 'created_at'>) {
  return request<GuestbookEntry>('/guestbook', { method: 'POST', body: JSON.stringify(entry) })
}

export async function getGuestbookEntries(): Promise<GuestbookEntry[]> {
  return request<GuestbookEntry[]>('/guestbook')
}

export function login(username: string, password: string) {
  return request<void>('/admin/session', { method: 'POST', body: JSON.stringify({ username, password }) })
}

export function getAdminSession() {
  return request<AdminSession>('/admin/session')
}

export function logout() {
  return request<void>('/admin/session', { method: 'DELETE' })
}

export function getAdminConfig() {
  return request<WeddingConfig>('/admin/config')
}

export function updateAdminConfig(config: Partial<WeddingConfig>) {
  return request<WeddingConfig>('/admin/config', {
    method: 'PUT',
    body: JSON.stringify(buildAdminConfigPayload(config)),
  })
}

export function getAdminGuestbook(page = 1, limit = 20) {
  return request<GuestbookPage>(`/admin/guestbook?page=${page}&limit=${limit}`)
}

export function deleteAdminGuestbookEntry(id: string) {
  return request<void>(`/admin/guestbook/${id}`, { method: 'DELETE' })
}

export function getAdminStats() {
  return request<GuestbookStats>('/admin/stats')
}

export function changeAdminPassword(currentPassword: string, newPassword: string) {
  return request<void>('/admin/password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) })
}

export async function getUserSession() {
  const session = await request<UserSession>('/auth/me')
  setCsrfToken(session.csrfToken)
  return session
}

export function startGoogleLogin(returnTo = '/account') {
  const path = `/api/auth/google/start?returnTo=${encodeURIComponent(returnTo)}`
  window.location.assign(path)
}

export async function logoutUser() {
  await request<void>('/auth/logout', { method: 'POST' })
  setCsrfToken('')
}

export function getMyInvitation() {
  return request<{ invitation: OwnerInvitation | null }>('/invitations/me')
}

export function createInvitation(input: {
  slug: string
  bride_name?: string
  groom_name?: string
  reception_at?: string
}) {
  return request<{ invitation: OwnerInvitation }>('/invitations', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function getMyConfig() {
  return request<WeddingConfig>('/my/config')
}

export function updateMyConfig(config: Partial<WeddingConfig> & { invitation_id?: number }) {
  const { id, updated_at, invitation_id, ...editableConfig } = config
  return request<WeddingConfig>('/my/config', { method: 'PATCH', body: JSON.stringify(editableConfig) })
}

export function checkoutPayment() {
  return request<{ token: string; redirect_url: string }>('/my/payment/checkout', { method: 'POST' })
}

export function getAdminInvitations() {
  return request<AdminInvitation[]>('/admin/invitations')
}

export function getAdminInvitation(id: number) {
  return request<AdminInvitation>(`/admin/invitations/${id}`)
}

export function activateInvitation(id: number) {
  return request<void>(`/admin/invitations/${id}/activate`, { method: 'POST' })
}

export function rejectInvitation(id: number, reason: string) {
  return request<void>(`/admin/invitations/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) })
}

export function getMyGuestbook() {
  return request<{ items: GuestbookEntry[]; stats: GuestbookStats }>('/my/guestbook')
}

export function uploadPaymentProof(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<{ proof_url: string; status: string }> {
  return new Promise((resolve, reject) => {
    const formData = new FormData()
    formData.append('file', file)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', '/api/my/upload/proof')
    xhr.withCredentials = true

    // CSRF token
    if (csrfToken) {
      xhr.setRequestHeader('X-CSRF-Token', csrfToken)
    }

    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100))
        }
      })
    }

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText))
        } catch {
          reject(new ApiError(xhr.status, 'PARSE_ERROR', 'Respons tidak valid dari server.'))
        }
      } else {
        let message = 'Upload gagal.'
        let code = 'UPLOAD_FAILED'
        try {
          const body = JSON.parse(xhr.responseText)
          message = body.error?.message || message
          code = body.error?.code || code
        } catch { /* empty */ }
        reject(new ApiError(xhr.status, code, message))
      }
    })

    xhr.addEventListener('error', () => {
      reject(new ApiError(0, 'NETWORK_ERROR', 'Koneksi terputus saat mengunggah file.'))
    })

    xhr.send(formData)
  })
}

function xhrUpload<T>(
  url: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const formData = new FormData()
    formData.append('file', file)
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url)
    xhr.withCredentials = true
    if (csrfToken) xhr.setRequestHeader('X-CSRF-Token', csrfToken)
    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
      })
    }
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try { resolve(JSON.parse(xhr.responseText) as T) }
        catch { reject(new ApiError(xhr.status, 'PARSE_ERROR', 'Respons tidak valid.')) }
      } else {
        let message = 'Upload gagal.', code = 'UPLOAD_FAILED'
        try { const b = JSON.parse(xhr.responseText); message = b.error?.message || message; code = b.error?.code || code } catch { /* empty */ }
        reject(new ApiError(xhr.status, code, message))
      }
    })
    xhr.addEventListener('error', () => reject(new ApiError(0, 'NETWORK_ERROR', 'Koneksi terputus.')))
    xhr.send(formData)
  })
}

export function uploadPhoto(
  file: File,
  type: 'cover' | 'gallery' = 'gallery',
  onProgress?: (pct: number) => void
): Promise<{ photo_url: string; type: string }> {
  return xhrUpload<{ photo_url: string; type: string }>(`/api/my/upload/photo?type=${type}`, file, onProgress)
}

export function uploadMusic(
  file: File,
  onProgress?: (pct: number) => void
): Promise<{ bgm_url: string; bgm_title: string }> {
  return xhrUpload<{ bgm_url: string; bgm_title: string }>('/api/my/upload/music', file, onProgress)
}

export function deletePhoto(photoUrl: string): Promise<void> {
  return request<void>('/my/upload/photo', {
    method: 'DELETE',
    body: JSON.stringify({ photo_url: photoUrl }),
  })
}

export function getMyContacts() {
  return request<{ contacts: InvitationContact[]; limit: number }>('/my/contacts')
}

export function createMyContact(name: string, phone: string) {
  return request<{ contact: InvitationContact }>('/my/contacts', {
    method: 'POST',
    body: JSON.stringify({ name, phone }),
  })
}

export function deleteMyContact(id: string) {
  return request<void>(`/my/contacts/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
