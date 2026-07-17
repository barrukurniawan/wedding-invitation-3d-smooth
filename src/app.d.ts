/// <reference types="svelte" />
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_COLOR_TREE?: string
  readonly VITE_COLOR_BUSH?: string
  readonly VITE_COLOR_GRASS?: string
  readonly VITE_COLOR_ANIMAL?: string
  readonly VITE_COLOR_GROUND?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
