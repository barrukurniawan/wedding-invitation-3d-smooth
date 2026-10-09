<script lang="ts">
  // Pembungkus venue: inti (sama di semua venue) + sekeliling venue terpilih.
  import { onMount, type Component } from 'svelte'
  import VenueCore from './venue/VenueCore.svelte'
  import VenueOccluders from './venue/VenueOccluders.svelte'
  import type { CoreLayout, CorePalette, SurroundingsProps } from '../../venues'

  let {
    lowPower = false,
    renderQuality = 'desktop',
    Surroundings,
    palette,
    layout,
    onReady
  }: SurroundingsProps & {
    Surroundings: Component<SurroundingsProps>
    palette?: CorePalette
    layout?: CoreLayout
    onReady?: () => void
  } = $props()

  let readySent = false

  // Critical path is procedural geometry only — fire after first paint frames.
  onMount(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (readySent) return
        readySent = true
        onReady?.()
      })
    })
  })
</script>

<Surroundings {lowPower} {renderQuality} />
<VenueCore {palette} {layout} />
<VenueOccluders />
