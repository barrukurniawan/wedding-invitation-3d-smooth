<script lang="ts">
  import { guestGender, setGuestGender, setHasStarted } from '../../stores/gameState.svelte'
</script>

<div class="welcome-screen">
  <div class="content-box">
    <h1>Undangan Siap</h1>
    <p>Silakan pilih karakter tamu Anda sebelum memasuki acara.</p>
    
    <div class="gender-selection">
      <div class="toggle-group">
        <button 
          class="toggle-btn" 
          class:active={$guestGender === 'male'} 
          onclick={() => setGuestGender('male')}
          aria-pressed={$guestGender === 'male'}
        >
          <span class="icon">👨</span> Pria
        </button>
        <button 
          class="toggle-btn" 
          class:active={$guestGender === 'female'} 
          onclick={() => setGuestGender('female')}
          aria-pressed={$guestGender === 'female'}
        >
          <span class="icon">👩</span> Wanita
        </button>
      </div>
    </div>
    
    <button class="start-btn" onclick={() => setHasStarted(true)}>Masuk ke Acara</button>
  </div>
</div>

<style>
  .welcome-screen {
    position: absolute;
    inset: 0;
    z-index: 50;
    display: grid;
    place-content: center;
    padding: 2rem;
    background: linear-gradient(160deg, #fff8ef 0%, #fbe6d8 55%, #f3cdbf 100%);
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }
  
  .content-box {
    background: rgba(255, 255, 255, 0.7);
    -webkit-backdrop-filter: blur(12px);
    backdrop-filter: blur(12px);
    padding: 2.5rem 2rem;
    border-radius: 1.5rem;
    border: 1px solid rgba(255,255,255,0.8);
    box-shadow: 0 12px 32px rgba(113, 54, 69, 0.1);
    text-align: center;
    max-width: 24rem;
    width: 100%;
  }
  
  h1 {
    margin: 0;
    color: #713645;
    font: 600 2rem/1.2 'Playfair Display', Georgia, serif;
  }
  
  p {
    margin: 0.75rem 0 2rem;
    color: #806e72;
    font-size: 0.95rem;
    line-height: 1.5;
  }
  
  .gender-selection {
    margin-bottom: 2.5rem;
  }
  
  .toggle-group {
    display: inline-flex;
    background: rgba(255, 255, 255, 0.6);
    border-radius: 99px;
    padding: 0.35rem;
    border: 1px solid rgba(113, 54, 69, 0.15);
    gap: 0.25rem;
  }
  
  .toggle-btn {
    border: none;
    background: transparent;
    padding: 0.65rem 1.5rem;
    border-radius: 99px;
    font-family: inherit;
    font-weight: 600;
    font-size: 1rem;
    color: #713645;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .toggle-btn .icon {
    font-size: 1.2rem;
  }
  
  .toggle-btn.active {
    background: #fff;
    color: #c44565;
    box-shadow: 0 4px 12px rgba(113, 54, 69, 0.12);
    transform: scale(1.02);
  }
  
  .start-btn {
    width: 100%;
    border: none;
    border-radius: 99px;
    background: #713645;
    color: white;
    padding: 1rem;
    font: 600 1.1rem/1 Outfit, system-ui, sans-serif;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(113, 54, 69, 0.2);
    transition: all 0.2s;
  }
  
  .start-btn:hover {
    background: #5b2a36;
    transform: translateY(-2px);
  }
  
  .start-btn:active {
    transform: translateY(0);
  }
</style>
