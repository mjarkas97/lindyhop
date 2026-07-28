<script lang="ts">
  interface Props {
    label:   string
    active:  boolean
    onclick: () => void
  }

  let { label, active, onclick }: Props = $props()
</script>

<button class="chip" type="button" data-active={active} {onclick}>{label}</button>

<style lang="scss">
  @use '$lib/styles/tokens' as *;

  .chip {
    padding: 0.5rem 1rem;
    border: 1px solid $color-border;
    border-radius: 999px;
    background: $color-card;
    color: $color-text-primary;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;

    &[data-active='true'] {
      background: $color-accent;
      border-color: $color-accent;
      color: $color-background;
    }
  }
</style>
