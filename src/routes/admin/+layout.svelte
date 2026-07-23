<script lang="ts">
  import { onMount } from 'svelte'

  let { children } = $props()

  onMount(() => {
    document.getElementById('startup-shell')?.remove()
  })
</script>

{@render children()}
