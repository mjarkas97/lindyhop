<script lang="ts">
  import { goto } from '$app/navigation'
  import { page } from '$app/state'
  import EntryForm from '$lib/components/EntryForm.svelte'
  import Icon from '$lib/components/Icon.svelte'
  import { deleteEntry, getEntry, updateEntry, type Entry, type EntryInput } from '$lib/api/entries'
  import { reload } from '$lib/stores/entries'
  import { user } from '$lib/stores/user'
  import { ART_LABELS } from '$lib/shared/entry'
  import { videoUrl } from '$lib/api/videos'

  let entry = $state<Entry | null>(null)
  let loaded = $state(false)

  // Abandoned and replaced videos are the server's problem now — it drops the old
  // file on save and sweeps uploads that never got attached.
  $effect(() => {
    const id = Number(page.params.id)
    void getEntry(id).then((found) => {
      entry = found
      loaded = true
    })
  })

  // A public entry is readable by everyone but editable only by its author, so
  // the form is withheld until we know which of the two this is.
  let isOwner = $derived(entry !== null && $user !== null && entry.user_id === $user.id)
  let ready = $derived(loaded && $user !== null)

  async function back() {
    await goto('/')
  }

  async function remove() {
    if (!entry) return
    if (!confirm(`„${entry.name}" wirklich entfernen?`)) return
    await deleteEntry(entry.id)
    reload()
    await goto('/')
  }

  async function save(values: EntryInput) {
    if (!entry) return
    await updateEntry(entry.id, values)
    reload()
    await goto('/')
  }
</script>

<header class="head">
  <button class="head__action" type="button" onclick={back} aria-label="Zurück">
    <Icon name="back" color="#ffffff" />
  </button>
  <h1 class="head__title">Eintrag</h1>
  {#if isOwner}
    <button class="head__action" type="button" onclick={remove} aria-label="Löschen">
      <Icon name="trash" size={18} color="#ef4444" />
    </button>
  {:else}
    <span class="head__spacer"></span>
  {/if}
</header>

{#if !ready}
  <p class="notice">Lädt …</p>
{:else if !entry}
  <p class="notice">Eintrag nicht gefunden.</p>
{:else if isOwner}
  <EntryForm
    initial={{
      name: entry.name,
      art: entry.art,
      taktzahl: entry.taktzahl,
      video_uri: entry.video_uri,
      tags: entry.tags,
      note: entry.note,
      is_public: entry.is_public,
    }}
    submitLabel="Änderungen speichern"
    onsubmit={save}
  />
{:else}
  <article class="view">
    <p class="view__owner">Geteilt von {entry.owner_username}</p>
    <h2 class="view__name">{entry.name}</h2>

    <p class="view__meta">{ART_LABELS[entry.art]} · {entry.taktzahl} Takte</p>

    {#if entry.video_uri}
      <!-- svelte-ignore a11y_media_has_caption -->
      <video class="view__video" src={videoUrl(entry.video_uri)} controls playsinline></video>
    {/if}

    {#if entry.tags}
      <div class="view__tags">
        {#each entry.tags.split(',') as tag}
          <span class="view__tag">{tag.trim()}</span>
        {/each}
      </div>
    {/if}

    {#if entry.note}
      <p class="view__note">{entry.note}</p>
    {/if}
  </article>
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

    &__spacer {
      width: 2.5rem;
    }
  }

  .notice {
    padding: 2rem 1.25rem;
    text-align: center;
    color: $color-text-secondary;
  }

  .view {
    padding: 0 1.25rem 2rem;

    &__owner {
      color: $color-text-muted;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.15em;
    }

    &__name {
      margin-top: 0.5rem;
      font-size: 1.5rem;
      font-weight: 700;
    }

    &__meta {
      margin-top: 0.25rem;
      color: $color-text-secondary;
      font-size: 0.875rem;
    }

    &__video {
      width: 100%;
      margin-top: 1.25rem;
      border-radius: 0.75rem;
      background: $color-card;
    }

    &__tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 1.25rem;
    }

    &__tag {
      padding: 0.25rem 0.75rem;
      border: 1px solid $color-border;
      border-radius: 999px;
      background: $color-card;
      color: $color-text-secondary;
      font-size: 0.75rem;
    }

    &__note {
      margin-top: 1.25rem;
      color: $color-text-secondary;
      line-height: 1.6;
      white-space: pre-wrap;
    }
  }
</style>
