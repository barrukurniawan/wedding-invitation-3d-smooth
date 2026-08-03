<script lang="ts">
  import type { WeddingConfig } from '$lib/api-client'

  let { config = $bindable() }: { config: WeddingConfig } = $props()
</script>

<div class="form-section">
  <h3>Pesan Kutipan / Quote</h3>
  <p class="section-desc">Pesan khusus, doa, atau kutipan indah untuk para tamu yang berkunjung.</p>

  <label>
    Pesan Kutipan Pernikahan
    <textarea bind:value={config.quote} rows="4" placeholder="Dan di antara tanda-tanda (kebesaran-Nya) ialah Dia menciptakan pasangan-pasangan untukmu..."></textarea>
  </label>
</div>
