import adapter from '@sveltejs/adapter-static'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

export default {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      fallback: 'index.html'
    }),
    // Didaftarkan manual di app.html sebagai /service-worker.js?v=… supaya tidak memakai
    // salinan lama yang masih ter-cache di Cloudflare (lihat AGENTS.md).
    serviceWorker: {
      register: false
    }
  }
}
