<script lang="ts">
  import AuthForm from '$lib/components/AuthForm.svelte'
  import { register } from '$lib/api/auth'
  import { loadUser } from '$lib/stores/user'
  import { goto } from '$app/navigation'

  async function submit(username: string, password: string) {
    await register(username, password)
    await loadUser()
    await goto('/')
  }
</script>

<AuthForm title="Registrieren" submitLabel="Konto erstellen" onsubmit={submit}>
  Schon ein Konto? <a href="/login">Anmelden</a>
</AuthForm>

<style lang="scss">
  @use '$lib/styles/tokens' as *;

  a {
    color: $color-accent;
    font-weight: 600;
  }
</style>
