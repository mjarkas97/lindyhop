<script lang="ts">
  import type { Snippet } from 'svelte'

  interface Props {
    title:       string
    submitLabel: string
    /** Resolves once the session cookie is set; the caller then navigates. */
    onsubmit:    (username: string, password: string) => Promise<void>
    /** The link across to the other of login/register. */
    children?:   Snippet
  }

  let { title, submitLabel, onsubmit, children }: Props = $props()

  let username = $state('')
  let password = $state('')
  let busy = $state(false)
  let failure = $state<string | null>(null)

  async function submit(event: SubmitEvent) {
    event.preventDefault()
    if (!username.trim() || !password) {
      failure = 'Bitte fülle alle Felder aus.'
      return
    }

    busy = true
    failure = null
    try {
      await onsubmit(username.trim(), password)
    } catch (err) {
      failure = err instanceof Error ? err.message : 'Etwas ist schiefgelaufen.'
    } finally {
      busy = false
    }
  }
</script>

<form class="auth" onsubmit={submit}>
  <h1 class="auth__title">{title}</h1>

  <label class="field">
    <span class="field__label">Benutzername</span>
    <input
      class="field__input"
      bind:value={username}
      autocapitalize="none"
      autocorrect="off"
      autocomplete="username"
    />
  </label>

  <label class="field">
    <span class="field__label">Passwort</span>
    <input class="field__input" type="password" bind:value={password} autocomplete="current-password" />
  </label>

  {#if failure}
    <span class="field__error">{failure}</span>
  {/if}

  <button class="submit" type="submit" disabled={busy}>
    {busy ? 'Bitte warten …' : submitLabel}
  </button>

  <p class="auth__alt">
    {@render children?.()}
  </p>
</form>

<style lang="scss">
  @use '$lib/styles/tokens' as *;

  .auth {
    display: flex;
    flex-direction: column;
    justify-content: center;
    flex: 1;
    padding: 2rem 1.25rem;

    &__title {
      font-size: 1.5rem;
      font-weight: 700;
    }

    &__alt {
      margin-top: 1.5rem;
      text-align: center;
      color: $color-text-secondary;
      font-size: 0.875rem;
    }
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

      &:focus {
        border-color: $color-accent-dark;
      }
    }

    &__error {
      display: block;
      margin-top: 1.25rem;
      color: $color-error;
      font-size: 0.75rem;
    }
  }

  .submit {
    width: 100%;
    padding: 1rem;
    margin-top: 1.75rem;
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
</style>
