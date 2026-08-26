<script lang="ts">
  let {
    label,
    value,
    sub = '',
    tone = 'rose',
  }: { label: string; value: string | number; sub?: string; tone?: 'rose' | 'green' | 'yellow' | 'blue' } = $props()

  const tones: Record<string, string> = {
    rose: 'border-rose-800/50 bg-rose-950/30 text-rose-300',
    green: 'border-green-800/50 bg-green-900/20 text-green-300',
    yellow: 'border-yellow-800/50 bg-yellow-900/20 text-yellow-300',
    blue: 'border-sky-800/50 bg-sky-900/20 text-sky-300',
  }
</script>

<div class="rounded-xl border border-stone-800 bg-stone-900 p-4">
  <p class="text-xs font-semibold uppercase tracking-wider text-stone-400">{label}</p>
  <p class="mt-1.5 text-2xl font-bold {tones[tone].split(' ').pop()}">{value}</p>
  {#if sub}<p class="mt-0.5 text-[11px] text-stone-500">{sub}</p>{/if}
</div>
