<script lang="ts">
  // Empat langkah dari masuk sampai undangan dibagikan.
  const steps = [
    ['Masuk dengan Google', 'Sekali klik, tanpa kata sandi. Gratis untuk memulai.'],
    ['Pilih desain & link', 'Taman, Pantai, atau 2D, lalu tentukan nama-kalian.marryme.web.id.'],
    ['Isi cerita kalian', 'Nama, orang tua, jadwal akad & resepsi, foto, musik, dan amplop digital.'],
    ['Bagikan ke tamu', 'Kirim lewat WhatsApp dengan nama tamu di pesannya, atau cetak QR code.'],
  ]
</script>

<section class="steps lp-section" aria-labelledby="steps-title">
  <div class="lp-container">
    <div class="lp-section-head">
      <p class="lp-eyebrow">Cara kerja</p>
      <h2 id="steps-title">Dari masuk sampai dibagikan, kurang dari 15 menit</h2>
    </div>
    <ol>
      {#each steps as [title, desc], i (title)}
        <li>
          <span class="num">0{i + 1}</span>
          <h3>{title}</h3>
          <p>{desc}</p>
        </li>
      {/each}
    </ol>
  </div>
</section>

<style>
  ol {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 16px;
    margin: 0;
    padding: 0;
    list-style: none;
    counter-reset: step;
  }
  li {
    position: relative;
    padding: 24px 22px;
    border-radius: 22px;
    background: #fff;
    border: 1px solid rgba(143, 29, 69, 0.1);
  }
  .num {
    display: inline-block;
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 2rem;
    font-weight: 700;
    line-height: 1;
    color: var(--lp-maroon);
    opacity: 0.35;
  }
  h3 {
    margin: 12px 0 0;
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--lp-ink);
  }
  p {
    margin: 8px 0 0;
    color: var(--muted);
    font-size: 0.92rem;
    line-height: 1.6;
  }
  @media (max-width: 960px) {
    ol {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  @media (max-width: 520px) {
    ol {
      grid-template-columns: minmax(0, 1fr);
    }
  }
</style>
