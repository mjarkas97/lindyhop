<script lang="ts">
  import Highlight from './Highlight.svelte'
  import Icon from './Icon.svelte'
  import { ART_LABELS } from '$lib/shared/entry'
  import type { Entry } from '$lib/api/entries'

  interface Props {
    entry:   Entry
    search?: string
  }

  let { entry, search = '' }: Props = $props()

  let tags = $derived(
    entry.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 4)
  )
</script>

<a class="card" href="/entry/{entry.id}">
  <div class="card__head">
    <div class="card__title">
      <span class="card__name"><Highlight text={entry.name} query={search} lines={1} /></span>
      <div class="card__meta">
        <span class="card__art">{ART_LABELS[entry.art]}</span>
        <span class="card__takte">{entry.taktzahl} Takte</span>
      </div>
    </div>
    <span class="card__badge" data-video={entry.video_uri ? 'true' : 'false'}>
      <Icon
        name={entry.video_uri ? 'play' : 'document'}
        size={16}
        color={entry.video_uri ? '#f59e0b' : '#525252'}
      />
    </span>
  </div>

  {#if entry.note}
    <p class="card__note"><Highlight text={entry.note} query={search} lines={2} /></p>
  {/if}

  {#if tags.length > 0}
    <div class="card__tags">
      {#each tags as tag (tag)}
        <span class="card__tag"><Highlight text="#{tag}" query={search} /></span>
      {/each}
    </div>
  {/if}
</a>

<style lang="scss">
  @use '$lib/styles/tokens' as *;

  .card {
    display: block;
    padding: 1rem;
    border: 1px solid $color-border;
    border-radius: 1rem;
    background: $color-card;
    color: inherit;
    text-decoration: none;

    &:active {
      opacity: 0.8;
    }

    &__head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.75rem;
    }

    &__title {
      flex: 1;
      min-width: 0;
    }

    &__name {
      display: block;
      font-size: 1.125rem;
      font-weight: 700;
      color: $color-text-primary;
    }

    &__meta {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-top: 0.25rem;
    }

    &__art {
      color: $color-accent;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    &__takte {
      color: $color-text-secondary;
      font-size: 0.75rem;
    }

    &__badge {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2.25rem;
      height: 2.25rem;
      border-radius: 999px;
      background: $color-background;
    }

    &__note {
      margin: 0.75rem 0 0;
      color: $color-text-secondary;
      font-size: 0.875rem;
      line-height: 1.4;
    }

    &__tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 0.75rem;
    }

    &__tag {
      padding: 0.125rem 0.5rem;
      border: 1px solid $color-border;
      border-radius: 999px;
      background: $color-background;
      color: $color-text-secondary;
      font-size: 0.75rem;
    }
  }
</style>
