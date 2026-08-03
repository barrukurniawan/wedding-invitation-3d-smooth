const fs = require('fs')

let code = fs.readFileSync('src/lib/components/platform/DashboardShell.svelte', 'utf8')

// Add imports
code = code.replace(
  `} from '$lib/api-client'`,
  `} from '$lib/api-client'\n  import BrideGroomEditor from './editor/BrideGroomEditor.svelte'\n  import EventDetailsEditor from './editor/EventDetailsEditor.svelte'\n  import EnvelopeEditor from './editor/EnvelopeEditor.svelte'\n  import LocationEditor from './editor/LocationEditor.svelte'\n  import GalleryEditor from './editor/GalleryEditor.svelte'\n  import QuoteEditor from './editor/QuoteEditor.svelte'\n  import GuestbookManager from './dashboard/GuestbookManager.svelte'\n  import PaymentManager from './dashboard/PaymentManager.svelte'`
)

// Remove state variables no longer needed in DashboardShell
code = code.replace(/let submittingPayment = \$state\(false\)\n/g, '')
code = code.replace(/let paymentMsg = \$state\(''\)\n/g, '')
code = code.replace(/let proofFileInput = \$state<HTMLInputElement \| null>\(null\)\n/g, '')
code = code.replace(/let newPhotoUrlInput = \$state\(''\)\n/g, '')

// Remove handlePaymentSubmit function
code = code.replace(/async function handlePaymentSubmit\([\s\S]*?finally \{\n      submittingPayment = false\n    \}\n  \}\n\n/, '')

// Remove addGalleryPhoto and removeGalleryPhoto functions
code = code.replace(/function addGalleryPhoto\(\) \{[\s\S]*?\}\n\n  function removeGalleryPhoto\(index: number\) \{[\s\S]*?\}\n\n/g, '')

// Replace Mempelai section
code = code.replace(/\{#if editSubTab === 'mempelai'\}[\s\S]*?\{:else if editSubTab === 'acara'\}/, 
  `{#if editSubTab === 'mempelai'}\n                  <BrideGroomEditor bind:config={myConfig} />\n                {:else if editSubTab === 'acara'}`)

// Replace Acara section
code = code.replace(/\{:else if editSubTab === 'acara'\}[\s\S]*?\{:else if editSubTab === 'amplop'\}/,
  `{:else if editSubTab === 'acara'}\n                  <EventDetailsEditor bind:config={myConfig} />\n                {:else if editSubTab === 'amplop'}`)

// Replace Amplop section
code = code.replace(/\{:else if editSubTab === 'amplop'\}[\s\S]*?\{:else if editSubTab === 'lokasi'\}/,
  `{:else if editSubTab === 'amplop'}\n                  <EnvelopeEditor bind:config={myConfig} />\n                {:else if editSubTab === 'lokasi'}`)

// Replace Lokasi section
code = code.replace(/\{:else if editSubTab === 'lokasi'\}[\s\S]*?\{:else if editSubTab === 'galeri'\}/,
  `{:else if editSubTab === 'lokasi'}\n                  <LocationEditor bind:config={myConfig} />\n                {:else if editSubTab === 'galeri'}`)

// Replace Galeri section
code = code.replace(/\{:else if editSubTab === 'galeri'\}[\s\S]*?\{:else if editSubTab === 'quote'\}/,
  `{:else if editSubTab === 'galeri'}\n                  <GalleryEditor bind:config={myConfig} />\n                {:else if editSubTab === 'quote'}`)

// Replace Quote section
code = code.replace(/\{:else if editSubTab === 'quote'\}[\s\S]*?\{\/if\}\n\n                <!-- Save Action Footer Bar -->/,
  `{:else if editSubTab === 'quote'}\n                  <QuoteEditor bind:config={myConfig} />\n                {/if}\n\n                <!-- Save Action Footer Bar -->`)

// Replace GuestbookManager
code = code.replace(/<!-- Tab 2: Tamu & Buku Tamu -->\n        \{:else if activeTab === 'tamu'\}[\s\S]*?<!-- Tab 3: Pembayaran & Paket -->/,
  `<!-- Tab 2: Tamu & Buku Tamu -->\n        {:else if activeTab === 'tamu'}\n          <GuestbookManager {myGuestbook} {loadingGuestbook} {loadGuestbook} {fmtDate} />\n\n        <!-- Tab 3: Pembayaran & Paket -->`)

// Replace PaymentManager
code = code.replace(/<!-- Tab 3: Pembayaran & Paket -->\n        \{:else if activeTab === 'pembayaran'\}[\s\S]*?<!-- Tab 4: Preview -->/,
  `<!-- Tab 3: Pembayaran & Paket -->\n        {:else if activeTab === 'pembayaran'}\n          <PaymentManager \n            {invitation} \n            {myConfig} \n            {fmtDate} \n            onPaymentSuccess={(inv) => { invitation = inv }}\n          />\n\n        <!-- Tab 4: Preview -->`)


fs.writeFileSync('src/lib/components/platform/DashboardShell.svelte', code)
console.log('Patched DashboardShell.svelte successfully!')
