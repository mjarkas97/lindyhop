<script lang="ts">
  import Icon from './Icon.svelte'
  import { deleteVideo, persistVideo, videoUrl } from '$lib/videoStorage'

  interface Props {
    value:    string | null
    onchange: (next: string | null) => void
  }

  let { value, onchange }: Props = $props()

  let busy = $state(false)
  let failure = $state<string | null>(null)
  let src = $state<string | null>(null)

  let uploadInput: HTMLInputElement
  let recordInput: HTMLInputElement

  // Object URLs are revoked when the source changes or the component goes away —
  // a long list of previews otherwise leaks a blob per entry.
  $effect(() => {
    const uri = value
    let url: string | null = null
    let cancelled = false

    void videoUrl(uri).then((next) => {
      if (cancelled) {
        if (next) URL.revokeObjectURL(next)
        return
      }
      url = next
      src = next
    })

    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
      src = null
    }
  })

  async function accept(event: Event) {
    const input = event.currentTarget as HTMLInputElement
    const file = input.files?.[0]
    input.value = '' // so re-picking the same file fires change again
    if (!file) return

    busy = true
    failure = null
    try {
      const persisted = await persistVideo(file)
      if (value) await deleteVideo(value)
      onchange(persisted)
    } catch (err) {
      failure = err instanceof Error ? err.message : 'Video konnte nicht geladen werden.'
    } finally {
      busy = false
    }
  }

  async function clear() {
    const previous = value
    onchange(null)
    await deleteVideo(previous)
  }
</script>

<input
  bind:this={uploadInput}
  class="hidden-input"
  type="file"
  accept="video/*"
  onchange={accept}
/>
<input
  bind:this={recordInput}
  class="hidden-input"
  type="file"
  accept="video/*"
  capture="environment"
  onchange={accept}
/>

{#if value}
  <div class="preview">
    <div class="preview__frame">
      {#if src}
        <!-- svelte-ignore a11y_media_has_caption -->
        <video class="preview__video" {src} controls loop playsinline></video>
      {/if}
    </div>
    <div class="preview__actions">
      <button class="preview__button" type="button" disabled={busy} onclick={() => uploadInput.click()}>
        Ersetzen
      </button>
      <button class="preview__button" type="button" data-danger="true" onclick={clear}>
        Entfernen
      </button>
    </div>
  </div>
{:else}
  <div class="picker">
    <button class="picker__button" type="button" disabled={busy} onclick={() => uploadInput.click()}>
      <Icon name="upload" size={22} color="#f59e0b" />
      <span>Hochladen</span>
    </button>
    <button class="picker__button" type="button" disabled={busy} onclick={() => recordInput.click()}>
      <Icon name="videocam" size={22} color="#f59e0b" />
      <span>Aufnehmen</span>
    </button>
  </div>
{/if}

{#if failure}
  <p class="failure">{failure}</p>
{/if}

<style lang="scss">
  @use '$lib/styles/tokens' as *;

  .hidden-input {
    display: none;
  }

  .picker {
    display: flex;
    gap: 0.75rem;

    &__button {
      display: flex;
      flex: 1;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      padding: 1.25rem 0;
      border: 1px solid $color-border;
      border-radius: 1rem;
      background: $color-card;
      color: $color-text-primary;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;

      &:disabled {
        opacity: 0.6;
        cursor: default;
      }
    }
  }

  .preview {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;

    &__frame {
      aspect-ratio: 16 / 9;
      overflow: hidden;
      border-radius: 1rem;
      background: #000;
    }

    &__video {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    &__actions {
      display: flex;
      gap: 0.75rem;
    }

    &__button {
      flex: 1;
      padding: 0.75rem 0;
      border: 1px solid $color-border;
      border-radius: 0.75rem;
      background: $color-card;
      color: $color-text-primary;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;

      &[data-danger='true'] {
        border-color: rgba($color-error, 0.4);
        color: $color-error;
      }
    }
  }

  .failure {
    margin-top: 0.5rem;
    color: $color-error;
    font-size: 0.75rem;
  }
</style>
