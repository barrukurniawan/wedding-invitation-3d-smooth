<script lang="ts">
  // Grafik batang ringan (HTML/CSS, tanpa library): berdampingan atau bertumpuk,
  // sumbu-Y dengan angka bulat, dan tooltip saat kursor/jari di atas kolom.
  import { fmtNumber } from '../format'

  type Series = { name: string; color: string; striped?: boolean }
  type Point = { label: string; title?: string; values: number[] }

  let {
    points,
    series,
    stacked = false,
    height = 220,
  }: { points: Point[]; series: Series[]; stacked?: boolean; height?: number } = $props()

  let hovered = $state<number | null>(null)

  // Batas atas = 4 x langkah "bulat" (1, 2, 2.5, 5 x 10^n) yang cukup menampung puncak.
  function niceMax(value: number) {
    if (value <= 4) return 4
    const raw = value / 4
    const magnitude = 10 ** Math.floor(Math.log10(raw))
    const step = [1, 2, 2.5, 5, 10].find((m) => m * magnitude >= raw) ?? 10
    return Math.ceil(step * magnitude) * 4
  }

  const peak = $derived(
    Math.max(0, ...points.map((p) => (stacked ? p.values.reduce((a, b) => a + b, 0) : Math.max(0, ...p.values)))),
  )
  const max = $derived(niceMax(peak))
  const ticks = $derived([4, 3, 2, 1, 0].map((i) => (max / 4) * i))
  // Label tanggal dijarangkan supaya tidak bertumpuk pada rentang 30/90 hari.
  const labelEvery = $derived(Math.max(1, Math.ceil(points.length / 10)))

  function barStyle(s: Series, value: number) {
    const pct = (value / max) * 100
    const fill = s.striped
      ? `repeating-linear-gradient(135deg, ${s.color} 0 6px, color-mix(in srgb, ${s.color} 70%, white) 6px 9px)`
      : s.color
    return `height:${pct}%;background:${fill}`
  }
</script>

<div class="chart" style="--h:{height}px">
  <div class="chart-y">
    {#each ticks as tick (tick)}
      <span>{tick >= 1000 ? `${Math.round(tick / 100) / 10}rb` : fmtNumber(Math.round(tick))}</span>
    {/each}
  </div>
  <div class="chart-plot" role="img" aria-label="Grafik batang">
    <div class="chart-grid">
      {#each ticks as tick (tick)}<span></span>{/each}
    </div>
    <div class="chart-cols">
      {#each points as point, i (point.label + i)}
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          class="chart-col"
          class:dim={hovered !== null && hovered !== i}
          onmouseenter={() => (hovered = i)}
          onmouseleave={() => (hovered = null)}
          ontouchstart={() => (hovered = i)}
        >
          <div class="chart-bars" class:stacked>
            {#each series as s, k (s.name)}
              {#if point.values[k] > 0 || !stacked}
                <span class="chart-bar" style={barStyle(s, point.values[k] ?? 0)}></span>
              {/if}
            {/each}
          </div>
          <span class="chart-x" class:hide={i % labelEvery !== 0 && i !== points.length - 1}>{point.label}</span>
          {#if hovered === i}
            <div class="chart-tip" class:left={i > points.length / 2}>
              <strong>{point.title ?? point.label}</strong>
              {#each series as s, k (s.name)}
                <span><i style="background:{s.color}"></i>{s.name}: <b>{fmtNumber(point.values[k] ?? 0)}</b></span>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .chart {
    display: flex;
    gap: 10px;
    height: calc(var(--h) + 24px);
  }
  .chart-y {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: var(--h);
    font-size: 11px;
    color: var(--adm-muted);
    text-align: right;
    min-width: 26px;
    transform: translateY(-6px);
  }
  .chart-plot {
    position: relative;
    flex: 1;
    min-width: 0;
  }
  .chart-grid {
    position: absolute;
    inset: 0 0 auto 0;
    height: var(--h);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    pointer-events: none;
  }
  .chart-grid span {
    border-top: 1px dashed var(--adm-line);
  }
  .chart-grid span:last-child {
    border-top-style: solid;
  }
  .chart-cols {
    position: relative;
    display: flex;
    height: 100%;
    gap: 2px;
  }
  .chart-col {
    position: relative;
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    transition: opacity 0.15s;
  }
  .chart-col.dim {
    opacity: 0.45;
  }
  .chart-bars {
    height: var(--h);
    width: 100%;
    max-width: 44px;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    gap: 3px;
  }
  .chart-bars.stacked {
    flex-direction: column-reverse;
    align-items: stretch;
    justify-content: flex-start;
    gap: 2px;
    max-width: 30px;
  }
  .chart-bar {
    flex: 1;
    max-width: 18px;
    min-height: 0;
    border-radius: 6px 6px 3px 3px;
  }
  .chart-bars.stacked .chart-bar {
    flex: none;
    max-width: none;
    border-radius: 6px;
  }
  .chart-x {
    margin-top: 6px;
    font-size: 11px;
    color: var(--adm-muted);
    white-space: nowrap;
  }
  .chart-x.hide {
    visibility: hidden;
  }
  .chart-tip {
    position: absolute;
    left: 50%;
    z-index: 5;
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 150px;
    padding: 10px 12px;
    border-radius: 12px;
    background: var(--adm-ink);
    color: #fff;
    font-size: 12px;
    pointer-events: none;
    top: 0;
  }
  .chart-tip.left {
    left: auto;
    right: 50%;
  }
  .chart-tip span {
    display: flex;
    align-items: center;
    gap: 6px;
    color: rgba(255, 255, 255, 0.85);
  }
  .chart-tip i {
    width: 8px;
    height: 8px;
    border-radius: 2px;
  }
</style>
