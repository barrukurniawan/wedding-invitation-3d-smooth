<script lang="ts">
  // Bar horizontal sumber trafik (Instagram, Facebook, WhatsApp, ...), dengan persentase.
  import type { TrafficSourceCount } from '$lib/api-client'
  import { fmtNumber } from '../format'

  let { sources }: { sources: TrafficSourceCount[] } = $props()

  const COLORS: Record<string, string> = {
    Instagram: '#c13584',
    Facebook: '#1877f2',
    WhatsApp: '#25a35a',
    Threads: '#181314',
    TikTok: '#ff2c55',
    Google: '#ea8a00',
    X: '#4b5563',
    Langsung: 'var(--adm-accent)',
    Internal: '#a8a29e',
    Lainnya: '#d6d3d1',
  }

  const total = $derived(sources.reduce((sum, s) => sum + s.views, 0) || 1)
  const max = $derived(Math.max(1, ...sources.map((s) => s.views)))
</script>

<ul class="sources">
  {#each sources as s (s.source)}
    <li>
      <span class="name">{s.source === 'Internal' ? 'Antar halaman MarryMe' : s.source === 'Langsung' ? 'Langsung / tanpa referrer' : s.source}</span>
      <span class="track"><span style="width: {(s.views / max) * 100}%; background: {COLORS[s.source] ?? '#d6d3d1'}"></span></span>
      <span class="val">{fmtNumber(s.views)} <small>{Math.round((s.views / total) * 100)}%</small></span>
    </li>
  {/each}
</ul>

<style>
  .sources {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  li {
    display: grid;
    grid-template-columns: minmax(110px, 0.9fr) minmax(0, 1.6fr) auto;
    align-items: center;
    gap: 12px;
    font-size: 13px;
  }
  .name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .track {
    height: 8px;
    border-radius: 999px;
    background: var(--adm-soft);
    overflow: hidden;
  }
  .track span {
    display: block;
    height: 100%;
    border-radius: 999px;
  }
  .val {
    font-weight: 600;
    text-align: right;
    white-space: nowrap;
  }
  .val small {
    font-weight: 500;
    color: var(--adm-muted);
    margin-left: 4px;
  }
</style>
