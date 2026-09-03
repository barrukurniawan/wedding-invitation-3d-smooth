<script lang="ts">
  import { useTask, useThrelte } from '@threlte/core'
  import { diagnosticsEnabled } from '../../utils/renderQuality'

  const { renderer } = useThrelte()
  const enabled = diagnosticsEnabled()
  let elapsed = 0
  let frames = 0
  let frameTotal = 0

  useTask((delta: number) => {
    if (!enabled) return
    frames += 1
    frameTotal += delta * 1000
    elapsed += delta
    if (elapsed < 0.5) return

    const r = renderer
    const info = r?.info
    const pixelRatio = r?.getPixelRatio?.() ?? 0
    ;(window as Window & { __threePerf?: object }).__threePerf = {
      dpr: pixelRatio,
      calls: info?.render.calls ?? 0,
      triangles: info?.render.triangles ?? 0,
      textures: info?.memory.textures ?? 0
    }
    elapsed = 0
    frames = 0
    frameTotal = 0
  })
</script>
