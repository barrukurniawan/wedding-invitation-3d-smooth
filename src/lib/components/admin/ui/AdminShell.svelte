<script lang="ts" generics="T extends string">
  import type { Snippet } from 'svelte'
  import Icon, { type IconName } from './Icon.svelte'

  type Menu = { id: T; label: string; icon: IconName }

  let {
    menus,
    active,
    onSelect,
    subtitle,
    refreshing = false,
    onRefresh,
    onSignOut,
    children,
  }: {
    menus: readonly Menu[]
    active: T
    onSelect: (id: T) => void
    subtitle: string
    refreshing?: boolean
    onRefresh: () => void
    onSignOut: () => void
    children: Snippet
  } = $props()

  function greeting(hour: number) {
    if (hour < 11) return 'Selamat pagi'
    if (hour < 15) return 'Selamat siang'
    if (hour < 18) return 'Selamat sore'
    return 'Selamat malam'
  }
  const hello = greeting(new Date().getHours())

  // Di layar sempit nav bisa di-scroll; pastikan menu aktif selalu terlihat.
  let nav = $state<HTMLElement | null>(null)
  $effect(() => {
    void active
    nav?.querySelector<HTMLElement>('.adm-nav-btn.active')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  })
</script>

<div class="adm-frame">
  <header class="adm-top">
    <div class="adm-logo">
      <span class="adm-logo-mark">M</span>
      <span>MarryMe <small>Admin</small></span>
    </div>

    <nav class="adm-nav" aria-label="Menu admin" bind:this={nav}>
      {#each menus as menu (menu.id)}
        <button
          type="button"
          class="adm-nav-btn"
          class:active={active === menu.id}
          aria-current={active === menu.id ? 'page' : undefined}
          onclick={() => onSelect(menu.id)}
        >
          {menu.label}
        </button>
      {/each}
    </nav>

    <div class="adm-top-actions">
      <button type="button" class="adm-iconbtn" class:spinning={refreshing} title="Muat ulang data" aria-label="Muat ulang data" disabled={refreshing} onclick={onRefresh}>
        <Icon name="refresh" />
      </button>
      <a class="adm-iconbtn" href="/" target="_blank" rel="noreferrer" title="Buka marryme.web.id" aria-label="Buka marryme.web.id">
        <Icon name="external" />
      </a>
      <div class="adm-user">
        <span class="adm-avatar">A</span>
        <span class="adm-user-text">
          <strong>Admin</strong>
          <span>Pengelola platform</span>
        </span>
      </div>
      <button type="button" class="adm-iconbtn" title="Keluar" aria-label="Keluar" onclick={onSignOut}>
        <Icon name="logout" />
      </button>
    </div>
  </header>

  <div class="adm-body">
    <aside class="adm-rail" aria-label="Pintasan menu">
      {#each menus as menu (menu.id)}
        <button
          type="button"
          class="adm-rail-btn"
          class:active={active === menu.id}
          title={menu.label}
          aria-label={menu.label}
          onclick={() => onSelect(menu.id)}
        >
          <Icon name={menu.icon} />
        </button>
      {/each}
      <span class="adm-rail-sep"></span>
      <button type="button" class="adm-rail-btn" title="Keluar" aria-label="Keluar" onclick={onSignOut}>
        <Icon name="logout" />
      </button>
    </aside>

    <main class="adm-main">
      <div class="adm-hello">
        <h1>{hello}, Admin</h1>
        <p>{subtitle}</p>
      </div>
      {@render children()}
    </main>
  </div>
</div>
