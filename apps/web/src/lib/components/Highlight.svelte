<script lang="ts">
  interface Props {
    text:   string
    query?: string
    /** Clamp to N lines, as RN's numberOfLines did. */
    lines?: number
  }

  let { text, query = '', lines }: Props = $props()

  interface Part {
    value: string
    match: boolean
  }

  function splitOnMatch(source: string, q: string): Part[] {
    const result: Part[] = []
    const lowerText = source.toLowerCase()
    const lowerQuery = q.toLowerCase()
    let i = 0
    while (i < source.length) {
      const found = lowerText.indexOf(lowerQuery, i)
      if (found === -1) {
        result.push({ value: source.slice(i), match: false })
        break
      }
      if (found > i) result.push({ value: source.slice(i, found), match: false })
      result.push({ value: source.slice(found, found + lowerQuery.length), match: true })
      i = found + lowerQuery.length
    }
    return result
  }

  let parts = $derived(query.trim() ? splitOnMatch(text, query.trim()) : [{ value: text, match: false }])
</script>

<span class="highlight" data-clamp={lines ? 'true' : 'false'} style={lines ? `--lines: ${lines}` : undefined}>
  {#each parts as part, i (i)}
    {#if part.match}<mark class="highlight__hit">{part.value}</mark>{:else}{part.value}{/if}
  {/each}
</span>

<style lang="scss">
  @use '$lib/styles/tokens' as *;

  .highlight {
    &[data-clamp='true'] {
      display: -webkit-box;
      -webkit-line-clamp: var(--lines);
      line-clamp: var(--lines);
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    &__hit {
      background: none;
      color: $color-accent;
      font-weight: 700;
    }
  }
</style>
