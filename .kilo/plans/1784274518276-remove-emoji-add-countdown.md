# Plan: Remove Emojis & Add Countdown to WeddingStageModal

## File to edit
`src/lib/components/ui/WeddingStageModal.svelte`

## Changes

### 1. Remove emojis from event info cards (lines 82, 93, 104)
- Remove `<span class="text-lg">💍</span>` (Akad Nikah card, line 82)
- Remove `<span class="text-lg">🎉</span>` (Resepsi card, line 93)
- Remove `<span class="text-lg">👨‍👩‍👧</span>` (Mempelai card, line 104)
- Also remove the share button emoji `📤` (line 139) — replace with text "Share" or an SVG icon

### 2. Replace welcome text with countdown (line 46)
- Current: `Selamat datang di pelaminan {$weddingConfig.bride_name} & {$weddingConfig.groom_name}`
- New: A live countdown to `$weddingConfig.wedding_date` (ISO string `2026-07-15T08:00:00+07:00`)
- Display format: `X hari Y jam Z menit menuju hari pernikahan kami`
- Use `$state` + `setInterval` in `<script>` to update countdown every minute (or second for better UX)
- Parse `wedding_date` from the store; compute delta = wedding_date - now
- If delta <= 0, show "Hari ini hari pernikahan kami!" or similar

### 3. Countdown implementation detail
```ts
let countdown = $state('')

$effect(() => {
  const target = new Date($weddingConfig.wedding_date).getTime()
  function update() {
    const diff = target - Date.now()
    if (diff <= 0) {
      countdown = 'Hari ini adalah hari pernikahan kami!'
      return
    }
    const days = Math.floor(diff / 86400000)
    const hours = Math.floor((diff % 86400000) / 3600000)
    const minutes = Math.floor((diff % 3600000) / 60000)
    const seconds = Math.floor((diff % 60000) / 1000)
    countdown = `${days} hari ${hours} jam ${minutes} menit ${seconds} detik`
  }
  update()
  const interval = setInterval(update, 1000)
  return () => clearInterval(interval)
})
```

Display: `<h3 class="...">{countdown} menuju hari pernikahan kami</h3>`

## Validation
- `npm run check` (svelte-check) should pass
- Visual: no emojis in the modal event info or share button
- Countdown updates live showing days/hours/minutes/seconds
