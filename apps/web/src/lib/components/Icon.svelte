<script lang="ts" module>
  // Hand-rolled rather than an icon package: only the glyphs the app actually uses.
  export type IconName = keyof typeof PATHS

  const PATHS = {
    search:    'M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14M16.2 16.2 21 21',
    close:     'M6 6 18 18M18 6 6 18',
    clear:     'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18M9 9l6 6M15 9l-6 6',
    user:      'M12 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M5 20c0-3.3 3.1-5.5 7-5.5s7 2.2 7 5.5',
    globe:     'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18M3.5 12h17M12 3.2c2.2 2.4 3.4 5.5 3.4 8.8s-1.2 6.4-3.4 8.8c-2.2-2.4-3.4-5.5-3.4-8.8S9.8 5.6 12 3.2',
    add:       'M12 5v14M5 12h14',
    play:      'M9 5.5 19 12 9 18.5Z',
    document:  'M7 3h7l4 4v14H7ZM14 3v4h4M9.5 12.5h6M9.5 16h4',
    back:      'M15 5 8 12l7 7',
    trash:     'M5 7h14M9.5 7V4.5h5V7M7 7l1 13h8l1-13',
    upload:    'M12 16.5V4.5M7.5 9 12 4.5 16.5 9M4.5 19.5h15',
    videocam:  'M4 7.5h10a1.5 1.5 0 0 1 1.5 1.5v6a1.5 1.5 0 0 1-1.5 1.5H4A1.5 1.5 0 0 1 2.5 15V9A1.5 1.5 0 0 1 4 7.5ZM15.5 11.5l6-3.5v8l-6-3.5Z',
    calendar:  'M4.5 6.5h15v13h-15ZM4.5 10.5h15M8.5 4v4M15.5 4v4',
  } as const

  const FILLED: IconName[] = ['play']
</script>

<script lang="ts">
  interface Props {
    name:   IconName
    size?:  number
    color?: string
  }

  let { name, size = 20, color = 'currentColor' }: Props = $props()

  let filled = $derived(FILLED.includes(name))
</script>

<svg
  class="icon"
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill={filled ? color : 'none'}
  stroke={filled ? 'none' : color}
  stroke-width="1.8"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  <path d={PATHS[name]} />
</svg>

<style lang="scss">
  .icon {
    display: block;
    flex: none;
  }
</style>
