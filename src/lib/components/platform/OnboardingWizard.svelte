<script lang="ts">
  type Props = {
    slugInput: string
    brideInput: string
    groomInput: string
    busy: boolean
    slugPattern: string
    handleCreate: () => Promise<void>
  }
  
  let { slugInput = $bindable(), brideInput = $bindable(), groomInput = $bindable(), busy, slugPattern, handleCreate }: Props = $props()
</script>

<div class="create-invitation-container">
  <p class="label">Mulai Perjalanan kalian</p>
  <h2>Tentukan Alamat Link Undangan</h2>
  <p class="lead">Pilih subdomain unik yang singkat dan mudah diingat oleh keluarga serta para tamu.</p>

  <form
    class="create-form"
    onsubmit={(event) => {
      event.preventDefault()
      void handleCreate()
    }}
  >
    <label>
      Alamat Undangan (Subdomain)
      <div class="slug-row">
        <input
          bind:value={slugInput}
          maxlength="63"
          pattern={slugPattern}
          placeholder="nama-pasangan"
          required
          autocomplete="off"
          spellcheck="false"
        />
        <span class="slug-suffix">.marryme.web.id</span>
      </div>
    </label>
    <div class="name-row">
      <label>
        Nama Mempelai Wanita
        <input bind:value={brideInput} maxlength="255" placeholder="Kia Anindya" />
      </label>
      <label>
        Nama Mempelai Pria
        <input bind:value={groomInput} maxlength="255" placeholder="Toni Pratama" />
      </label>
    </div>
    <button type="submit" class="primary-btn-lg" disabled={busy || !slugInput.trim()}>
      🚀 Mulai Buat Undangan
    </button>
  </form>
</div>
