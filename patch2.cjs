const fs = require('fs');
let code = fs.readFileSync('src/lib/components/platform/DashboardShell.svelte', 'utf8');
code = code.replace(/<style>[\s\S]*?<\/style>/, '');
code = code.replace(/import \{ onMount \} from 'svelte'/, "import { onMount } from 'svelte'\n  import './dashboard.css'");
fs.writeFileSync('src/lib/components/platform/DashboardShell.svelte', code);
console.log('Updated DashboardShell.svelte');
