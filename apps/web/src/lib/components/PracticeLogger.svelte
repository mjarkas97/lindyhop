<script lang="ts">
  import { logPractice } from '$lib/api/practice'
  import { localNoon, toInputDate } from '$lib/day'
  import { MAX_PRACTICE_NOTE } from '$lib/shared/practice'

  interface Props {
    entryId:  number
    onlogged: () => void | Promise<void>
  }

  let { entryId, onlogged }: Props = $props()

  const today = toInputDate(Date.now())

  let open = $state(false)
  let date = $state(today)
  let note = $state('')
  let busy = $state(false)
  let error = $state<string | null>(null)

  async function log() {
    busy = true
    error = null
    try {
      // Today keeps the real time of day; a backdated one lands at local noon,
      // where no timezone can push it into the neighbouring day.
      await logPractice(entryId, date === today ? Date.now() : localNoon(date), note.trim())
      date = today
      note = ''
      open = false
      await onlogged()
    } catch (err) {
      error = err instanceof Error ? err.message : 'Übung konnte nicht gespeichert werden.'
    } finally {
      busy = false
    }
  }
</script>

<section class="logger">
  <div class="logger__row">
    <button class="logger__primary" type="button" onclick={log} disabled={busy}>
      {busy ? 'Speichert …' : 'Geübt'}
    </button>
    <button
      class="logger__toggle"
      type="button"
      data-open={open}
      onclick={() => (open = !open)}
      aria-expanded={open}
    >
      Datum &amp; Notiz
    </button>
  </div>

  {#if open}
    <div class="logger__details">
      <label class="field">
        <span class="field__label">Wann</span>
        <!-- Nothing in the future: the server rejects it too, this only saves the trip. -->
        <input class="field__input" type="date" bind:value={date} max={today} />
      </label>

      <label class="field">
        <span class="field__label">Notiz</span>
        <input
          class="field__input"
          bind:value={note}
          maxlength={MAX_PRACTICE_NOTE}
          placeholder="z. B. Tempo zu schnell"
        />
      </label>
    </div>
  {/if}

  {#if error}
    <p class="logger__error">{error}</p>
  {/if}
</section>

<style lang="scss">
  @use '$lib/styles/tokens' as *;

  .logger {
    padding: 1rem;
    border: 1px solid $color-border;
    border-radius: 1rem;
    background: $color-card;

    &__row {
      display: flex;
      gap: 0.75rem;
    }

    &__primary {
      flex: 1;
      padding: 0.875rem;
      border: none;
      border-radius: 0.75rem;
      background: $color-accent;
      color: $color-background;
      font-size: 0.9375rem;
      font-weight: 700;
      cursor: pointer;

      &:disabled {
        opacity: 0.6;
        cursor: default;
      }
    }

    &__toggle {
      padding: 0.875rem 1rem;
      border: 1px solid $color-border;
      border-radius: 0.75rem;
      background: $color-surface;
      color: $color-text-secondary;
      font-size: 0.8125rem;
      font-weight: 600;
      cursor: pointer;

      &[data-open='true'] {
        border-color: $color-accent-dark;
        color: $color-accent;
      }
    }

    &__details {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-top: 1rem;
    }

    &__error {
      margin-top: 0.75rem;
      color: $color-error;
      font-size: 0.75rem;
    }
  }

  .field {
    display: block;

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
      background: $color-background;
      color: $color-text-primary;
      outline: none;

      &::placeholder {
        color: $color-text-muted;
      }

      &:focus {
        border-color: $color-accent-dark;
      }
    }
  }
</style>
