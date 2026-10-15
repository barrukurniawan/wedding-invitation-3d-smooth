(async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const hostnameParts = window.location.hostname.split('.');
  let detectedSite = urlParams.get('site') || urlParams.get('slug');
  
  if (!detectedSite && hostnameParts.length > 2 && hostnameParts[0] !== 'www') {
    detectedSite = hostnameParts[0];
  }
  if (!detectedSite) {
    const pathParts = window.location.pathname.split('/');
    detectedSite = pathParts[1] === 'w' ? pathParts[2] : 'faris-eliza';
  }

  window.CMS_SITE = detectedSite || 'faris-eliza';
  window.CMS_PREVIEW = urlParams.get('preview') === '1';

  const $ = (s) => document.querySelector(s);
  // Gambar dekorasi (pengantin, pianis) baru dimuat setelah taman siap (lihat game.js),
  // supaya tidak berebut koneksi dengan gambar inti taman.
  const deferSrc = (el, src) => {
    if (window.__GARDEN_READY) el.src = src;
    else el.dataset.src = src;
  };
  const contentApiUrl = `/api/multiplayer/content?site=${encodeURIComponent(window.CMS_SITE)}${window.CMS_PREVIEW ? '&preview=1' : ''}`;

  // ── CDN aset (jsDelivr) dengan cadangan ke server sendiri ─────────────────────────────
  // Lapis 1: server mengirim `assetCdn` (kosong = mati). Lapis 2: cek cdn-ok.json (≤2,5 dtk);
  // gagal → seluruh kunjungan pakai server sendiri. Lapis 3: tiap file yang gagal dari CDN
  // diminta ulang dari server sendiri (window.__ASSET_FALLBACK, dipakai juga oleh game.js).
  window.__ASSET_FALLBACK = window.__ASSET_FALLBACK || {};
  let cdnBase = null;
  const cdnChecks = {};
  function checkCdn(base) {
    if (!base) return Promise.resolve(null);
    if (cdnChecks[base]) return cdnChecks[base];
    const key = 'marryme_cdn_ok:' + base;
    try {
      const memo = sessionStorage.getItem(key);
      if (memo === '1') return (cdnChecks[base] = Promise.resolve(base));
      if (memo === '0') return (cdnChecks[base] = Promise.resolve(null));
    } catch {}
    const version = base.split('@').pop();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2500);
    cdnChecks[base] = fetch(base + '/cdn-ok.json', { signal: ctrl.signal, cache: 'force-cache' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => (d && d.version === version ? base : null))
      .catch(() => null)
      .then((ok) => {
        clearTimeout(timer);
        try { sessionStorage.setItem(key, ok ? '1' : '0'); } catch {}
        return ok;
      });
    return cdnChecks[base];
  }
  const toCdn = (value) => {
    if (!cdnBase || typeof value !== 'string' || !value.startsWith('assets/')) return value;
    const url = cdnBase + '/presets/garden-2d/' + value;
    window.__ASSET_FALLBACK[url] = value;
    return url;
  };
  function rewriteAssets(config) {
    if (!config || !cdnBase) return config;
    if (config.assets) for (const k of Object.keys(config.assets)) config.assets[k] = toCdn(config.assets[k]);
    if (config.characters) for (const c of Object.values(config.characters)) if (c) c.atlas = toCdn(c.atlas);
    return config;
  }
  // Gambar <img> yang gagal dari CDN → ambil dari server sendiri.
  document.addEventListener('error', (event) => {
    const el = event.target;
    if (!(el instanceof HTMLImageElement)) return;
    const fallback = window.__ASSET_FALLBACK[el.currentSrc || el.src];
    if (fallback && el.getAttribute('src') !== fallback) el.src = fallback;
  }, true);
  // Mulai unduh gambar inti taman sesegera mode CDN/lokal diketahui.
  let preloaded = false;
  function preloadCore(config) {
    if (preloaded || !config?.assets) return;
    preloaded = true;
    const a = config.assets, c = config.characters || {};
    for (const href of [a.map, a.gate, a.guests, a.seated, a.hosts, c.men?.atlas, c.woman?.atlas]) {
      if (!href) continue;
      const l = document.createElement('link');
      l.rel = 'preload'; l.as = 'image'; l.href = href; l.fetchPriority = 'high';
      if (href.startsWith('http')) l.crossOrigin = 'anonymous';
      document.head.append(l);
    }
  }

  let revision = null;
  let mediaSignature = '';
  let gameScriptLoaded = false;

  // "muhammad andhika putra" -> "Muhammad Andhika Putra"; kata yang sudah berkapital dibiarkan.
  const titleCase = (value) =>
    String(value || '')
      .trim()
      .replace(/\s+/g, ' ')
      .split(' ')
      .map((w) => (w && w === w.toLowerCase() ? w.charAt(0).toUpperCase() + w.slice(1) : w))
      .join(' ');

  // Judul di peta: mengecil otomatis, dan pecah jadi 2 baris ("A" / "& B") bila tetap tidak muat,
  // supaya nama panjang tidak terpotong atau tertutup tombol musik/bantuan.
  let measureCtx = null;
  function fitMapTitle() {
    const strong = $('.map-wedding-title strong');
    if (!strong || !strong.dataset.groom) return;
    const groom = strong.dataset.groom;
    const bride = strong.dataset.bride;
    const vw = window.innerWidth;
    const shortLandscape = window.innerHeight <= 500 && vw > window.innerHeight;
    const compact = vw <= 760 && !shortLandscape;
    const tools = $('.game-tools')?.getBoundingClientRect();
    const available = compact ? (tools && tools.width ? tools.left - 24 - 10 : vw - 24 - 92) : vw - 300;
    const base = shortLandscape ? 29 : vw <= 360 ? 28 : compact ? 31 : 36;
    const min = compact ? 18 : 20;
    measureCtx = measureCtx || document.createElement('canvas').getContext('2d');
    const fits = (text, size) => {
      measureCtx.font = `800 ${size}px Nunito, ui-rounded, sans-serif`;
      return measureCtx.measureText(text).width <= available;
    };
    const oneLine = `${groom} & ${bride}`;
    strong.replaceChildren();
    for (let size = base; size >= Math.max(min, base - 6); size--) {
      if (fits(oneLine, size)) {
        strong.style.fontSize = `${size}px`;
        strong.textContent = oneLine;
        return;
      }
    }
    let size = base;
    while (size > min && !(fits(groom, size) && fits(`& ${bride}`, size))) size--;
    strong.style.fontSize = `${size}px`;
    for (const text of [groom, `& ${bride}`]) {
      const line = document.createElement('span');
      line.className = 'title-line';
      line.textContent = text;
      strong.append(line);
    }
  }
  window.addEventListener('resize', fitMapTitle);
  // Ukur ulang setelah Nunito benar-benar termuat (font cadangan lebih lebar -> judul kekecilan).
  document.fonts?.load?.('800 31px Nunito').then(fitMapTitle).catch(() => {});
  document.fonts?.ready?.then(fitMapTitle);

  // Kartu default (tanpa foto): nama & tahun pasangan ditulis di atas gambar kartu kosong.
  // Nama lengkap dipakai bila muat; kalau tidak, nama depan (melewati "Muhammad", "Siti", dll.).
  const NAME_PREFIXES = new Set(['muhammad', 'muhamad', 'mohammad', 'mohamad', 'mochammad', 'moch', 'moch.', 'moh', 'moh.', 'm', 'm.', 'siti']);
  const shortName = (full) => {
    const words = full.split(' ').filter(Boolean);
    const rest = words.length > 1 && NAME_PREFIXES.has(words[0].toLowerCase()) ? words.slice(1) : words;
    return rest[0] || full;
  };
  const cardState = { groom: '', bride: '', year: '' };
  function fitCard() {
    const img = $('#titleCardImage');
    const nameEl = $('#cardName');
    if (!img || !nameEl || !cardState.groom) return;
    const w = img.clientWidth;
    if (!w) return;
    const yearEl = $('#cardYear');
    const serialEl = $('#cardSerial');
    yearEl.textContent = cardState.year;
    let yearSize = w * 0.06;
    yearEl.style.fontSize = `${yearSize}px`;
    while (yearEl.scrollWidth > yearEl.clientWidth && yearSize > w * 0.035) {
      yearSize -= 0.5;
      yearEl.style.fontSize = `${yearSize}px`;
    }
    serialEl.textContent = `001/${cardState.year}`;
    serialEl.style.fontSize = `${w * 0.024}px`;
    const candidates = [
      `${cardState.groom} & ${cardState.bride}`,
      `${shortName(cardState.groom)} & ${shortName(cardState.bride)}`,
    ];
    const max = w * 0.058;
    const min = w * 0.036;
    for (const [i, text] of candidates.entries()) {
      nameEl.textContent = text;
      let size = max;
      nameEl.style.fontSize = `${size}px`;
      while (nameEl.scrollWidth > nameEl.clientWidth && size > min) {
        size -= 0.5;
        nameEl.style.fontSize = `${size}px`;
      }
      if (nameEl.scrollWidth <= nameEl.clientWidth || i === candidates.length - 1) break;
    }
  }
  window.addEventListener('resize', fitCard);
  document.fonts?.load?.('900 20px Nunito').then(fitCard).catch(() => {});
  $('#titleCardImage')?.addEventListener('load', fitCard);

  const yearFrom = (config) => {
    const texts = JSON.stringify(config.places || []);
    const match = texts.match(/\b(20\d{2})\b/);
    return match ? match[1] : String(new Date().getFullYear());
  };

  function apply(config) {
    if (!config || !config.profile) return;
    config.profile.groom = titleCase(config.profile.groom);
    config.profile.bride = titleCase(config.profile.bride);
    const name = config.profile.groom + ' & ' + config.profile.bride;
    document.title = config.profile.titlePrefix + ' ' + name;

    const kicker = $('#titleScreen .opening-kicker');
    if (kicker) kicker.textContent = config.profile.titlePrefix;
    const loadingCouple = $('#loadingCouple');
    if (loadingCouple) loadingCouple.textContent = `Undangan ${shortName(config.profile.groom)} & ${shortName(config.profile.bride)}`;
    const h1 = $('#titleScreen h1');
    if (h1) {
      h1.textContent = name;
      h1.classList.toggle('long-name', name.length > 24);
      h1.classList.toggle('very-long-name', name.length > 36);
    }
    const contBtn = $('#continueButton');
    if (contBtn) contBtn.textContent = config.profile.startButton || 'Mulai Permainan';

    const mapTitleSpan = $('.map-wedding-title span');
    if (mapTitleSpan) mapTitleSpan.textContent = config.profile.titlePrefix;
    const mapTitleStrong = $('.map-wedding-title strong');
    if (mapTitleStrong) {
      mapTitleStrong.dataset.groom = config.profile.groom;
      mapTitleStrong.dataset.bride = config.profile.bride;
      fitMapTitle();
    }
    const mapTitle = $('.map-wedding-title');
    if (mapTitle) mapTitle.setAttribute('aria-label', document.title);

    const wishLabel = $('#wishForm label');
    if (wishLabel) wishLabel.textContent = 'Untuk ' + name + ',';
    const coupleImg = $('#weddingCouple');
    if (coupleImg) coupleImg.alt = name;

    const guideText = $('#guide .dialog-inner>p');
    if (guideText) {
      guideText.textContent =
        'Selamat datang di taman ' +
        name +
        '. Buka venue Akad & Resepsi untuk jadwal acara beserta alamatnya.' +
        (config.demo ? ' Informasi pernikahan saat ini menggunakan data contoh.' : '');
    }

    const a = config.assets;
    if (a) {
      const coverImg = $('.title-card img');
      const titleCard = $('.title-card');
      if (coverImg && a.cover) {
        // Kartu contoh lama (berisi nama "Faris & Eliza") diganti kartu kosong + nama asli.
        const cover = a.cover.includes('assets/wedding-card.') ? toCdn(a.coverBlank || 'assets/wedding-card-blank.webp') : a.cover;
        if (cover.startsWith('http') && cover.includes('cdn.jsdelivr.net')) coverImg.crossOrigin = 'anonymous';
        if (coverImg.getAttribute('src') !== cover) coverImg.src = cover;
        coverImg.alt = 'Kartu pernikahan ' + name;
        cardState.groom = config.profile.groom;
        cardState.bride = config.profile.bride;
        cardState.year = yearFrom(config);
        fitCard();
        if (!a.cover.includes('assets/wedding-card.')) {
          titleCard?.classList.add('has-custom-photo');
          coverImg.classList.add('has-custom-photo');
        } else {
          titleCard?.classList.remove('has-custom-photo');
          coverImg.classList.remove('has-custom-photo');
        }
      }
      if (coupleImg && a.couple) deferSrc(coupleImg, a.couple);

      for (const [id, idle, playing] of [
        ['pianistImage', 'pianistIdle', 'pianistPlaying'],
        ['singerImage', 'singerIdle', 'singerPlaying'],
      ]) {
        const el = $('#' + id);
        if (el && a[idle] && a[playing]) {
          el.dataset.idle = a[idle];
          el.dataset.playing = a[playing];
          if (window.__GARDEN_READY) el.src = $('#gardenMusic')?.paused ? a[idle] : a[playing];
        }
      }

      const gardenMusic = $('#gardenMusic');
      if (gardenMusic && a.music && gardenMusic.getAttribute('src') !== a.music) {
        gardenMusic.src = a.music;
      }
    }
  }

  // Aset per gaya busana. Harus sinkron dengan server/services/characterStyles.js.
  const STYLE_ASSETS = {
    hijab: {
      couple: 'assets/mempelai.webp',
      guests: 'assets/wedding-guests-v2.webp',
      seated: 'assets/seated-guests.webp',
      hosts: 'assets/wedding-hosts.webp',
      coverBlank: 'assets/wedding-card-blank.webp',
      ceremonyBackground: 'assets/ceremony-background.png',
      womanAtlas: 'assets/woman-atlas.png',
    },
    umum: {
      couple: 'assets/mempelai-umum.webp',
      guests: 'assets/wedding-guests-umum.webp',
      seated: 'assets/seated-guests-umum.webp',
      hosts: 'assets/wedding-hosts-umum.webp',
      coverBlank: 'assets/wedding-card-blank-umum.webp',
      ceremonyBackground: 'assets/ceremony-background-umum.webp',
      womanAtlas: 'assets/woman-atlas-umum.png',
    },
  };

  function transformMarryMeConfig(c) {
    if (!c) return null;
    const style = STYLE_ASSETS[c.character_style] || STYLE_ASSETS.umum;
    return {
      demo: false,
      profile: {
        groom: c.groom_name || 'Toni',
        bride: c.bride_name || 'Kia',
        titlePrefix: 'The Wedding of',
        startButton: 'Mulai Permainan',
      },
      assets: {
        cover: c.wedding_photo || 'assets/wedding-card.webp',
        map: 'assets/garden.webp',
        gate: 'assets/front-gate.webp',
        couple: style.couple,
        coverBlank: style.coverBlank,
        pianistIdle: 'assets/pianist-idle.webp',
        pianistPlaying: 'assets/pianist.webp',
        singerIdle: 'assets/singer-idle.webp',
        singerPlaying: 'assets/singer.webp',
        guests: style.guests,
        seated: style.seated,
        hosts: style.hosts,
        music: c.bgm_url || 'assets/wedding-song-complete.m4a',
        click: 'assets/button-pop.mp3',
      },
      characters: {
        men: { atlas: 'assets/character-atlas.png', frames: 9 },
        woman: { atlas: style.womanAtlas, frames: 7 },
      },
      places: [
        {
          id: 'ceremony',
          title: 'Akad & Resepsi',
          subtitle: 'Jadwal hari bahagia kami',
          symbol: '♡',
          x: 0.5,
          y: 0.27,
          description: '',
          fields: [],
          ceremonyBackground: style.ceremonyBackground,
          events: [
            {
              title: 'Akad Nikah',
              date: c.akad_date || 'Rabu, 15 Juli 2026',
              time: c.akad_time || '08:00 - 10:00 WIB',
              venue: c.akad_location || 'Kediaman Mempelai Wanita',
              address: c.venue_address || 'Jakarta',
              mapsUrl: c.maps_url || '',
            },
            {
              title: 'Resepsi',
              date: c.resepsi_date || 'Rabu, 15 Juli 2026',
              time: c.resepsi_time || '11:00 - 14:00 WIB',
              venue: c.resepsi_location || 'Gedung Serbaguna',
              address: c.venue_address || 'Jakarta',
              mapsUrl: c.maps_url || '',
            },
          ],
        },
        {
          id: 'gifts',
          title: 'Hadiah',
          subtitle: 'Tanda kasih untuk mempelai',
          symbol: '♡',
          x: 0.78,
          y: 0.35,
          description: 'Kehadiran dan doa restu Anda merupakan hadiah terindah bagi kami.',
          fields: [],
          sections: [
            {
              title: 'Rekening ' + (c.groom_name || 'Pengantin'),
              fields: [
                ['Bank', c.bank_name || 'BCA'],
                ['Nomor rekening', c.bank_account || '-'],
                ['Atas nama', c.bank_holder || c.groom_name || '-'],
              ],
            },
            // Alamat kirim hadiah hanya bila diisi pasangan (dulu memakai alamat venue: keliru).
            ...(c.gift_shipping
              ? [{
                  title: 'Kirim Hadiah',
                  fields: [
                    ['Penerima', c.gift_shipping.recipient || `${c.groom_name || 'Pengantin'} & ${c.bride_name || 'Pengantin'}`],
                    ['Alamat', c.gift_shipping.address],
                    ...(c.gift_shipping.phone ? [['No. HP', c.gift_shipping.phone]] : []),
                    ...(c.gift_shipping.note ? [['Catatan', c.gift_shipping.note]] : []),
                  ],
                }]
              : []),
          ],
        },
        {
          id: 'wishes',
          title: 'Ucapan Bahagia',
          subtitle: 'Sepucuk doa dari orang tersayang',
          symbol: '✉',
          x: 0.23,
          y: 0.32,
          description: `Titipkan doa dan harapan manismu untuk ${c.groom_name || 'Toni'} & ${c.bride_name || 'Kia'}.`,
          fields: [],
        },
        {
          id: 'story',
          title: 'Cerita Kami',
          subtitle: 'Perjalanan menuju selamanya',
          symbol: '♥',
          x: 0.25,
          y: 0.67,
          description: c.quote || 'Cinta bukan tentang mencari orang yang sempurna, melainkan saling melengkapi dalam kebahagiaan.',
          fields: [
            ['Hari bahagia', `${c.akad_date || '15 Juli 2026'} — mengikat janji suci`],
          ],
        },
        {
          id: 'gallery',
          title: 'Galeri Foto',
          subtitle: 'Momen indah dalam bingkai',
          symbol: '▧',
          x: 0.77,
          y: 0.69,
          description: `Koleksi momen bahagia ${c.groom_name || 'Toni'} & ${c.bride_name || 'Kia'}.`,
          fields: [],
          photos: (Array.isArray(c.gallery_photos) && c.gallery_photos.length > 0)
            ? c.gallery_photos.map((url, i) => ({ src: url, alt: `Foto ${i + 1}`, credit: '', url: '' }))
            : [
                { src: 'assets/gallery-1.jpg', alt: 'Momen Bahagia', credit: '', url: '' },
                { src: 'assets/gallery-2.jpg', alt: 'Momen Bahagia', credit: '', url: '' },
                { src: 'assets/gallery-3.jpg', alt: 'Momen Bahagia', credit: '', url: '' },
              ],
        },
        {
          id: 'welcome',
          title: 'Selamat Datang',
          subtitle: 'Senang sekali kamu hadir',
          symbol: '✉',
          x: 0.5,
          y: 0.79,
          description: `Selamat datang di dunia kecil pernikahan kami. Nikmati suasananya dan jelajahi taman bahagia kami.`,
          fields: [
            ['Undanganmu', `Pernikahan ${c.groom_name || 'Toni'} & ${c.bride_name || 'Kia'}`],
            ['Hari bahagia', c.akad_date || 'Rabu, 15 Juli 2026'],
            ['Lokasi', c.akad_location || 'Kediaman Mempelai'],
            ['Jelajahi taman', 'Ada enam tempat untuk dikunjungi'],
          ],
        },
      ],
    };
  }

  function launchGame() {
    if (gameScriptLoaded) return;
    gameScriptLoaded = true;
    const script = document.createElement('script');
    script.src = 'game.js?v=20261012b';
    document.body.append(script);
  }

  // Handle postMessage from parent SvelteKit app
  window.addEventListener('message', async (event) => {
    if (event.data?.type === 'SET_WEDDING_CONFIG' && event.data.config) {
      // Tunggu keputusan CDN dulu supaya kartu/gambar tidak sempat diunduh dari server sendiri.
      const decided = await checkCdn(event.data.config.asset_cdn || null);
      if (decided) cdnBase = decided;
      const transformed = transformMarryMeConfig(event.data.config);
      if (transformed) {
        rewriteAssets(transformed);
        window.WEDDING = transformed;
        apply(transformed);
        window.dispatchEvent(new CustomEvent('wedding-content-updated', { detail: { mediaChanged: true } }));
      }
    }
  });

  // Signal parent that garden iframe is ready
  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'GARDEN_READY' }, '*');
    }
  } catch {}

  // Fetch initial config from backend API or fallback to static config.js
  try {
    // Pakai request yang sudah dimulai di <head> index.html bila URL-nya sama.
    const early = window.__CMS_CONTENT_URL === contentApiUrl ? await window.__CMS_CONTENT : null;
    const response = early || (await fetch(contentApiUrl, { cache: 'no-store' }));
    if (response.ok) {
      const data = await response.json();
      cdnBase = await checkCdn(data.assetCdn || null);
      rewriteAssets(data.config);
      preloadCore(data.config);
      window.WEDDING = data.config;
      revision = data.revision;
      mediaSignature = JSON.stringify([data.config.assets, data.config.characters]);
      apply(data.config);
      launchGame();
    } else {
      throw new Error('API content unavailable');
    }
  } catch {
    // Load config.js fallback
    try {
      const fallbackScript = document.createElement('script');
      fallbackScript.src = 'config.js';
      fallbackScript.onload = () => {
        apply(window.WEDDING);
        launchGame();
      };
      fallbackScript.onerror = () => {
        launchGame();
      };
      document.body.append(fallbackScript);
    } catch {
      launchGame();
    }
  }

  // Periodic poll for content updates if live
  setInterval(async () => {
    if (document.hidden || document.querySelector('dialog[open]')) return;
    try {
      const r = await fetch(contentApiUrl, { cache: 'no-store' });
      if (!r.ok) return;
      const data = await r.json();
      if (data.revision === revision) return;
      rewriteAssets(data.config);
      const signature = JSON.stringify([data.config.assets, data.config.characters]);
      const mediaChanged = signature !== mediaSignature;
      mediaSignature = signature;
      revision = data.revision;
      window.WEDDING = data.config;
      apply(data.config);
      window.dispatchEvent(new CustomEvent('wedding-content-updated', { detail: { mediaChanged } }));
    } catch {}
  }, 15000);
})();
