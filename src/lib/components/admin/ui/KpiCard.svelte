<script lang="ts">
  import Icon, { type IconName } from './Icon.svelte'

  let {
    label,
    value,
    icon,
    note = '',
    badge = '',
    badgeTone = '',
    hero = false,
  }: {
    label: string
    value: string | number
    icon: IconName
    note?: string
    badge?: string
    badgeTone?: '' | 'green' | 'amber' | 'red' | 'rose'
    hero?: boolean
  } = $props()
</script>

<div class="adm-kpi" class:hero>
  <span class="adm-kpi-label">{label}</span>
  <span class="adm-kpi-icon"><Icon name={icon} size={16} /></span>
  <span class="adm-kpi-value">{value}</span>
  {#if badge || note}
    <span class="adm-kpi-foot">
      {#if badge}<span class="adm-pill {hero ? 'on-dark' : badgeTone}">{badge}</span>{/if}
      {#if note}<span>{note}</span>{/if}
    </span>
  {/if}
</div>
