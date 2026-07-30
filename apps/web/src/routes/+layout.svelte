<script lang="ts">
  import '$lib/styles/global.scss'
  import { page } from '$app/state'
  import { loadUser } from '$lib/stores/user'

  let { children } = $props()

  // /login and /register are the only pages reachable without a session, so
  // asking who we are there would just 401.
  const ANONYMOUS = ['/login', '/register']

  $effect(() => {
    if (ANONYMOUS.includes(page.url.pathname)) return
    void loadUser()
  })
</script>

<div class="app">
  <main class="app__main">
    {@render children()}
  </main>
</div>

<style lang="scss">
  @use '$lib/styles/tokens' as *;

  .app {
    display: flex;
    justify-content: center;
    min-height: 100dvh;
    background: $color-background;

    // Routes own their own padding — the dashboard pins a FAB to this box.
    &__main {
      position: relative;
      flex: 1;
      width: 100%;
      max-width: 640px;
      display: flex;
      flex-direction: column;
    }
  }
</style>
