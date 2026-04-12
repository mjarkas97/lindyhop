import React, { useRef } from 'react'
import { View, Text, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { EntryForm } from '../../components/EntryForm'
import { createEntry } from '../../db/queries'
import { deleteVideo } from '../../lib/videoStorage'

export default function NewEntryScreen() {
  const router = useRouter()
  const pendingVideo = useRef<string | null>(null)

  const handleCancel = async () => {
    if (pendingVideo.current) await deleteVideo(pendingVideo.current)
    router.back()
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-row items-center justify-between px-5 pt-3 pb-4">
        <Pressable
          onPress={handleCancel}
          className="w-10 h-10 rounded-full bg-card border border-border items-center justify-center"
        >
          <Ionicons name="close" size={20} color="#fff" />
        </Pressable>
        <Text className="text-white text-base font-bold">Neuer Eintrag</Text>
        <View style={{ width: 40 }} />
      </View>

      <EntryForm
        submitLabel="Speichern"
        onVideoChange={(uri) => {
          pendingVideo.current = uri
        }}
        onSubmit={(values) => {
          createEntry(values)
          pendingVideo.current = null
          router.back()
        }}
      />
    </SafeAreaView>
  )
}
