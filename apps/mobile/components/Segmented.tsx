import React from 'react'
import { View, Text, Pressable } from 'react-native'

interface Option<T> {
  value: T
  label: string
}

interface Props<T extends string | number> {
  options: Option<T>[]
  value: T
  onChange: (next: T) => void
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
}: Props<T>) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <Pressable
            key={String(opt.value)}
            onPress={() => onChange(opt.value)}
            className={`px-4 py-2 rounded-full border ${
              active
                ? 'bg-accent border-accent'
                : 'bg-card border-border'
            }`}
          >
            <Text
              className={`text-sm font-semibold ${
                active ? 'text-background' : 'text-text-primary'
              }`}
            >
              {opt.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
