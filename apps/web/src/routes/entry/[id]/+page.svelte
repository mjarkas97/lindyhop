<script lang="ts">
  import { goto } from '$app/navigation'
  import { page } from '$app/state'
  import EntryForm from '$lib/components/EntryForm.svelte'
  import Icon from '$lib/components/Icon.svelte'
  import { deleteEntry, getEntry, updateEntry, type Entry, type EntryInput } from '$lib/db/queries'
  import { reload } from '$lib/stores/entries'
  import { deleteVideo } from '$lib/videoStorage'

  let entry = $state<Entry | null>(null)
  let loaded = $state(false)

  // Same rule as the RN version: track the video the entry started with against
  // the one currently selected, and delete whichever ends up orphaned.
  let originalVideo: string | null = null
  let currentVideo: string | null = null

  $effect(() => {
    const id = Number(page.params.id)
    void getEntry(id).then((found) => {
      entry = found
      loaded = true
      originalVideo = found?.video_uri ?? null
      currentVideo = found?.video_uri ?? null
    })
  })

  async function back() {
    if (currentVideo && currentVideo !== originalVideo) await deleteVideo(currentVideo)
    await goto('/')
  }

  async function remove() {
    if (!entry) return
    if (!confirm(`„${entry.name}" wirklich entfernen?`)) return
    await deleteVideo(currentVideo)
    await deleteEntry(entry.id)
    reload()
    await goto('/')
  }

  async function save(values: EntryInput) {
    if (!entry) return
    await updateEntry(entry.id, values)
    if (originalVideo && originalVideo !== values.video_uri) await deleteVideo(originalVideo)
    originalVideo = values.video_uri
    reload()
    await goto('/')
  }
</script>

<header class="head">
  <button class="head__action" type="button" onclick={back} aria-label="Zurück">
    <Icon name="back" color="#ffffff" />
  </button>
  <h1 class="head__title">Eintrag</h1>
  <button class="head__action" type="button" onclick={remove} aria-label="Löschen">
    <Icon name="trash" size={18} color="#ef4444" />
  </button>
</header>

{#if !loaded}
  <p class="notice">Lädt …</p>
{:else if !entry}
  <p class="notice">Eintrag nicht gefunden.</p>
{:else}
  <EntryForm
    initial={{
      name: entry.name,
      art: entry.art,
      taktzahl: entry.taktzahl,
      video_uri: entry.video_uri,
      tags: entry.tags,
      note: entry.note,
    }}
    submitLabel="Änderungen speichern"
    onvideochange={(uri) => (currentVideo = uri)}
    onsubmit={save}
  />
{/if}

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
  }

  .notice {
    padding: 2rem 1.25rem;
    text-align: center;
    color: $color-text-secondary;
  }
</style>
