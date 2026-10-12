<script lang="ts" module>
  // Set ikon MarryMe 24x24 (duotone maroon), inline tanpa dependensi.
  // class="d" = isian lembut (blush), class="g" = aksen emas,
  // class="f" = isian warna garis, class="w" = isian latar (menutup garis di belakangnya).
  const heart = (cx: number, cy: number, s: number, cls = 'g') =>
    `<path class="${cls}" d="M${cx} ${cy + s * 0.9}C${cx - s * 0.25} ${cy + s * 0.7} ${cx - s} ${cy + s * 0.15} ${cx - s} ${cy - s * 0.3}A${s * 0.52} ${s * 0.52} 0 0 1 ${cx} ${cy - s * 0.42}A${s * 0.52} ${s * 0.52} 0 0 1 ${cx + s} ${cy - s * 0.3}C${cx + s} ${cy + s * 0.15} ${cx + s * 0.25} ${cy + s * 0.7} ${cx} ${cy + s * 0.9}Z"/>`
  const star4 = (cx: number, cy: number, s: number, cls = 'g') =>
    `<path class="${cls}" d="M${cx} ${cy - s}L${cx + s * 0.28} ${cy - s * 0.28}L${cx + s} ${cy}L${cx + s * 0.28} ${cy + s * 0.28}L${cx} ${cy + s}L${cx - s * 0.28} ${cy + s * 0.28}L${cx - s} ${cy}L${cx - s * 0.28} ${cy - s * 0.28}Z"/>`

  const ICONS = {
    // Navigasi utama
    invite: `<rect class="d" x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.6 7.2 8.4 6 8.4-6"/>${heart(12, 13.4, 2.4)}`,
    guestbook: `<path class="d" d="M12 6.5C10 5 7 4.5 3 5v13c4-.5 7 0 9 1.5 2-1.5 5-2 9-1.5V5c-4-.5-7 0-9 1.5z"/><path d="M12 6.5v13"/>${heart(16.5, 10.5, 2)}`,
    payment: `<rect class="d" x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 9.5h19"/><path d="M6.5 15h4"/><circle class="g" cx="17" cy="15" r="1.6"/>`,
    palette: `<path class="d" d="M12 3a9 9 0 0 0 0 18c1.4 0 2-1 1.6-2.1-.5-1.3.3-2.4 1.7-2.4H18a3 3 0 0 0 3-3C21 7 17 3 12 3z"/><circle class="f" cx="7.5" cy="11" r="1.3"/><circle class="f" cx="10" cy="7" r="1.3"/><circle class="g" cx="15" cy="7.3" r="1.5"/>`,
    send: `<path class="d" d="M21.5 2.5 2.5 9.8l7.3 3.4 3.4 8.3z"/><path d="M21.5 2.5 9.8 13.2"/>`,
    // Sub-tab editor
    rings: `<circle cx="8.7" cy="15" r="5.5"/><circle cx="15.3" cy="15" r="5.5"/><path class="g" d="M9.5 3.5h5l1.5 2-4 3.5-4-3.5z"/>`,
    calendar: `<rect class="d" x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>${heart(12, 15, 2.6)}`,
    amplop: `<path d="M5.5 10V4.5a1.5 1.5 0 0 1 1.5-1.5h10a1.5 1.5 0 0 1 1.5 1.5V10"/><circle class="g" cx="12" cy="7" r="2.2"/><path class="d" d="M3 10 12 15.5 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>`,
    gift: `<rect class="d" x="4" y="10.5" width="16" height="10.5" rx="1.5"/><rect class="w" x="3" y="7" width="18" height="3.5" rx="1"/><path d="M12 7v14"/><path class="g" d="M12 7c-1.5-3.5-5.5-4-5.5-1.8S10 7 12 7zM12 7c1.5-3.5 5.5-4 5.5-1.8S14 7 12 7z"/>`,
    gallery: `<rect class="d" x="3" y="3" width="18" height="18" rx="2.5"/><circle class="g" cx="9" cy="9" r="2"/><path d="m21 15-3.6-3.6a2 2 0 0 0-2.8 0L6 20.5"/>`,
    quote: `<path class="d" d="M21 14.5a2.5 2.5 0 0 1-2.5 2.5H8l-5 4V5.5A2.5 2.5 0 0 1 5.5 3h13A2.5 2.5 0 0 1 21 5.5z"/><circle class="f" cx="9" cy="9.3" r="1.4"/><circle class="f" cx="14.5" cy="9.3" r="1.4"/><path d="M10.4 9.3c0 1.9-.9 2.9-2.2 3.3M15.9 9.3c0 1.9-.9 2.9-2.2 3.3"/>`,
    music: `<path d="M9 18V5l12-2v13"/><circle class="d" cx="6" cy="18" r="3"/><circle class="g" cx="18" cy="16" r="3"/>`,
    // Aksi
    save: `<path class="d" d="M6 3h10l4 4v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="m8.5 12.5 2.5 2.5 4.5-5"/>`,
    edit: `<path class="d" d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/><path d="M14 6l3 3"/>${star4(19, 17.5, 2.6)}`,
    copy: `<rect class="d" x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>`,
    trash: `<path d="M3 6h18"/><path class="d" d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/>`,
    upload: `<path class="d" d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5M12 3v12"/>`,
    refresh: `<path d="M21 12a9 9 0 0 1-15.5 6.2L3 16"/><path d="M3 21v-5h5"/><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 3v5h-5"/>`,
    folder: `<path class="d" d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>`,
    camera: `<path class="d" d="M3 8.5A2.5 2.5 0 0 1 5.5 6h2l1.5-2h6l1.5 2h2A2.5 2.5 0 0 1 21 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z"/><circle class="w" cx="12" cy="13" r="3.5"/><circle class="g" cx="17.5" cy="9" r=".9"/>`,
    paperclip: `<path d="m20 11-8.5 8.5a5 5 0 0 1-7-7L13 4a3.3 3.3 0 0 1 4.7 4.7l-8.4 8.5a1.7 1.7 0 0 1-2.4-2.4L15 7"/>`,
    link: `<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>`,
    phone: `<rect class="d" x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M10.5 18.5h3"/>`,
    settings: `<path d="M4 6h9M19 6h1M4 12h3M13 12h7M4 18h11M21 18h-1"/><circle class="d" cx="16" cy="6" r="2.2"/><circle class="g" cx="10" cy="12" r="2.2"/><circle class="d" cx="17.5" cy="18" r="2.2"/>`,
    // Status & info
    check: `<circle class="d" cx="12" cy="12" r="9"/><path d="m8 12.3 2.7 2.7L16 9.5"/>`,
    close: `<path d="M18 6 6 18M6 6l12 12"/>`,
    alert: `<path class="d" d="M10.3 3.9 2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4.5"/><circle class="f" cx="12" cy="17" r="1"/>`,
    tip: `<path class="d" d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V17h5v-1.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/><path d="M9.5 20.5h5"/>${star4(12, 9.3, 2.2)}`,
    party: `<path class="d" d="M3.5 20.5 8.3 8.7l7 7z"/><path d="M14 3.5v2M20.5 10h-2M17.2 6.8l1.6-1.6"/><circle class="g" cx="20" cy="3.8" r="1.1"/><circle class="g" cx="11" cy="4.5" r=".9"/><circle class="g" cx="19.7" cy="14" r=".9"/>`,
    sparkle: `<path class="d" d="M11 3l1.8 5.2L18 10l-5.2 1.8L11 17l-1.8-5.2L4 10l5.2-1.8z"/>${star4(18.5, 17.5, 2.6)}`,
    star: `<path class="d" d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>`,
    heart: `<path class="d" d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z"/>`,
    chat: `<path class="d" d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>${heart(12, 10, 2.8)}`,
    // Lokasi
    pin: `<path class="d" d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/>${heart(12, 10, 2.6)}`,
    map: `<path class="d" d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20z"/><path d="M9 4v13.5M15 6.5V20"/>`,
    compass: `<circle class="d" cx="12" cy="12" r="9"/><path class="g" d="m15.5 8.5-2 5-5 2 2-5z"/>`,
    globe: `<circle class="d" cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18"/>`,
    // Tema & orang
    garden: `<path class="d" d="M5 20C5 11 10 5 20 4c0 10-5 15-15 16z"/><path d="M5 20l8-8"/>`,
    beach: `<path d="M13 21c0-4 .3-7.5 1.5-10.5"/><path class="d" d="M14.5 10.5C12.5 7.5 8 7 5 9c3.5 0 6 .5 9.5 1.5zM14.5 10.5c1-3 4.5-5 8-4-2.5.8-5 2-8 4zM14.5 10.5c3-.3 5.7.8 7 3.7-2.8-1.3-4.6-2-7-3.7z"/>${star4(5.5, 4.5, 1.8)}<path d="M3 21h18"/>`,
    groom: `<circle class="d" cx="12" cy="7.5" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/><path class="g" d="M9.8 15.8 12 17l2.2-1.2v2.6L12 17.2l-2.2 1.2z"/>`,
    bride: `<path class="d" d="M12 2.5c-4 0-6.5 3-6.5 7 0 4.5-1 7.5-2.5 11.5h18c-1.5-4-2.5-7-2.5-11.5 0-4-2.5-7-6.5-7z"/><circle class="w" cx="12" cy="9" r="3.6"/>${heart(12, 18, 1.8)}`,
    bank: `<path class="d" d="M3 9.5 12 4l9 5.5z"/><path d="M5.5 11v7M10 11v7M14 11v7M18.5 11v7M3 20.5h18"/>`,
    zap: `<path class="d" d="M13 2.5 4.5 13.5H12l-1 8 8.5-11H12z"/>`,
    rocket: `<path class="d" d="M12 2.5c3.5 2 5 5.5 5 9.5l-2 4H9l-2-4c0-4 1.5-7.5 5-9.5z"/><circle class="w" cx="12" cy="9.5" r="1.8"/><path class="g" d="M10 16.5h4L12 21z"/>`,
    clock: `<circle class="d" cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>`,
    external: `<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path class="d" d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>`,
    download: `<path class="d" d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/>`,
    eye: `<path class="d" d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle class="w" cx="12" cy="12" r="3"/>`,
    contacts: `<rect class="d" x="4" y="2.5" width="16" height="19" rx="2.5"/><circle class="w" cx="12" cy="10" r="2.8"/><path d="M7.5 17.5a4.5 4.5 0 0 1 9 0"/><path d="M2.5 7h3M2.5 12h3M2.5 17h3"/>`,
  } as const

  export type IconName = keyof typeof ICONS
</script>

<script lang="ts">
  let { name, size = 18 }: { name: IconName; size?: number } = $props()
</script>

<svg
  class="mm-icon"
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="1.8"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  {@html ICONS[name]}
</svg>

<style>
  /* Warna lewat variabel CSS: di tombol/tab maroon cukup set --mm-ic: #fff dst. */
  .mm-icon { display: inline-block; flex: none; color: var(--mm-ic, #8f1d45); vertical-align: -0.2em; }
  .mm-icon :global(.d) { fill: var(--mm-ic-soft, #f6c5d2); }
  .mm-icon :global(.g) { fill: var(--mm-ic-accent, #f5b942); }
  .mm-icon :global(.f) { fill: currentColor; }
  .mm-icon :global(.w) { fill: var(--mm-ic-bg, #fff); }
</style>
