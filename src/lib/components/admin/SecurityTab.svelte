<script lang="ts">
  import { ApiError, changeAdminPassword } from '$lib/api-client'
  import Icon from './ui/Icon.svelte'

  let currentPassword = $state('')
  let newPassword = $state('')
  let passwordMsg = $state('')
  let ok = $state(false)
  let changingPassword = $state(false)

  async function changePassword() {
    passwordMsg = ''
    changingPassword = true
    try {
      await changeAdminPassword(currentPassword, newPassword)
      currentPassword = ''
      newPassword = ''
      ok = true
      passwordMsg = 'Password berhasil diubah.'
    } catch (error) {
      ok = false
      passwordMsg = error instanceof ApiError ? error.message : 'Password gagal diubah.'
    } finally {
      changingPassword = false
    }
  }
</script>

<div class="layout">
  <div>
    <span class="adm-kpi-icon static"><Icon name="lock" size={16} /></span>
    <h2 class="adm-card-title" style="margin-top: 12px">Ganti password admin</h2>
    <p class="adm-card-sub">Gunakan minimal 12 karakter. Sesi lain tetap aktif sampai keluar atau kedaluwarsa.</p>
  </div>
  <form class="fields" onsubmit={(event) => { event.preventDefault(); changePassword() }}>
    <div class="adm-field"><label class="adm-label" for="current-password">Password saat ini</label><input id="current-password" bind:value={currentPassword} autocomplete="current-password" type="password" required class="adm-input" /></div>
    <div class="adm-field">
      <label class="adm-label" for="new-password">Password baru</label>
      <input id="new-password" bind:value={newPassword} autocomplete="new-password" type="password" minlength="12" required class="adm-input" />
      <span class="adm-hint">{newPassword.length}/12 karakter minimal</span>
    </div>
    <div class="actions">
      <button class="adm-btn" disabled={changingPassword}>{changingPassword ? 'Mengubah...' : 'Ubah password'}</button>
      {#if passwordMsg}<span class={ok ? 'ok' : 'adm-error'}>{passwordMsg}</span>{/if}
    </div>
  </form>
</div>

<style>
  .layout {
    display: grid;
    grid-template-columns: minmax(0, 0.8fr) minmax(0, 1fr);
    gap: 28px;
  }
  .adm-kpi-icon.static {
    position: static;
  }
  .fields {
    display: flex;
    flex-direction: column;
    gap: 14px;
    max-width: 420px;
  }
  .actions {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }
  .ok {
    color: var(--adm-green);
    font-size: 12.5px;
  }
  @media (max-width: 760px) {
    .layout {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
