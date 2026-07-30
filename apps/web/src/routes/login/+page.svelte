<script lang="ts">
  import AuthForm from '$lib/components/AuthForm.svelte'
  import { login } from '$lib/api/auth'
  import { loadUser } from '$lib/stores/user'
  import { goto } from '$app/navigation'

  async function submit(username: string, password: string) {
    await login(username, password)
    await loadUser()
    await goto('/')
  }
</script>

<AuthForm title="Anmelden" submitLabel="Anmelden" onsubmit={submit}>
  Noch kein Konto? <a href="/register">Registrieren</a>
</AuthForm>

<style lang="scss">
  @use '$lib/styles/tokens' as *;

  a {
    color: $color-accent;
    font-weight: 600;
  }
</style>
