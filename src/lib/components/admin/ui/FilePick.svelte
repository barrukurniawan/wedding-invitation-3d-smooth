<script lang="ts">
  // Tombol pilih file bergaya pill (input file asli disembunyikan tapi tetap aksesibel).
  import Icon from './Icon.svelte'

  let {
    label,
    accept,
    onChange,
    hint = '',
  }: { label: string; accept: string; onChange: (e: Event) => void; hint?: string } = $props()
</script>

<div class="pick">
  <label class="adm-btn ghost sm adm-file">
    <Icon name="upload" size={14} />
    {label}
    <input type="file" {accept} onchange={onChange} />
  </label>
  {#if hint}<span class="adm-hint">{hint}</span>{/if}
</div>

<style>
  .pick {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }
  .adm-file {
    position: relative;
  }
</style>
