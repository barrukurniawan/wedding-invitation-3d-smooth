<script lang="ts">
  import { browser } from '$app/environment'
  import { weddingConfig } from '../../stores/weddingConfig.svelte'

  let diff = $state({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  let expired = $state(false)

  $effect(() => {
    if (!browser) return
    const update = () => {
      const now = new Date()
      const weddingDate = new Date($weddingConfig.wedding_date)
      const ms = weddingDate.getTime() - now.getTime()
      if (ms <= 0) {
        expired = true
        return
      }
      diff = {
        days: Math.floor(ms / 86400000),
        hours: Math.floor((ms % 86400000) / 3600000),
        minutes: Math.floor((ms % 3600000) / 60000),
        seconds: Math.floor((ms % 60000) / 1000),
      }
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  })
</script>

{#if !expired}
  <div class="absolute top-4 left-1/2 z-30 -translate-x-1/2">
    <div class="flex items-center gap-3 rounded-full border border-rose-500/30 bg-stone-950/80 px-5 py-2 backdrop-blur-md">
      <span class="text-xs font-medium text-rose-300">Menuju Hari H</span>
      <div class="flex gap-2 text-center">
        <div>
          <p class="text-lg font-bold text-white">{diff.days}</p>
          <p class="text-[10px] text-stone-500">hari</p>
        </div>
        <span class="text-stone-600 self-start mt-1">:</span>
        <div>
          <p class="text-lg font-bold text-white">{String(diff.hours).padStart(2, '0')}</p>
          <p class="text-[10px] text-stone-500">jam</p>
        </div>
        <span class="text-stone-600 self-start mt-1">:</span>
        <div>
          <p class="text-lg font-bold text-white">{String(diff.minutes).padStart(2, '0')}</p>
          <p class="text-[10px] text-stone-500">menit</p>
        </div>
        <span class="text-stone-600 self-start mt-1">:</span>
        <div>
          <p class="text-lg font-bold text-rose-400">{String(diff.seconds).padStart(2, '0')}</p>
          <p class="text-[10px] text-stone-500">detik</p>
        </div>
      </div>
    </div>
  </div>
{/if}
