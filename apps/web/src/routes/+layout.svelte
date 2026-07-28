<script lang="ts">
  import '$lib/styles/global.scss'

  let { children } = $props()
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
    flex-direction: column;
    min-height: 100dvh;
    background: $color-background;

    &__main {
      flex: 1;
      width: 100%;
      max-width: 640px;
      margin: 0 auto;
      padding: 1rem 1rem safe-bottom(1rem);
    }
  }
</style>
