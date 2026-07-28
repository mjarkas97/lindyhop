<script lang="ts">
  import EntryCard from '$lib/components/EntryCard.svelte'
  import FilterChip from '$lib/components/FilterChip.svelte'
  import Icon from '$lib/components/Icon.svelte'
  import { entries, error, options } from '$lib/stores/entries'
  import { ART_LABELS, ART_VALUES, type Art } from '$lib/db/schema'
  import type { SortOrder } from '$lib/db/queries'

  const SORTS: { value: SortOrder; label: string }[] = [
    { value: 'newest',   label: 'Neueste' },
    { value: 'oldest',   label: 'Älteste' },
    { value: 'name',     label: 'Name A-Z' },
    { value: 'taktzahl', label: 'Takte' },
  ]

  let search = $state('')
  let art = $state<Art | null>(null)
  let sort = $state<SortOrder>('newest')

  let hasFilters = $derived(search.trim() !== '' || art !== null)

  $effect(() => {
    options.set({ search, art, sort })
  })

  function resetFilters() {
    search = ''
    art = null
  }
</script>

<header class="head">
  <div>
    <p class="head__eyebrow">LindyHop</p>
    <h1 class="head__title">Deine Einträge</h1>
  </div>
  <a class="head__action" href="/settings" aria-label="Sync-Einstellungen">
    <Icon name="cloud" color="#a3a3a3" />
  </a>
</header>

<div class="search">
  <Icon name="search" size={16} color="#a3a3a3" />
  <input
    class="search__input"
    type="search"
    bind:value={search}
    placeholder="Suchen in Name, Tags, Notiz …"
    autocapitalize="none"
    autocorrect="off"
  />
  {#if search.length > 0}
    <button class="search__clear" type="button" onclick={() => (search = '')} aria-label="Suche leeren">
      <Icon name="clear" size={18} color="#525252" />
    </button>
  {/if}
</div>

<section class="filters">
  <h2 class="filters__label">Art</h2>
  <div class="filters__row">
    <FilterChip label="Alle" active={art === null} onclick={() => (art = null)} />
    {#each ART_VALUES as value (value)}
      <FilterChip
        label={ART_LABELS[value]}
        active={art === value}
        onclick={() => (art = art === value ? null : value)}
      />
    {/each}
  </div>
</section>

<section class="filters">
  <h2 class="filters__label">Sortierung</h2>
  <div class="filters__row">
    {#each SORTS as option (option.value)}
      <FilterChip
        label={option.label}
        active={sort === option.value}
        onclick={() => (sort = option.value)}
      />
    {/each}
  </div>
</section>

<div class="count">
  <span class="count__text">
    {$entries.length}
    {$entries.length === 1 ? 'Eintrag' : 'Einträge'}
  </span>
  {#if hasFilters}
    <button class="count__reset" type="button" onclick={resetFilters}>Filter zurücksetzen</button>
  {/if}
</div>

{#if $error}
  <p class="state state__error">{$error}</p>
{:else if $entries.length === 0}
  <div class="state">
    <p class="state__emoji">{hasFilters ? '🔎' : '💃'}</p>
    <p class="state__title">{hasFilters ? 'Keine Treffer' : 'Noch keine Einträge'}</p>
    <p class="state__hint">
      {hasFilters
        ? 'Passe Suche oder Filter an, um mehr zu sehen.'
        : 'Tippe auf das Plus, um deinen ersten Eintrag zu erstellen.'}
    </p>
  </div>
{:else}
  <ul class="list">
    {#each $entries as entry (entry.id)}
      <li><EntryCard {entry} {search} /></li>
    {/each}
  </ul>
{/if}

<a class="fab" href="/entry/new" aria-label="Neuer Eintrag">
  <Icon name="add" size={28} color="#0a0a0a" />
</a>

<style lang="scss">
  @use '$lib/styles/tokens' as *;

  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem 0.75rem;

    &__eyebrow {
      margin: 0;
      color: $color-text-secondary;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.15em;
    }

    &__title {
      margin-top: 0.25rem;
      font-size: 1.5rem;
      font-weight: 700;
    }

    &__action {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2.5rem;
      height: 2.5rem;
      border: 1px solid $color-border;
      border-radius: 999px;
      background: $color-card;
      flex: none;
    }
  }

  .search {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0 1.25rem;
    padding: 0 0.75rem;
    border: 1px solid $color-border;
    border-radius: 0.75rem;
    background: $color-card;

    &__input {
      flex: 1;
      min-width: 0;
      padding: 0.75rem 0;
      border: none;
      background: none;
      color: $color-text-primary;
      outline: none;

      &::placeholder {
        color: $color-text-muted;
      }

      // Chrome draws its own clear button on type=search; we ship one.
      &::-webkit-search-cancel-button {
        display: none;
      }
    }

    &__clear {
      display: flex;
      padding: 0;
      border: none;
      background: none;
      cursor: pointer;
    }
  }

  .filters {
    margin: 1rem 1.25rem 0;

    &__label {
      margin-bottom: 0.5rem;
      color: $color-text-muted;
      font-size: 0.625rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.15em;
    }

    &__row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
  }

  .count {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1.25rem 0.25rem;

    &__text {
      color: $color-text-muted;
      font-size: 0.75rem;
      font-weight: 600;
    }

    &__reset {
      padding: 0;
      border: none;
      background: none;
      color: $color-accent;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
    }
  }

  .list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin: 0;
    padding: 0.5rem 1.25rem safe-bottom(6rem);
    list-style: none;
  }

  .state {
    margin-top: 4rem;
    padding: 0 1.5rem safe-bottom(6rem);
    text-align: center;

    &__emoji {
      margin: 0 0 0.75rem;
      font-size: 3rem;
    }

    &__title {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
    }

    &__hint {
      margin-top: 0.5rem;
      color: $color-text-secondary;
      font-size: 0.875rem;
    }

    &__error {
      color: $color-error;
    }
  }

  .fab {
    position: fixed;
    right: 1.25rem;
    bottom: safe-bottom(1rem);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 3.5rem;
    height: 3.5rem;
    border-radius: 999px;
    background: $color-accent;
    box-shadow: 0 8px 24px rgb(0 0 0 / 45%);

    &:active {
      opacity: 0.8;
    }
  }
</style>
