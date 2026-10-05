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
  const contentApiUrl = `/api/multiplayer/content?site=${encodeURIComponent(window.CMS_SITE)}${window.CMS_PREVIEW ? '&preview=1' : ''}`;

  let revision = null;
  let mediaSignature = '';
  let gameScriptLoaded = false;

  function apply(config) {
    if (!config || !config.profile) return;
    const name = config.profile.groom + ' & ' + config.profile.bride;
    document.title = config.profile.titlePrefix + ' ' + name;

    const kicker = $('#titleScreen .opening-kicker');
    if (kicker) kicker.textContent = config.profile.titlePrefix;
    const h1 = $('#titleScreen h1');
    if (h1) h1.textContent = name;
    const contBtn = $('#continueButton');
    if (contBtn) contBtn.textContent = config.profile.startButton || 'Mulai Permainan';

    const mapTitleSpan = $('.map-wedding-title span');
    if (mapTitleSpan) mapTitleSpan.textContent = config.profile.titlePrefix;
    const mapTitleStrong = $('.map-wedding-title strong');
    if (mapTitleStrong) mapTitleStrong.textContent = name;
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
      if (coverImg && a.cover) {
        coverImg.src = a.cover;
        coverImg.alt = 'Kartu pernikahan ' + name;
      }
      if (coupleImg && a.couple) coupleImg.src = a.couple;

      for (const [id, idle, playing] of [
        ['pianistImage', 'pianistIdle', 'pianistPlaying'],
        ['singerImage', 'singerIdle', 'singerPlaying'],
      ]) {
        const el = $('#' + id);
        if (el && a[idle] && a[playing]) {
          el.dataset.idle = a[idle];
          el.dataset.playing = a[playing];
          el.src = $('#gardenMusic')?.paused ? a[idle] : a[playing];
        }
      }

      const gardenMusic = $('#gardenMusic');
      if (gardenMusic && a.music && gardenMusic.getAttribute('src') !== a.music) {
        gardenMusic.src = a.music;
      }
    }
  }

  function transformMarryMeConfig(c) {
    if (!c) return null;
    return {
      demo: false,
      profile: {
        groom: c.groom_name || 'Toni',
        bride: c.bride_name || 'Kia',
        titlePrefix: 'The Wedding of',
        startButton: 'Mulai Permainan',
      },
      assets: {
        cover: c.wedding_photo || 'assets/wedding-card.jpg',
        map: 'assets/garden.png',
        gate: 'assets/front-gate.svg',
        couple: 'assets/mempelai.gif',
        pianistIdle: 'assets/pianist-idle.png',
        pianistPlaying: 'assets/pianist.gif',
        singerIdle: 'assets/singer-idle.png',
        singerPlaying: 'assets/singer.gif',
        guests: 'assets/wedding-guests-v2.png',
        seated: 'assets/seated-guests.png',
        hosts: 'assets/wedding-hosts.png',
        music: c.bgm_url || 'assets/wedding-song-complete.m4a',
        click: 'assets/button-pop.mp3',
      },
      characters: {
        men: { atlas: 'assets/character-atlas.png', frames: 9 },
        woman: { atlas: 'assets/woman-atlas.png', frames: 7 },
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
            {
              title: 'Pengiriman Hadiah',
              fields: [
                ['Penerima', `${c.groom_name || 'Pengantin'} & ${c.bride_name || 'Pengantin'}`],
                ['Alamat', c.venue_address || '-'],
              ],
            },
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
    script.src = 'game.js';
    document.body.append(script);
  }

  // Handle postMessage from parent SvelteKit app
  window.addEventListener('message', (event) => {
    if (event.data?.type === 'SET_WEDDING_CONFIG' && event.data.config) {
      const transformed = transformMarryMeConfig(event.data.config);
      if (transformed) {
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
    const response = await fetch(contentApiUrl, { cache: 'no-store' });
    if (response.ok) {
      const data = await response.json();
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
