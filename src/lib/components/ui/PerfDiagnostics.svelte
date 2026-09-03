<script lang="ts">
  import { onMount } from 'svelte'
  import { diagnosticsEnabled } from '../../utils/renderQuality'

  let text = $state('Starting renderer...')

  onMount(() => {
    if (!diagnosticsEnabled()) return

    let last = performance.now()
    let frames = 0
    let total = 0
    let raf = 0

    const update = (now: number) => {
      const delta = now - last
      last = now
      frames += 1
      total += delta

      if (total >= 500) {
        const stats = (window as Window & { __threePerf?: { calls: number; triangles: number; textures: number; dpr: number } }).__threePerf
        text = `${Math.round(frames * 1000 / total)} FPS | ${Math.round(total / frames)} ms | DPR ${stats?.dpr?.toFixed(2) ?? '-'} | calls ${stats?.calls ?? '-'} | tris ${stats?.triangles ?? '-'} | tex ${stats?.textures ?? '-'}`
        frames = 0
        total = 0
      }

      raf = requestAnimationFrame(update)
    }

    raf = requestAnimationFrame(update)
    return () => cancelAnimationFrame(raf)
  })
</script>

{#if diagnosticsEnabled()}
  <div class="render-diagnostics" aria-live="off">{text}</div>
{/if}

<style>
  .render-diagnostics {
    position: fixed;
    z-index: 1000;
    top: 0.5rem;
    left: 0.5rem;
    padding: 0.35rem 0.5rem;
    color: #fff;
    background: rgba(0, 0, 0, 0.78);
    font: 11px/1.25 ui-monospace, SFMono-Regular, Menlo, monospace;
    pointer-events: none;
  }
</style>
