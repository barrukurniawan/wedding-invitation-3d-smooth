// Independent of the 3D renderer: music remains controllable while the scene loads.
const audio = document.querySelector('#gardenMusic');
const button = document.querySelector('#musicToggle');
const label = button.querySelector('.music-label');
const status = document.querySelector('#musicStatus');
audio.volume = .45;
let wanted = true;
let pending = false;
let request = 0;
let autoStartArmed = true;

function sync() {
  const playing = !audio.paused && !audio.ended;
  button.setAttribute('aria-pressed', String(playing));
  button.setAttribute('aria-busy', String(pending));
  button.setAttribute('aria-label', wanted ? 'Matikan musik' : 'Nyalakan musik');
  button.title = wanted ? 'Matikan musik' : 'Nyalakan musik';
  label.textContent = pending ? 'Memuat musik…' : playing ? 'Musik: Aktif' : wanted ? 'Musik: Siap' : 'Musik: Mati';
}

async function setEnabled(enabled) {
  wanted = enabled;
  const id = ++request;
  status.textContent = '';
  if (!enabled) {
    pending = false;
    audio.pause();
    sync();
    return;
  }
  pending = true;
  sync();
  try {
    // Called directly from pointer/keyboard interaction for browser audio policies.
    await audio.play();
    if (id !== request) return;
    pending = false;
    autoStartArmed = false;
    removeAutoStart();
    sync();
  } catch (error) {
    if (id !== request) return;
    pending = false;
    wanted = error.name === 'NotAllowedError';
    sync();
    if (wanted) {
      status.textContent = 'Musik akan mulai saat kamu menekan Mulai.';
    } else if (error.name !== 'AbortError') {
      status.textContent = 'Musik belum bisa diputar. Tekan tombol musik untuk mencoba lagi.';
    }
  }
}

button.addEventListener('click', () => {
  autoStartArmed = false;
  removeAutoStart();
  void setEnabled(!wanted);
});

function firstInteraction(event) {
  if (!autoStartArmed || event.target?.closest?.('#musicToggle')) return;
  if (event.type === 'keydown' && (event.repeat || event.ctrlKey || event.metaKey || event.altKey)) return;
  autoStartArmed = false;
  removeAutoStart();
  void setEnabled(true);
}
function removeAutoStart() {
  document.removeEventListener('pointerdown', firstInteraction, true);
  document.removeEventListener('keydown', firstInteraction, true);
  document.removeEventListener('click', firstInteraction, true);
}
document.addEventListener('pointerdown', firstInteraction, true);
document.addEventListener('keydown', firstInteraction, true);
document.addEventListener('click', firstInteraction, true);
for (const event of ['play', 'pause', 'ended']) audio.addEventListener(event, sync);
audio.addEventListener('error', () => {
  ++request;
  wanted = false;
  pending = false;
  sync();
  status.textContent = 'Musik belum bisa dimuat. Tekan tombol musik untuk mencoba lagi.';
});
sync();
void setEnabled(true);
