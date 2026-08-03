const fs = require('fs')

let guestbook = fs.readFileSync('src/lib/components/platform/dashboard/GuestbookManager.svelte', 'utf8')

// Add OwnerInvitation import and to Props
guestbook = guestbook.replace(
  `import type { GuestbookEntry, GuestbookStats } from '$lib/api-client'`,
  `import type { GuestbookEntry, GuestbookStats, OwnerInvitation } from '$lib/api-client'`
)

guestbook = guestbook.replace(
  `type Props = {`,
  `type Props = {\n    invitation: OwnerInvitation`
)

guestbook = guestbook.replace(
  `let { myGuestbook, loadingGuestbook, loadGuestbook, fmtDate }: Props = $props()`,
  `let { invitation, myGuestbook, loadingGuestbook, loadGuestbook, fmtDate }: Props = $props()\n\n  let guestNameInput = $state('')\n  let generatedUrl = $state('')\n  let copiedUrl = $state(false)\n\n  function generateGuestLink() {\n    if (!guestNameInput.trim()) return\n    const base = invitation.public_url\n    generatedUrl = \`\${base}?to=\${encodeURIComponent(guestNameInput.trim())}\`\n  }\n\n  function copyGuestLink() {\n    if (!generatedUrl) return\n    void navigator.clipboard.writeText(generatedUrl)\n    copiedUrl = true\n    setTimeout(() => (copiedUrl = false), 2000)\n  }`
)

const featureHtml = `
  <!-- Generator Link Tamu -->
  <div class="guest-link-generator mt-16 mb-24">
    <h4>Generator Link Undangan Khusus Tamu</h4>
    <p class="section-desc">Ketik nama tamu untuk membuat link undangan khusus yang menyebut nama mereka secara langsung.</p>
    <div class="generate-row" style="display: flex; gap: 8px; margin-bottom: 12px; max-width: 600px;">
      <input bind:value={guestNameInput} placeholder="Contoh: Budi Santoso" style="flex: 1;" />
      <button type="button" class="primary-btn-sm" onclick={generateGuestLink} disabled={!guestNameInput.trim()}>
        Buat Link
      </button>
    </div>
    {#if generatedUrl}
      <div class="generated-url-box" style="padding: 12px; background: rgba(0,0,0,0.02); border: 1px dashed var(--accent-deep); border-radius: 6px; display: flex; align-items: center; justify-content: space-between;">
        <code style="font-size: 0.85rem; color: var(--text-dark); word-break: break-all;">{generatedUrl}</code>
        <button type="button" class="ghost-btn-sm" onclick={copyGuestLink} style="white-space: nowrap; margin-left: 12px;">
          {copiedUrl ? '✓ Tersalin' : '📋 Salin'}
        </button>
      </div>
    {/if}
  </div>

`

guestbook = guestbook.replace(
  `{#if loadingGuestbook}`,
  featureHtml + `{#if loadingGuestbook}`
)

fs.writeFileSync('src/lib/components/platform/dashboard/GuestbookManager.svelte', guestbook)


let shell = fs.readFileSync('src/lib/components/platform/DashboardShell.svelte', 'utf8')
shell = shell.replace(
  `<GuestbookManager {myGuestbook} {loadingGuestbook} {loadGuestbook} {fmtDate} />`,
  `<GuestbookManager {invitation} {myGuestbook} {loadingGuestbook} {loadGuestbook} {fmtDate} />`
)
fs.writeFileSync('src/lib/components/platform/DashboardShell.svelte', shell)

console.log('Patched GuestbookManager.svelte and DashboardShell.svelte successfully!')
