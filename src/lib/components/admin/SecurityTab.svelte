<script lang="ts">
  import { ApiError, changeAdminPassword } from '$lib/api-client'
  import { inputClass, labelClass } from './styles'

  let currentPassword = $state('')
  let newPassword = $state('')
  let passwordMsg = $state('')
  let changingPassword = $state(false)

  async function changePassword() {
    passwordMsg = ''
    changingPassword = true
    try {
      await changeAdminPassword(currentPassword, newPassword)
      currentPassword = ''
      newPassword = ''
      passwordMsg = 'Password berhasil diubah.'
    } catch (error) {
      passwordMsg = error instanceof ApiError ? error.message : 'Password gagal diubah.'
    } finally {
      changingPassword = false
    }
  }
</script>

<h2 class="text-lg font-semibold text-rose-300">Ganti Password Admin</h2>
<form class="mt-4 max-w-sm space-y-3" onsubmit={(event) => { event.preventDefault(); changePassword() }}>
  <div><label for="current-password" class={labelClass}>Password Saat Ini</label><input id="current-password" bind:value={currentPassword} autocomplete="current-password" type="password" required class={inputClass} /></div>
  <div><label for="new-password" class={labelClass}>Password Baru</label><input id="new-password" bind:value={newPassword} autocomplete="new-password" type="password" minlength="12" required class={inputClass} /></div>
  <button class="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-60" disabled={changingPassword}>{changingPassword ? 'Mengubah...' : 'Ubah Password'}</button>
  {#if passwordMsg}<p class="text-xs {passwordMsg.includes('berhasil') ? 'text-green-400' : 'text-red-400'}">{passwordMsg}</p>{/if}
</form>
