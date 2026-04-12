import React from 'react'
import { Text, Pressable } from 'react-native'

interface Props {
  label: string
  active: boolean
  onPress: () => void
}

export function FilterChip({ label, active, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      className={`px-4 py-2 rounded-full border ${
        active ? 'bg-accent border-accent' : 'bg-card border-border'
      }`}
    >
      <Text
        className={`text-sm font-semibold ${
          active ? 'text-background' : 'text-text-primary'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  )
}
