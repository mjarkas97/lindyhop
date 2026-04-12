import React from 'react'
import { Text } from 'react-native'

interface Props {
  text: string
  query?: string
  className?: string
  highlightClassName?: string
  numberOfLines?: number
}

export function Highlight({
  text,
  query,
  className,
  highlightClassName = 'text-accent font-bold',
  numberOfLines,
}: Props) {
  const q = query?.trim()
  if (!q) {
    return (
      <Text className={className} numberOfLines={numberOfLines}>
        {text}
      </Text>
    )
  }

  const parts = splitOnMatch(text, q)
  return (
    <Text className={className} numberOfLines={numberOfLines}>
      {parts.map((p, i) =>
        p.match ? (
          <Text key={i} className={highlightClassName}>
            {p.value}
          </Text>
        ) : (
          p.value
        )
      )}
    </Text>
  )
}

function splitOnMatch(
  text: string,
  query: string
): { value: string; match: boolean }[] {
  const result: { value: string; match: boolean }[] = []
  const lowerText = text.toLowerCase()
  const lowerQuery = query.toLowerCase()
  let i = 0
  while (i < text.length) {
    const found = lowerText.indexOf(lowerQuery, i)
    if (found === -1) {
      result.push({ value: text.slice(i), match: false })
      break
    }
    if (found > i) {
      result.push({ value: text.slice(i, found), match: false })
    }
    result.push({
      value: text.slice(found, found + lowerQuery.length),
      match: true,
    })
    i = found + lowerQuery.length
  }
  return result
}
