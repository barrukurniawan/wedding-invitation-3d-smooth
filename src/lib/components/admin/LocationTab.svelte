<script lang="ts">
  import type { WeddingConfig } from '$lib/api-client'
  import { inputClass, labelClass } from './styles'

  let { config }: { config: WeddingConfig } = $props()
</script>

<h2 class="text-lg font-semibold text-rose-300">Lokasi Venue</h2>
<div class="mt-4 space-y-4">
  <div><label for="venue-address" class={labelClass}>Alamat Venue</label><input id="venue-address" bind:value={config.venue_address} class={inputClass} /></div>
  <div><label for="maps-url" class={labelClass}>Google Maps URL</label><input id="maps-url" bind:value={config.maps_url} class={inputClass} placeholder="https://maps.app.goo.gl/..." /></div>
</div>
