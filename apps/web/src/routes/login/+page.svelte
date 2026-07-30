<script lang="ts">
  import AuthForm from '$lib/components/AuthForm.svelte'
  import { login, registrationOpen } from '$lib/api/auth'
  import { loadUser } from '$lib/stores/user'
  import { goto } from '$app/navigation'

  // Hiding the link when signups are closed is cosmetic — the endpoint enforces
  // it — but a dead link that 403s is worse than no link.
  let canRegister = $state(false)
  $effect(() => {
    void registrationOpen().then((open) => (canRegister = open))
  })

  async function submit(username: string, password: string) {
    await login(username, password)
    await loadUser()
    await goto('/')
  }
</script>

<AuthForm title="Anmelden" submitLabel="Anmelden" onsubmit={submit}>
  {#if canRegister}
    Noch kein Konto? <a href="/register">Registrieren</a>
  {/if}
</AuthForm>

<style lang="scss">
  @use '$lib/styles/tokens' as *;

  a {
    color: $color-accent;
    font-weight: 600;
  }
</style>
