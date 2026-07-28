<script lang="ts">
  import { goto } from '$app/navigation'
  import EntryForm from '$lib/components/EntryForm.svelte'
  import Icon from '$lib/components/Icon.svelte'
  import { createEntry, type EntryInput } from '$lib/db/queries'
  import { reload } from '$lib/stores/entries'
  import { deleteVideo } from '$lib/videoStorage'

  // A video picked and then abandoned by cancelling would otherwise sit in OPFS
  // forever with no entry pointing at it.
  let pendingVideo: string | null = null

  async function cancel() {
    if (pendingVideo) await deleteVideo(pendingVideo)
    await goto('/')
  }

  async function save(values: EntryInput) {
    await createEntry(values)
    pendingVideo = null
    reload()
    await goto('/')
  }
</script>

<header class="head">
  <button class="head__action" type="button" onclick={cancel} aria-label="Abbrechen">
    <Icon name="close" color="#ffffff" />
  </button>
  <h1 class="head__title">Neuer Eintrag</h1>
  <span class="head__spacer"></span>
</header>

<EntryForm
  submitLabel="Speichern"
  onvideochange={(uri) => (pendingVideo = uri)}
  onsubmit={save}
/>

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
</style>
