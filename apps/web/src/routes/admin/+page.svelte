<script lang="ts">
  import Icon from '$lib/components/Icon.svelte'
  import Segmented from '$lib/components/Segmented.svelte'
  import {
    actOnUser,
    getOverview,
    setRegistrationOpen,
    type AdminOverview,
    type AdminUser,
    type UserAction,
  } from '$lib/api/admin'
  import { user } from '$lib/stores/user'

  const REGISTRATION_OPTIONS = [
    { value: true, label: 'Offen' },
    { value: false, label: 'Geschlossen' },
  ]

  let overview = $state<AdminOverview | null>(null)
  let failure = $state<string | null>(null)
  let busy = $state<number | null>(null)

  $effect(() => {
    void load()
  })

  async function load() {
    try {
      overview = await getOverview()
      failure = null
    } catch (err) {
      failure = err instanceof Error ? err.message : 'Konnte nicht geladen werden.'
    }
  }

  async function toggleRegistration(open: boolean) {
    try {
      await setRegistrationOpen(open)
      await load()
    } catch (err) {
      failure = err instanceof Error ? err.message : 'Änderung fehlgeschlagen.'
    }
  }

  async function act(target: AdminUser, action: UserAction) {
    if (action === 'delete') {
      const what = target.entries === 1 ? '1 Eintrag' : `${target.entries} Einträge`
      if (!confirm(`„${target.username}" und ${what} endgültig löschen?`)) return
    }
    if (action === 'logout' && !confirm(`„${target.username}" auf allen Geräten abmelden?`)) return

    busy = target.id
    failure = null
    try {
      await actOnUser(target.id, action)
      await load()
    } catch (err) {
      failure = err instanceof Error ? err.message : 'Aktion fehlgeschlagen.'
    } finally {
      busy = null
    }
  }

  function bytes(n: number): string {
    if (n === 0) return '0 MB'
    const mb = n / 1024 / 1024
    if (mb < 1024) return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`
    return `${(mb / 1024).toFixed(1)} GB`
  }

  function date(ms: number): string {
    return new Date(ms).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  function lastSeen(ms: number | null): string {
    if (ms === null) return 'lange her'
    const days = Math.floor((Date.now() - ms) / 86_400_000)
    if (days <= 0) return 'heute'
    if (days === 1) return 'gestern'
    if (days < 30) return `vor ${days} Tagen`
    return date(ms)
  }
</script>

<header class="head">
  <a class="head__action" href="/settings" aria-label="Zurück">
    <Icon name="back" color="#ffffff" />
  </a>
  <h1 class="head__title">Verwaltung</h1>
  <span class="head__spacer"></span>
</header>

{#if failure}
  <p class="failure">{failure}</p>
{/if}

{#if !overview}
  <p class="notice">Lädt …</p>
{:else}
  <section class="block">
    <h2 class="block__label">Instanz</h2>
    <dl class="stats">
      <div class="stats__item">
        <dt>Nutzer</dt>
        <dd>{overview.stats.users}</dd>
      </div>
      <div class="stats__item">
        <dt>Einträge</dt>
        <dd>{overview.stats.entries}</dd>
      </div>
      <div class="stats__item">
        <dt>Öffentlich</dt>
        <dd>{overview.stats.public_entries}</dd>
      </div>
      <div class="stats__item">
        <dt>Videos</dt>
        <dd>{overview.stats.videos}</dd>
      </div>
      <div class="stats__item">
        <dt>Speicher</dt>
        <dd>{bytes(overview.stats.storage)}</dd>
      </div>
    </dl>
  </section>

  <section class="block">
    <h2 class="block__label">Registrierung</h2>
    <Segmented
      options={REGISTRATION_OPTIONS}
      value={overview.registrationOpen}
      onchange={toggleRegistration}
    />
    <p class="hint">
      {overview.registrationOpen
        ? 'Jede Person mit der Adresse kann ein Konto anlegen.'
        : 'Neue Konten können nicht angelegt werden.'}
    </p>
  </section>

  <section class="block">
    <h2 class="block__label">Nutzer</h2>
    <ul class="users">
      {#each overview.users as row (row.id)}
        <li class="user" data-busy={busy === row.id}>
          <div class="user__head">
            <span class="user__name">
              {row.username}
              {#if row.is_admin}<span class="badge">Admin</span>{/if}
              {#if row.id === $user?.id}<span class="badge badge--self">Du</span>{/if}
            </span>
          </div>

          <p class="user__meta">
            Seit {date(row.created_at)} · zuletzt {lastSeen(row.last_seen)}
          </p>
          <p class="user__meta">
            {row.entries}
            {row.entries === 1 ? 'Eintrag' : 'Einträge'} ({row.public_entries} öffentlich) ·
            {row.videos} Videos · {bytes(row.storage)}
          </p>

          <div class="user__actions">
            {#if row.is_admin}
              <button type="button" onclick={() => act(row, 'demote')}>Admin entziehen</button>
            {:else}
              <button type="button" onclick={() => act(row, 'promote')}>Zum Admin machen</button>
            {/if}
            <button type="button" onclick={() => act(row, 'logout')}>Abmelden</button>
            {#if row.id !== $user?.id}
              <button class="danger" type="button" onclick={() => act(row, 'delete')}>Löschen</button>
            {/if}
          </div>
        </li>
      {/each}
    </ul>
  </section>
{/if}

<style lang="scss">
  @use '$lib/styles/tokens' as *;

  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
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
      cursor: pointer;
    }

    &__title {
      font-size: 1rem;
      font-weight: 700;
    }

    &__spacer {
      width: 2.5rem;
    }
  }

  .notice,
  .failure {
    padding: 2rem 1.25rem;
    text-align: center;
    color: $color-text-secondary;
  }

  .failure {
    padding: 0 1.25rem 1rem;
    color: $color-error;
    font-size: 0.875rem;
    text-align: left;
  }

  .block {
    padding: 0 1.25rem 2rem;

    &__label {
      margin: 0 0 0.75rem;
      color: $color-text-secondary;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.15em;
    }
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(6rem, 1fr));
    gap: 0.5rem;
    margin: 0;

    &__item {
      padding: 0.75rem;
      border: 1px solid $color-border;
      border-radius: 0.75rem;
      background: $color-card;

      dt {
        color: $color-text-muted;
        font-size: 0.6875rem;
        text-transform: uppercase;
        letter-spacing: 0.1em;
      }

      dd {
        margin: 0.25rem 0 0;
        font-size: 1.125rem;
        font-weight: 700;
      }
    }
  }

  .hint {
    margin: 0.75rem 0 0;
    color: $color-text-muted;
    font-size: 0.75rem;
  }

  .users {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .user {
    padding: 1rem;
    border: 1px solid $color-border;
    border-radius: 0.75rem;
    background: $color-card;

    &[data-busy='true'] {
      opacity: 0.5;
    }

    &__name {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 700;
    }

    &__meta {
      margin: 0.5rem 0 0;
      color: $color-text-secondary;
      font-size: 0.75rem;
    }

    &__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 0.875rem;

      button {
        padding: 0.375rem 0.75rem;
        border: 1px solid $color-border;
        border-radius: 999px;
        background: transparent;
        color: $color-text-primary;
        font-size: 0.75rem;
        font-weight: 600;
        cursor: pointer;

        &.danger {
          color: $color-error;
        }
      }
    }
  }

  .badge {
    padding: 0.125rem 0.5rem;
    border-radius: 999px;
    background: $color-accent;
    color: $color-background;
    font-size: 0.625rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;

    &--self {
      background: $color-border;
      color: $color-text-secondary;
    }
  }
</style>
