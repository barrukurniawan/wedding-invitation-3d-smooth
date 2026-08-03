<script lang="ts">
  import type { WeddingConfig } from '$lib/api-client'

  let { config = $bindable() }: { config: WeddingConfig } = $props()
</script>

<div class="form-section">
  <h3>Identitas Pasangan Mempelai</h3>
  <p class="section-desc">Isikan nama lengkap dan nama orang tua mempelai pria &amp; wanita.</p>

  <div class="grid-2">
    <label>
      Nama Mempelai Wanita
      <input bind:value={config.bride_name} placeholder="Misal: Kia Anindya" required />
    </label>
    <label>
      Nama Mempelai Pria
      <input bind:value={config.groom_name} placeholder="Misal: Toni Pratama" required />
    </label>
    <label>
      Orang Tua Mempelai Wanita
      <input bind:value={config.bride_parents} placeholder="Bpk. Putra & Ibu. Putri" />
    </label>
    <label>
      Orang Tua Mempelai Pria
      <input bind:value={config.groom_parents} placeholder="Bpk. Fulan & Ibu. Fulanah" />
    </label>
  </div>
</div>
