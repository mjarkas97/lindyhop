import React from 'react'
import { View, Text, Pressable } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { ART_LABELS } from '../db/schema'
import type { Entry } from '../db/queries'
import { Highlight } from './Highlight'

interface Props {
  entry: Entry
  onPress: () => void
  search?: string
}

export function EntryCard({ entry, onPress, search }: Props) {
  const tags = entry.tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)

  return (
    <Pressable
      onPress={onPress}
      className="bg-card border border-border rounded-2xl p-4 active:opacity-80"
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <Highlight
            text={entry.name}
            query={search}
            className="text-white text-lg font-bold"
            numberOfLines={1}
          />
          <View className="flex-row items-center gap-3 mt-1">
            <Text className="text-accent text-xs font-semibold uppercase tracking-wider">
              {ART_LABELS[entry.art]}
            </Text>
            <Text className="text-text-secondary text-xs">
              {entry.taktzahl} Takte
            </Text>
          </View>
        </View>
        <View className="items-center justify-center w-9 h-9 rounded-full bg-background">
          <Ionicons
            name={entry.video_uri ? 'play' : 'document-text-outline'}
            size={16}
            color={entry.video_uri ? '#f59e0b' : '#525252'}
          />
        </View>
      </View>

      {entry.note ? (
        <Highlight
          text={entry.note}
          query={search}
          className="text-text-secondary text-sm mt-3 leading-5"
          numberOfLines={2}
        />
      ) : null}

      {tags.length > 0 ? (
        <View className="flex-row flex-wrap gap-2 mt-3">
          {tags.slice(0, 4).map((t) => (
            <View
              key={t}
              className="px-2 py-0.5 rounded-full border bg-background border-border"
            >
              <Highlight
                text={`#${t}`}
                query={search}
                className="text-text-secondary text-xs"
              />
            </View>
          ))}
        </View>
      ) : null}
    </Pressable>
  )
}
