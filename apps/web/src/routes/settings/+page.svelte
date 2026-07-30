<script lang="ts">
  import { goto } from '$app/navigation'
  import Icon from '$lib/components/Icon.svelte'
  import { changePassword, logout } from '$lib/api/auth'
  import { user } from '$lib/stores/user'

  const STATUS_MS = 4000

  let currentPassword = $state('')
  let newPassword = $state('')
  let repeatPassword = $state('')
  let formError = $state<string | null>(null)
  let status = $state<string | null>(null)
  let busy = $state(false)
  let statusTimer: ReturnType<typeof setTimeout> | null = null

  function showStatus(message: string) {
    status = message
    if (statusTimer) clearTimeout(statusTimer)
    statusTimer = setTimeout(() => (status = null), STATUS_MS)
  }

  async function save(event: SubmitEvent) {
    event.preventDefault()
    if (!currentPassword || !newPassword) {
      formError = 'Bitte fülle alle Felder aus.'
      return
    }
    if (newPassword !== repeatPassword) {
      formError = 'Die neuen Passwörter stimmen nicht überein.'
      return
    }

    formError = null
    busy = true
    try {
      await changePassword(currentPassword, newPassword)
      currentPassword = ''
      newPassword = ''
      repeatPassword = ''
      showStatus('Passwort geändert. Andere Geräte wurden abgemeldet.')
    } catch (err) {
      formError = err instanceof Error ? err.message : 'Passwort konnte nicht geändert werden.'
    } finally {
      busy = false
    }
  }

  async function signOut() {
    await logout()
    user.set(null)
    await goto('/login')
  }
</script>

<header class="head">
  <a class="head__action" href="/" aria-label="Zurück">
    <Icon name="back" color="#ffffff" />
  </a>
  <h1 class="head__title">Konto</h1>
  <span class="head__spacer"></span>
</header>

<form class="form" onsubmit={save}>
  <div class="form__fields">
    <h2 class="section">Angemeldet als</h2>
    <p class="account">{$user?.username ?? '…'}</p>

    <h2 class="section section--spaced">Passwort ändern</h2>

    <label class="field">
      <span class="field__label">Aktuelles Passwort</span>
      <input
        class="field__input"
        type="password"
        bind:value={currentPassword}
        autocomplete="current-password"
      />
    </label>

    <label class="field">
      <span class="field__label">Neues Passwort</span>
      <input class="field__input" type="password" bind:value={newPassword} autocomplete="new-password" />
      <span class="field__hint">Mindestens 8 Zeichen.</span>
    </label>

    <label class="field">
      <span class="field__label">Neues Passwort wiederholen</span>
      <input
        class="field__input"
        type="password"
        bind:value={repeatPassword}
        autocomplete="new-password"
      />
    </label>

    {#if formError}
      <span class="field__error">{formError}</span>
    {/if}

    {#if status}
      <p class="status">{status}</p>
    {/if}
  </div>

  <div class="form__actions">
    <button class="submit" type="submit" disabled={busy}>
      {busy ? 'Bitte warten …' : 'Passwort ändern'}
    </button>
    <button class="destructive" type="button" onclick={signOut}>Abmelden</button>
  </div>
</form>

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

  .form {
    display: flex;
    flex: 1;
    flex-direction: column;

    &__fields {
      flex: 1;
      padding: 0 1.25rem 2rem;
    }

    &__actions {
      padding: 0.5rem 1.25rem safe-bottom(1rem);
    }
  }

  .section {
    color: $color-text-secondary;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.15em;

    &--spaced {
      margin-top: 2rem;
    }
  }

  .account {
    margin-top: 0.5rem;
    font-size: 1.125rem;
    font-weight: 700;
  }

  .field {
    display: block;
    margin-top: 1.25rem;

    &__label {
      display: block;
      margin-bottom: 0.5rem;
      color: $color-text-secondary;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.15em;
    }

    &__input {
      display: block;
      width: 100%;
      padding: 0.75rem 1rem;
      border: 1px solid $color-border;
      border-radius: 0.75rem;
      background: $color-card;
      color: $color-text-primary;
      outline: none;

      &::placeholder {
        color: $color-text-muted;
      }

      &:focus {
        border-color: $color-accent-dark;
      }
    }

    &__hint {
      display: block;
      margin-top: 0.5rem;
      color: $color-text-muted;
      font-size: 0.75rem;
    }

    &__error {
      display: block;
      margin-top: 1.25rem;
      color: $color-error;
      font-size: 0.75rem;
    }
  }

  .status {
    margin-top: 1.25rem;
    padding: 0.75rem 1rem;
    border: 1px solid $color-border;
    border-radius: 0.75rem;
    background: $color-card;
    font-size: 0.875rem;
  }

  .submit {
    width: 100%;
    padding: 1rem;
    border: none;
    border-radius: 1rem;
    background: $color-accent;
    color: $color-background;
    font-size: 1rem;
    font-weight: 700;
    cursor: pointer;

    &:disabled {
      opacity: 0.6;
      cursor: default;
    }
  }

  .destructive {
    width: 100%;
    padding: 0.75rem;
    margin-top: 0.75rem;
    border: none;
    background: none;
    color: $color-error;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
  }
</style>
