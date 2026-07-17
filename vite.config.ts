import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [sveltekit()],
  ssr: {
    noExternal: ['three', '@threlte/core', '@threlte/extras']
  },
  optimizeDeps: {
    include: ['three']
  },
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:3001'
    }
  }
})
