# Implementation Plan: Admin Dashboard + Supabase Database

## Database: Supabase (PostgreSQL)

### Kenapa Supabase?
- PostgreSQL = database proper dengan schema, constraints, RLS
- Built-in admin panel di Supabase Studio
- Real-time updates (ucapan langsung muncul tanpa refresh)
- Free tier: 500MB storage, 50k MAU
- TypeScript support lebih baik dari Firebase
- Bisa di-deploy sebagai static site (client-side only)

---

## Database Schema

### Table: `wedding_config` (single row, id=1)

```sql
CREATE TABLE wedding_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  -- Pengantin
  bride_name TEXT NOT NULL DEFAULT 'Kia Anindya',
  groom_name TEXT NOT NULL DEFAULT 'Toni Pratama',
  bride_parents TEXT NOT NULL DEFAULT 'Bpk. ... & Ibu. ...',
  groom_parents TEXT NOT NULL DEFAULT 'Bpk. ... & Ibu. ...',
  bride_photo TEXT NOT NULL DEFAULT '',
  groom_photo TEXT NOT NULL DEFAULT '',
  -- Tanggal pernikahan (untuk countdown)
  wedding_date TIMESTAMPTZ NOT NULL DEFAULT '2026-07-15T08:00:00+07:00',
  -- Akad Nikah
  akad_date TEXT NOT NULL DEFAULT 'Rabu, 15 Juli 2026',
  akad_time TEXT NOT NULL DEFAULT '08:00 — 10:00 WIB',
  akad_location TEXT NOT NULL DEFAULT 'Kediaman Mempelai Wanita',
  -- Resepsi
  resepsi_date TEXT NOT NULL DEFAULT 'Rabu, 15 Juli 2026',
  resepsi_time TEXT NOT NULL DEFAULT '11:00 — 14:00 WIB',
  resepsi_location TEXT NOT NULL DEFAULT 'Gedung Serbaguna',
  -- Pembayaran
  qris_image TEXT NOT NULL DEFAULT '',
  bank_name TEXT NOT NULL DEFAULT 'BCA',
  bank_account TEXT NOT NULL DEFAULT '1234567890',
  bank_holder TEXT NOT NULL DEFAULT 'Toni Pratama',
  -- Lokasi
  maps_url TEXT NOT NULL DEFAULT '',
  venue_address TEXT NOT NULL DEFAULT '',
  -- Galeri (JSON array of URLs)
  gallery_photos JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Opsional
  quote TEXT DEFAULT '',
  -- Meta
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO wedding_config (id) VALUES (1) ON CONFLICT DO NOTHING;
```

### Table: `guestbook`

```sql
CREATE TABLE guestbook (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  attendance TEXT NOT NULL CHECK (attendance IN ('Hadir', 'Ragu-ragu', 'Tidak Hadir')),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_guestbook_created_at ON guestbook (created_at DESC);
```

### RLS Policies

```sql
-- wedding_config: public read, no public write
ALTER TABLE wedding_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_config" ON wedding_config FOR SELECT USING (true);
-- Write hanya via service_role (dashboard pakai anon key + secret)

-- guestbook: public read + insert, no public delete
ALTER TABLE guestbook ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read_guestbook" ON guestbook FOR SELECT USING (true);
CREATE POLICY "public_insert_guestbook" ON guestbook FOR INSERT WITH CHECK (true);
```

---

## Architecture

```
src/lib/
├── supabase.ts                    # Supabase client
├── services/
│   ├── api.ts                     # Guestbook CRUD (Supabase)
│   └── config.ts                  # Wedding config CRUD (Supabase)
├── stores/
│   ├── gameState.svelte.ts        # (existing)
│   ├── weddingConfig.svelte.ts    # NEW: reactive config store
│   └── ...
└── components/
    └── ui/
        ├── WeddingStageModal.svelte  # Reads from config store
        ├── GuestbookModal.svelte     # Reads from Supabase
        ├── CountdownTimer.svelte    # Reads date from config store
        └── ...

src/routes/admin/
├── +layout.ts                     # ssr=false
├── +layout.svelte                  # Layout wrapper
└── +page.svelte                    # Dashboard: config editor + guestbook manager
```

---

## Implementation Steps

### Step 1: Install & Configure Supabase
- `npm install @supabase/supabase-js`
- Create `src/lib/supabase.ts` with client
- Create SQL migration file

### Step 2: Config Service + Store
- Create `src/lib/services/config.ts`:
  - `getConfig()` — fetch wedding_config
  - `updateConfig(data)` — update wedding_config
- Create `src/lib/stores/weddingConfig.svelte.ts`:
  - Reactive store that loads config on app start
  - Components subscribe to this store

### Step 3: Update Components to Use Config Store
- `WeddingStageModal.svelte` — names, photos, QRIS, bank, detail acara
- `CountdownTimer.svelte` — wedding date
- `NpcDialog.svelte` → `triggers.ts` — maps URL, venue address
- `LoadingScreen.svelte` — names
- `GuestbookModal.svelte` — use Supabase directly

### Step 4: Admin Dashboard (`/admin`)
- Login screen (password from config, simple)
- Tab 1: **Pengantin** — names, parents, photos
- Tab 2: **Acara** — akad + resepsi details, wedding date
- Tab 3: **Pembayaran** — QRIS image, bank details
- Tab 4: **Lokasi** — maps URL, venue address
- Tab 5: **Galeri** — add/remove photo URLs
- Tab 6: **Ucapan** — list, search, delete guestbook entries
- Tab 7: **Statistik** — counts, charts

### Step 5: Guestbook Service (Supabase)
- `submitGuestbook()` — insert to Supabase
- `getGuestbookEntries()` — fetch from Supabase (real-time)
- `deleteGuestbookEntry(id)` — delete (admin only)
- Real-time subscription for live updates

---

## File Changes Summary

| File | Action | Detail |
|---|---|---|
| `src/lib/supabase.ts` | NEW | Supabase client |
| `src/lib/services/config.ts` | NEW | Config CRUD |
| `src/lib/stores/weddingConfig.svelte.ts` | NEW | Reactive config store |
| `src/lib/services/api.ts` | REWRITE | Guestbook CRUD via Supabase |
| `src/routes/admin/+page.svelte` | REWRITE | Full dashboard |
| `src/routes/admin/+layout.svelte` | UPDATE | Admin layout |
| `src/lib/components/ui/WeddingStageModal.svelte` | UPDATE | Read from config store |
| `src/lib/components/ui/CountdownTimer.svelte` | UPDATE | Read date from config store |
| `src/lib/components/ui/GuestbookModal.svelte` | UPDATE | Use Supabase |
| `src/lib/constants/triggers.ts` | UPDATE | Read maps from config |
| `supabase_schema.sql` | NEW | Database migration |

---

## Setup Instructions (for user)

1. Buat project di [supabase.com](https://supabase.com)
2. Buka SQL Editor → paste `supabase_schema.sql` → Run
3. Copy `Project URL` dan `anon key` dari Settings → API
4. Paste ke `src/lib/supabase.ts`
5. Buka `/admin` → password default: `admin123` (ganti di dashboard)
