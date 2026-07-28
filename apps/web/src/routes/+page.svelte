<script lang="ts">
  // Interim harness for MJ-21 — replaced by the real dashboard in MJ-23.
  import { entries, error, loading, reload } from '$lib/stores/entries'
  import { createEntry, exportDb } from '$lib/db/queries'
  import { ART_LABELS } from '$lib/db/schema'

  let header = $state('')

  async function addEntry() {
    await createEntry({
      name: `Probe ${new Date().toLocaleTimeString('de-DE')}`,
      art: 'figur',
      taktzahl: 8,
      video_uri: null,
      tags: 'probe',
      note: '',
    })
    reload()
  }

  async function checkExport() {
    const bytes = await exportDb()
    header = new TextDecoder().decode(bytes.slice(0, 15))
  }
</script>

<h1>LindyHop</h1>

{#if $error}
  <p data-state="error">{$error}</p>
{:else if $loading}
  <p>Lädt ...</p>
{:else}
  <ul>
    {#each $entries as entry (entry.id)}
      <li>{entry.name} - {ART_LABELS[entry.art]} - {entry.taktzahl} Takte</li>
    {/each}
  </ul>
{/if}

<button onclick={addEntry}>Eintrag anlegen</button>
<button onclick={checkExport}>Export prüfen</button>
{#if header}<p data-state="export">{header}</p>{/if}
