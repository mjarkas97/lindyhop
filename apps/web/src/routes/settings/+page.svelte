<script lang="ts">
  import Icon from '$lib/components/Icon.svelte'
  import { clearConfig, loadConfig, saveConfig } from '$lib/nextcloud'

  const STATUS_MS = 4000

  const stored = loadConfig()

  let serverUrl = $state(stored?.serverUrl ?? '')
  let username = $state(stored?.username ?? '')
  let password = $state(stored?.password ?? '')
  let formError = $state<string | null>(null)
  let status = $state<string | null>(null)
  let statusTimer: ReturnType<typeof setTimeout> | null = null

  let isConfigured = $derived(serverUrl.trim() !== '' && username.trim() !== '')

  function showStatus(message: string) {
    status = message
    if (statusTimer) clearTimeout(statusTimer)
    statusTimer = setTimeout(() => (status = null), STATUS_MS)
  }

  function save(event: SubmitEvent) {
    event.preventDefault()
    if (!serverUrl.trim() || !username.trim() || !password.trim()) {
      formError = 'Bitte fülle alle Felder aus.'
      return
    }
    formError = null
    saveConfig({ serverUrl: serverUrl.trim(), username: username.trim(), password })
    showStatus('Einstellungen gespeichert')
  }

  function clear() {
    if (!confirm('Zugangsdaten entfernen? Dies löscht nur die gespeicherte Server-Konfiguration, nicht deine lokalen Daten.')) return
    clearConfig()
    serverUrl = ''
    username = ''
    password = ''
    formError = null
    showStatus('Zugangsdaten entfernt')
  }
</script>

<header class="head">
  <a class="head__action" href="/" aria-label="Zurück">
    <Icon name="back" color="#ffffff" />
  </a>
  <h1 class="head__title">NextCloud Sync</h1>
  <span class="head__spacer"></span>
</header>

<form class="form" onsubmit={save}>
  <div class="form__fields">
    <h2 class="section">Server-Verbindung</h2>

    <label class="field">
      <span class="field__label">Server-URL</span>
      <input
        class="field__input"
        type="url"
        inputmode="url"
        bind:value={serverUrl}
        placeholder="https://nextcloud.example.com"
        autocapitalize="none"
        autocorrect="off"
      />
    </label>

    <label class="field">
      <span class="field__label">Benutzername</span>
      <input
        class="field__input"
        bind:value={username}
        placeholder="Benutzername"
        autocapitalize="none"
        autocorrect="off"
        autocomplete="username"
      />
    </label>

    <label class="field">
      <span class="field__label">Passwort / App-Passwort</span>
      <input
        class="field__input"
        type="password"
        bind:value={password}
        placeholder="Passwort"
        autocomplete="current-password"
      />
      <span class="field__hint">
        Nutze ein NextCloud App-Passwort — es wird unverschlüsselt in diesem Browser gespeichert
        und lässt sich jederzeit widerrufen.
      </span>
    </label>

    {#if formError}
      <span class="field__error">{formError}</span>
    {/if}

    {#if status}
      <p class="status">{status}</p>
    {/if}
  </div>

  <div class="form__actions">
    <button class="submit" type="submit">Speichern</button>
    {#if isConfigured}
      <button class="destructive" type="button" onclick={clear}>Zugangsdaten entfernen</button>
    {/if}
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
