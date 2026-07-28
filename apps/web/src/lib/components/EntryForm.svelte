<script lang="ts">
  import { untrack } from 'svelte'
  import Segmented from './Segmented.svelte'
  import VideoPicker from './VideoPicker.svelte'
  import {
    ART_LABELS,
    ART_VALUES,
    TAKTZAHL_VALUES,
    type Art,
    type Taktzahl,
  } from '$lib/db/schema'
  import { listAllTags, type EntryInput } from '$lib/db/queries'

  const ART_OPTIONS = ART_VALUES.map((value) => ({ value, label: ART_LABELS[value] }))
  const TAKT_OPTIONS = TAKTZAHL_VALUES.map((value) => ({ value, label: String(value) }))
  const MAX_SUGGESTIONS = 8

  interface Props {
    initial?:      Partial<EntryInput>
    submitLabel:   string
    onsubmit:      (values: EntryInput) => void | Promise<void>
    onvideochange?: (uri: string | null) => void
  }

  let { initial, submitLabel, onsubmit, onvideochange }: Props = $props()

  // Seed the fields once, on purpose. These are the user's working copy from
  // here on — re-deriving them from `initial` would overwrite what they type.
  // The detail route only mounts this form after the entry has loaded, so the
  // seed is never empty-then-late.
  const seed = untrack(() => initial) ?? {}

  let name = $state(seed.name ?? '')
  let art = $state<Art>(seed.art ?? 'figur')
  let taktzahl = $state<Taktzahl>(seed.taktzahl ?? 8)
  let videoUri = $state<string | null>(seed.video_uri ?? null)
  let tags = $state(seed.tags ?? '')
  let note = $state(seed.note ?? '')
  let saving = $state(false)
  let nameError = $state<string | null>(null)

  let allTags = $state<string[]>([])
  $effect(() => {
    void listAllTags().then((list) => (allTags = list))
  })

  let tokens = $derived(parseTagTokens(tags))

  let suggestions = $derived.by(() => {
    const existing = new Set(tokens.existingTokens.map((t) => t.toLowerCase()))
    const query = tokens.currentToken.toLowerCase()
    return allTags
      .filter((tag) => {
        const lower = tag.toLowerCase()
        if (existing.has(lower)) return false
        if (!query) return true
        return lower.includes(query) && lower !== query
      })
      .slice(0, MAX_SUGGESTIONS)
  })

  function pickTag(tag: string) {
    tags = [...tokens.existingTokens, tag].join(', ') + ', '
  }

  function handleVideoChange(next: string | null) {
    videoUri = next
    onvideochange?.(next)
  }

  async function submit(event: SubmitEvent) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      nameError = 'Bitte gib einen Namen ein.'
      return
    }
    nameError = null
    saving = true
    try {
      await onsubmit({
        name: trimmed,
        art,
        taktzahl,
        video_uri: videoUri,
        tags: normalizeTagString(tags),
        note: note.trim(),
      })
    } finally {
      saving = false
    }
  }

  function parseTagTokens(raw: string): { existingTokens: string[]; currentToken: string } {
    const parts = raw.split(',')
    const last = parts[parts.length - 1] ?? ''
    const existing = parts.slice(0, -1).map((p) => p.trim()).filter(Boolean)
    return { existingTokens: existing, currentToken: last.trim() }
  }

  function normalizeTagString(raw: string): string {
    const seen = new Set<string>()
    const out: string[] = []
    for (const part of raw.split(',')) {
      const t = part.trim()
      if (!t) continue
      const key = t.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      out.push(t)
    }
    return out.join(', ')
  }
</script>

<form class="form" onsubmit={submit}>
  <div class="form__fields">
    <label class="field">
      <span class="field__label">Name</span>
      <input class="field__input" bind:value={name} placeholder="z. B. Swing Out" />
      {#if nameError}<span class="field__error">{nameError}</span>{/if}
    </label>

    <div class="field">
      <span class="field__label">Art</span>
      <Segmented options={ART_OPTIONS} value={art} onchange={(next) => (art = next)} />
    </div>

    <div class="field">
      <span class="field__label">Taktzahl</span>
      <Segmented options={TAKT_OPTIONS} value={taktzahl} onchange={(next) => (taktzahl = next)} />
    </div>

    <div class="field">
      <span class="field__label">Video</span>
      <VideoPicker value={videoUri} onchange={handleVideoChange} />
    </div>

    <div class="field">
      <label class="field__label" for="tags">Tags</label>
      <input
        id="tags"
        class="field__input"
        bind:value={tags}
        placeholder="basics, turn, 8-count"
        autocapitalize="none"
        autocorrect="off"
      />
      {#if suggestions.length > 0}
        <div class="field__suggestions">
          {#each suggestions as tag (tag)}
            <button class="suggestion" type="button" onclick={() => pickTag(tag)}>#{tag}</button>
          {/each}
        </div>
      {/if}
      <span class="field__hint">Mit Komma trennen: basics, turn, 8-count</span>
    </div>

    <label class="field">
      <span class="field__label">Notiz</span>
      <textarea
        class="field__input field__input--area"
        bind:value={note}
        placeholder="Ergänzende Gedanken, Counts, Hinweise …"
      ></textarea>
    </label>
  </div>

  <div class="form__submit">
    <button class="submit" type="submit" disabled={saving}>{submitLabel}</button>
  </div>
</form>

<style lang="scss">
  @use '$lib/styles/tokens' as *;

  .form {
    display: flex;
    flex: 1;
    flex-direction: column;

    &__fields {
      flex: 1;
      padding: 0 1.25rem 2rem;
    }

    &__submit {
      padding: 0.5rem 1.25rem safe-bottom(1rem);
    }
  }

  .field {
    display: block;
    margin-top: 1.25rem;

    &__label {
      display: block;
      margin-bottom: 0.5rem;
      color: $color-text-secondary;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.15em;
    }

    &__input {
      display: block;
      width: 100%;
      padding: 0.75rem 1rem;
      border: 1px solid $color-border;
      border-radius: 0.75rem;
      background: $color-card;
      color: $color-text-primary;
      outline: none;

      &::placeholder {
        color: $color-text-muted;
      }

      &:focus {
        border-color: $color-accent-dark;
      }

      &--area {
        min-height: 120px;
        resize: vertical;
      }
    }

    &__suggestions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 0.5rem;
    }

    &__hint {
      display: block;
      margin-top: 0.5rem;
      color: $color-text-muted;
      font-size: 0.75rem;
    }

    &__error {
      display: block;
      margin-top: 0.5rem;
      color: $color-error;
      font-size: 0.75rem;
    }
  }

  .suggestion {
    padding: 0.375rem 0.75rem;
    border: 1px solid rgba($color-accent, 0.4);
    border-radius: 999px;
    background: rgba($color-accent, 0.15);
    color: $color-accent;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
  }

  .submit {
    width: 100%;
    padding: 1rem;
    border: none;
    border-radius: 1rem;
    background: $color-accent;
    color: $color-background;
    font-size: 1rem;
    font-weight: 700;
    cursor: pointer;

    &:disabled {
      opacity: 0.6;
      cursor: default;
    }
  }
</style>
