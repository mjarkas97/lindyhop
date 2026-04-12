import React, { useMemo, useRef } from 'react'
import { View, Text, Pressable, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { EntryForm } from '../../components/EntryForm'
import { deleteEntry, getEntry, updateEntry } from '../../db/queries'
import { deleteVideo } from '../../lib/videoStorage'

export default function EntryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const entryId = Number(id)
  const entry = useMemo(() => getEntry(entryId), [entryId])

  const originalVideo = useRef<string | null>(entry?.video_uri ?? null)
  const currentVideo = useRef<string | null>(entry?.video_uri ?? null)

  if (!entry) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <Text className="text-white">Eintrag nicht gefunden.</Text>
      </SafeAreaView>
    )
  }

  const handleDelete = () => {
    Alert.alert('Löschen?', `„${entry.name}" wirklich entfernen?`, [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Löschen',
        style: 'destructive',
        onPress: async () => {
          await deleteVideo(currentVideo.current)
          deleteEntry(entry.id)
          router.back()
        },
      },
    ])
  }

  const handleBack = async () => {
    const current = currentVideo.current
    const original = originalVideo.current
    if (current && current !== original) {
      await deleteVideo(current)
    }
    router.back()
  }

  const handleSave = async (values: Parameters<
    React.ComponentProps<typeof EntryForm>['onSubmit']
  >[0]) => {
    updateEntry(entry.id, values)
    const original = originalVideo.current
    if (original && original !== values.video_uri) {
      await deleteVideo(original)
    }
    originalVideo.current = values.video_uri
    router.back()
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-row items-center justify-between px-5 pt-3 pb-4">
        <Pressable
          onPress={handleBack}
          className="w-10 h-10 rounded-full bg-card border border-border items-center justify-center"
        >
          <Ionicons name="chevron-back" size={20} color="#fff" />
        </Pressable>
        <Text className="text-white text-base font-bold">Eintrag</Text>
        <Pressable
          onPress={handleDelete}
          className="w-10 h-10 rounded-full bg-card border border-border items-center justify-center"
        >
          <Ionicons name="trash-outline" size={18} color="#ef4444" />
        </Pressable>
      </View>

      <EntryForm
        initial={{
          name: entry.name,
          art: entry.art,
          taktzahl: entry.taktzahl,
          video_uri: entry.video_uri,
          tags: entry.tags,
          note: entry.note,
        }}
        submitLabel="Änderungen speichern"
        onVideoChange={(uri) => {
          currentVideo.current = uri
        }}
        onSubmit={handleSave}
      />
    </SafeAreaView>
  )
}
