<script lang="ts">
  import AuthForm from '$lib/components/AuthForm.svelte'
  import { register, registrationOpen } from '$lib/api/auth'
  import { loadUser } from '$lib/stores/user'
  import { goto } from '$app/navigation'

  // null while we do not know yet, so the form does not flash before turning out
  // to be closed.
  let open = $state<boolean | null>(null)
  $effect(() => {
    void registrationOpen().then((value) => (open = value))
  })

  async function submit(username: string, password: string) {
    await register(username, password)
    await loadUser()
    await goto('/')
  }
</script>

{#if open === null}
  <p class="notice">Lädt …</p>
{:else if open}
  <AuthForm title="Registrieren" submitLabel="Konto erstellen" onsubmit={submit}>
    Schon ein Konto? <a href="/login">Anmelden</a>
  </AuthForm>
{:else}
  <div class="closed">
    <p class="closed__emoji">🔒</p>
    <h1 class="closed__title">Registrierung geschlossen</h1>
    <p class="closed__hint">
      Diese Instanz nimmt derzeit keine neuen Konten an. Wende dich an die Person, die sie betreibt.
    </p>
    <a class="closed__link" href="/login">Zur Anmeldung</a>
  </div>
{/if}

<style lang="scss">
  @use '$lib/styles/tokens' as *;

  a {
    color: $color-accent;
    font-weight: 600;
  }

  .notice {
    padding: 2rem 1.25rem;
    text-align: center;
    color: $color-text-secondary;
  }

  .closed {
    display: flex;
    flex: 1;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem 1.5rem;
    text-align: center;

    &__emoji {
      margin: 0;
      font-size: 3rem;
    }

    &__title {
      margin: 0.75rem 0 0;
      font-size: 1.125rem;
      font-weight: 600;
    }

    &__hint {
      margin: 0.5rem 0 0;
      max-width: 22rem;
      color: $color-text-secondary;
      font-size: 0.875rem;
      line-height: 1.6;
    }

    &__link {
      margin-top: 1.75rem;
    }
  }
</style>
