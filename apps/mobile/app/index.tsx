import React, { useState } from 'react'
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { EntryCard } from '../components/EntryCard'
import { FilterChip } from '../components/FilterChip'
import { useEntries } from '../hooks/useEntries'
import { ART_LABELS, ART_VALUES, type Art } from '../db/schema'
import type { SortOrder } from '../db/queries'

const SORTS: { value: SortOrder; label: string }[] = [
  { value: 'newest',   label: 'Neueste' },
  { value: 'oldest',   label: 'Älteste' },
  { value: 'name',     label: 'Name A-Z' },
  { value: 'taktzahl', label: 'Takte' },
]

export default function DashboardScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const [search, setSearch] = useState('')
  const [art, setArt] = useState<Art | null>(null)
  const [sort, setSort] = useState<SortOrder>('newest')

  const { entries } = useEntries({ search, art, sort })

  const hasFilters = search.trim() !== '' || art !== null

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-row items-center justify-between px-5 pt-4 pb-3">
        <View>
          <Text className="text-text-secondary text-xs uppercase tracking-widest">
            LindyHop
          </Text>
          <Text className="text-white text-2xl font-bold mt-1">
            Deine Einträge
          </Text>
        </View>
        <Pressable
          onPress={() => router.push('/settings')}
          className="w-10 h-10 rounded-full bg-card border border-border items-center justify-center"
        >
          <Ionicons name="cloud-outline" size={20} color="#a3a3a3" />
        </Pressable>
      </View>

      <View className="px-5">
        <View className="flex-row items-center bg-card border border-border rounded-xl px-3">
          <Ionicons name="search" size={16} color="#a3a3a3" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Suchen in Name, Tags, Notiz …"
            placeholderTextColor="#525252"
            autoCapitalize="none"
            autoCorrect={false}
            className="flex-1 text-white px-2 py-3"
          />
          {search.length > 0 ? (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color="#525252" />
            </Pressable>
          ) : null}
        </View>
      </View>

      <View className="px-5 mt-4">
        <Text className="text-text-muted text-[10px] font-bold uppercase tracking-widest mb-2">
          Art
        </Text>
        <View className="flex-row flex-wrap gap-2">
          <FilterChip
            label="Alle"
            active={art === null}
            onPress={() => setArt(null)}
          />
          {ART_VALUES.map((v) => (
            <FilterChip
              key={v}
              label={ART_LABELS[v]}
              active={art === v}
              onPress={() => setArt(art === v ? null : v)}
            />
          ))}
        </View>
      </View>

      <View className="px-5 mt-4">
        <Text className="text-text-muted text-[10px] font-bold uppercase tracking-widest mb-2">
          Sortierung
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {SORTS.map((opt) => (
            <FilterChip
              key={opt.value}
              label={opt.label}
              active={sort === opt.value}
              onPress={() => setSort(opt.value)}
            />
          ))}
        </View>
      </View>

      <View className="flex-row items-center justify-between px-5 pt-2 pb-1">
        <Text className="text-text-muted text-xs font-semibold">
          {entries.length} {entries.length === 1 ? 'Eintrag' : 'Einträge'}
        </Text>
        {hasFilters ? (
          <Pressable
            onPress={() => {
              setSearch('')
              setArt(null)
            }}
            hitSlop={8}
          >
            <Text className="text-accent text-xs font-semibold">
              Filter zurücksetzen
            </Text>
          </Pressable>
        ) : null}
      </View>

      <FlatList
        data={entries}
        keyExtractor={(e) => String(e.id)}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: 96 + insets.bottom,
          gap: 12,
        }}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <EntryCard
            entry={item}
            search={search}
            onPress={() => router.push(`/entry/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          <View className="items-center mt-16 px-6">
            <Text className="text-5xl mb-3">
              {hasFilters ? '🔎' : '💃'}
            </Text>
            <Text className="text-white text-base font-semibold">
              {hasFilters ? 'Keine Treffer' : 'Noch keine Einträge'}
            </Text>
            <Text className="text-text-secondary text-sm text-center mt-2">
              {hasFilters
                ? 'Passe Suche oder Filter an, um mehr zu sehen.'
                : 'Tippe auf das Plus, um deinen ersten Eintrag zu erstellen.'}
            </Text>
          </View>
        }
      />

      <Pressable
        onPress={() => router.push('/entry/new')}
        style={{ bottom: 16 + insets.bottom }}
        className="absolute right-5 w-14 h-14 rounded-full bg-accent items-center justify-center shadow-lg active:opacity-80"
      >
        <Ionicons name="add" size={28} color="#0a0a0a" />
      </Pressable>
    </SafeAreaView>
  )
}
