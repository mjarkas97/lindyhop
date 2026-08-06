<script lang="ts">
  import Icon from '$lib/components/Icon.svelte'
  import { deletePractice, listPractice, type PracticeSession } from '$lib/api/practice'
  import { dayHeading, streak, toInputDate } from '$lib/day'
  import { reload } from '$lib/stores/entries'
  import { ART_LABELS } from '$lib/shared/entry'

  let sessions = $state<PracticeSession[]>([])
  let loaded = $state(false)
  let error = $state<string | null>(null)

  $effect(() => {
    void load()
  })

  async function load() {
    try {
      sessions = await listPractice()
      error = null
    } catch (err) {
      error = err instanceof Error ? err.message : 'Historie konnte nicht geladen werden.'
    } finally {
      loaded = true
    }
  }

  // Sessions arrive newest first, so consecutive rows of the same day are
  // already adjacent and one pass is enough.
  let groups = $derived.by(() => {
    const out: { key: string; heading: string; items: PracticeSession[] }[] = []
    for (const session of sessions) {
      const key = toInputDate(session.practiced_at)
      const current = out[out.length - 1]
      if (current?.key === key) current.items.push(session)
      else out.push({ key, heading: dayHeading(session.practiced_at), items: [session] })
    }
    return out
  })

  let days = $derived(streak(sessions.map((s) => s.practiced_at)))

  async function remove(session: PracticeSession) {
    if (!confirm('Diese Übung wirklich entfernen?')) return
    await deletePractice(session.id)
    await load()
    // The counts on the dashboard came from the same rows.
    reload()
  }
</script>

<header class="head">
  <a class="head__action" href="/" aria-label="Zurück">
    <Icon name="back" color="#ffffff" />
  </a>
  <div>
    <p class="head__eyebrow">Übungen</p>
    <h1 class="head__title">Deine Historie</h1>
  </div>
  <span class="head__spacer"></span>
</header>

{#if loaded && sessions.length > 0}
  <div class="stats">
    <div class="stats__item">
      <span class="stats__value">{days}</span>
      <span class="stats__label">{days === 1 ? 'Tag am Stück' : 'Tage am Stück'}</span>
    </div>
    <div class="stats__item">
      <span class="stats__value">{sessions.length}</span>
      <span class="stats__label">{sessions.length === 1 ? 'Übung' : 'Übungen'}</span>
    </div>
  </div>
{/if}

{#if error}
  <p class="state state__error">{error}</p>
{:else if !loaded}
  <p class="state">Lädt …</p>
{:else if sessions.length === 0}
  <div class="state">
    <p class="state__emoji">🕺</p>
    <p class="state__title">Noch nichts geübt</p>
    <p class="state__hint">Öffne einen Eintrag und tippe auf „Geübt".</p>
  </div>
{:else}
  {#each groups as group (group.key)}
    <section class="day">
      <h2 class="day__heading">{group.heading}</h2>
      <ul class="day__list">
        {#each group.items as session (session.id)}
          <li class="session">
            <div class="session__body">
              <!-- A shared entry can have been made private since; then there is
                   nothing left to open, only the record that you practised it. -->
              {#if session.readable}
                <a class="session__name" href="/entry/{session.entry_id}">{session.entry_name}</a>
              {:else}
                <span class="session__name" data-gone="true">{session.entry_name}</span>
              {/if}
              <span class="session__art">{ART_LABELS[session.art]}</span>
              {#if session.note}<p class="session__note">{session.note}</p>{/if}
            </div>
            <button
              class="session__remove"
              type="button"
              onclick={() => remove(session)}
              aria-label="Übung entfernen"
            >
              <Icon name="trash" size={16} color="#525252" />
            </button>
          </li>
        {/each}
      </ul>
    </section>
  {/each}
{/if}

<style lang="scss">
  @use '$lib/styles/tokens' as *;

  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.75rem 1.25rem 1rem;

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

    &__spacer {
      width: 2.5rem;
      flex: none;
    }
  }

  .stats {
    display: flex;
    gap: 0.75rem;
    margin: 0 1.25rem;

    &__item {
      flex: 1;
      padding: 1rem;
      border: 1px solid $color-border;
      border-radius: 1rem;
      background: $color-card;
      text-align: center;
    }

    &__value {
      display: block;
      color: $color-accent;
      font-size: 1.5rem;
      font-weight: 700;
    }

    &__label {
      display: block;
      margin-top: 0.25rem;
      color: $color-text-secondary;
      font-size: 0.75rem;
    }
  }

  .day {
    margin: 1.5rem 1.25rem 0;

    &:last-of-type {
      padding-bottom: safe-bottom(2rem);
    }

    &__heading {
      margin-bottom: 0.5rem;
      color: $color-text-muted;
      font-size: 0.625rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.15em;
    }

    &__list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }
  }

  .session {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 0.875rem 1rem;
    border: 1px solid $color-border;
    border-radius: 0.75rem;
    background: $color-card;

    &__body {
      flex: 1;
      min-width: 0;
    }

    &__name {
      display: block;
      color: $color-text-primary;
      font-weight: 600;
      text-decoration: none;
      overflow-wrap: anywhere;

      &[data-gone='true'] {
        color: $color-text-muted;
      }
    }

    &__art {
      display: block;
      margin-top: 0.125rem;
      color: $color-accent;
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    &__note {
      margin: 0.5rem 0 0;
      color: $color-text-secondary;
      font-size: 0.8125rem;
      overflow-wrap: anywhere;
    }

    &__remove {
      display: flex;
      flex: none;
      padding: 0.25rem;
      border: none;
      background: none;
      cursor: pointer;
    }
  }

  .state {
    margin-top: 4rem;
    padding: 0 1.5rem safe-bottom(4rem);
    text-align: center;
    color: $color-text-secondary;

    &__emoji {
      margin: 0 0 0.75rem;
      font-size: 3rem;
    }

    &__title {
      margin: 0;
      color: $color-text-primary;
      font-size: 1rem;
      font-weight: 600;
    }

    &__hint {
      margin-top: 0.5rem;
      font-size: 0.875rem;
    }

    &__error {
      color: $color-error;
    }
  }
</style>
