export type RenderQuality = 'mobile' | 'desktop' | 'desktop-retina'

export function resolveRenderQuality(): RenderQuality {
  if (typeof window === 'undefined') return 'desktop'

  const mobile = window.matchMedia('(max-width: 768px), (pointer: coarse)').matches
  if (mobile) return 'mobile'

  return (window.devicePixelRatio || 1) > 1.25 ? 'desktop-retina' : 'desktop'
}

export function diagnosticsEnabled() {
  return typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('perf')
}

export function highResolutionEnabled() {
  return typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('highress')
}
