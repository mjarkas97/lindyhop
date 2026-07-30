<script lang="ts" generics="T extends string | number | boolean">
  interface Option {
    value: T
    label: string
  }

  interface Props {
    options:  Option[]
    value:    T
    onchange: (next: T) => void
  }

  let { options, value, onchange }: Props = $props()
</script>

<div class="segmented">
  {#each options as option (option.value)}
    <button
      class="segmented__option"
      type="button"
      data-active={option.value === value}
      onclick={() => onchange(option.value)}
    >
      {option.label}
    </button>
  {/each}
</div>

<style lang="scss">
  @use '$lib/styles/tokens' as *;

  .segmented {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;

    &__option {
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
  }
</style>
