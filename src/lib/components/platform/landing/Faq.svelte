<script lang="ts">
  // FAQ akordeon (native <details>, tanpa JS tambahan).
  import type { PublicPricing } from '$lib/api-client'
  import { fmtIdr } from './format'

  let { pricing }: { pricing: PublicPricing | null } = $props()

  const bayar = $derived(
    pricing?.isFree && pricing.promoActive
      ? `Selama ${pricing.promoLabel?.toLowerCase()}, undangan gratis dan langsung aktif.${pricing.afterPromoPrice != null ? ` Setelah promo berakhir harganya ${fmtIdr(pricing.afterPromoPrice)}, dibayar lewat transfer bank lalu unggah bukti; admin memverifikasi dan undangan aktif.` : ''}`
      : 'Transfer bank, lalu unggah bukti transfer di dashboard. Admin memverifikasi, lalu undangan aktif. Tidak ada langganan.',
  )

  const items = $derived([
    ['Tamu perlu install aplikasi?', 'Tidak. Tamu cukup membuka link di browser HP atau laptop. Tidak ada yang perlu diunduh.'],
    ['HP tamu yang lama bisa membuka undangan 3D?', 'Bisa. Dunia 3D punya mode hemat otomatis untuk HP kelas menengah. Untuk HP yang benar-benar lama, kalian bisa memilih desain 2D pixel yang sangat ringan.'],
    ['Berapa lama undangan aktif?', 'Sampai 7 hari setelah tanggal resepsi. Setelah itu link tidak lagi dibuka untuk tamu, tetapi data ucapan dan RSVP tetap bisa kalian lihat di dashboard selama 30 hari berikutnya.'],
    ['Bisa ganti desain atau venue setelah undangan dibuat?', 'Bisa, kapan saja dari menu Pengaturan di dashboard. Nama, acara, foto, dan ucapan tamu tidak perlu diisi ulang.'],
    ['Bagaimana cara bayarnya?', bayar],
    ['Data tamu aman?', 'Ucapan, RSVP, dan daftar kontak hanya bisa dilihat oleh pemilik akun. Login memakai akun Google, jadi tidak ada kata sandi yang perlu disimpan.'],
    ['Bisa pakai nama link sendiri?', 'Ya. Kalian memilih sendiri subdomainnya, misalnya nama-kalian.marryme.web.id, dan bisa mengubahnya di pengaturan.'],
    ['Kalau ada kendala, minta bantuan ke mana?', 'Ada tombol chat bantuan di dashboard yang langsung terhubung ke admin, atau hubungi kami lewat WhatsApp.'],
  ])
</script>

<section class="faq lp-section" id="faq" aria-labelledby="faq-title">
  <div class="lp-container narrow">
    <div class="lp-section-head">
      <p class="lp-eyebrow">FAQ</p>
      <h2 id="faq-title">Pertanyaan yang sering ditanyakan</h2>
    </div>
    <div class="list">
      {#each items as [q, a], i (q)}
        <details open={i === 0}>
          <summary>{q}<span aria-hidden="true">+</span></summary>
          <p>{a}</p>
        </details>
      {/each}
    </div>
  </div>
</section>

<style>
  .narrow {
    max-width: 800px;
  }
  .list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  details {
    border-radius: 18px;
    background: #fff;
    border: 1px solid rgba(143, 29, 69, 0.1);
    overflow: hidden;
  }
  summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 18px 20px;
    cursor: pointer;
    list-style: none;
    font-weight: 700;
    color: var(--lp-ink);
  }
  summary::-webkit-details-marker {
    display: none;
  }
  summary span {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--lp-blush);
    color: var(--lp-maroon);
    font-weight: 800;
    transition: transform 0.2s;
  }
  details[open] summary span {
    transform: rotate(45deg);
  }
  details p {
    margin: 0;
    padding: 0 20px 18px;
    color: var(--muted);
    line-height: 1.65;
  }
</style>
