const fs = require('fs')

let code = fs.readFileSync('src/lib/components/platform/DashboardShell.svelte', 'utf8')

// Add OnboardingWizard import
code = code.replace(
  `import PaymentManager from './dashboard/PaymentManager.svelte'`,
  `import PaymentManager from './dashboard/PaymentManager.svelte'\n  import OnboardingWizard from './OnboardingWizard.svelte'`
)

// Replace Create Invitation block
code = code.replace(/<!-- Logged In Form Create Invitation \(If No Invitation Yet\) -->[\s\S]*?<\/div>/,
  `<!-- Logged In Form Create Invitation (If No Invitation Yet) -->\n        <OnboardingWizard bind:slugInput bind:brideInput bind:groomInput {busy} {slugPattern} {handleCreate} />`)

fs.writeFileSync('src/lib/components/platform/DashboardShell.svelte', code)
console.log('Patched OnboardingWizard in DashboardShell.svelte successfully!')
