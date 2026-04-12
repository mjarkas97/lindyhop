import React, { useState } from 'react'
import { View, Text, Pressable, Alert } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { VideoView, useVideoPlayer } from 'expo-video'
import { persistVideo, deleteVideo } from '../lib/videoStorage'

interface Props {
  value: string | null
  onChange: (uri: string | null) => void
}

export function VideoPicker({ value, onChange }: Props) {
  const [busy, setBusy] = useState(false)

  const pick = async (source: 'library' | 'camera') => {
    try {
      setBusy(true)
      const perm =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!perm.granted) {
        Alert.alert('Keine Berechtigung', 'Bitte in den Einstellungen freigeben.')
        return
      }
      const launcher =
        source === 'camera'
          ? ImagePicker.launchCameraAsync
          : ImagePicker.launchImageLibraryAsync
      const result = await launcher({
        mediaTypes: ['videos'],
        quality: 1,
        videoMaxDuration: 120,
      })
      if (result.canceled) return
      const asset = result.assets[0]
      if (!asset) return
      const persisted = await persistVideo(asset.uri)
      if (value) await deleteVideo(value)
      onChange(persisted)
    } catch (e) {
      Alert.alert('Fehler', e instanceof Error ? e.message : 'Video konnte nicht geladen werden.')
    } finally {
      setBusy(false)
    }
  }

  const clear = async () => {
    const prev = value
    onChange(null)
    await deleteVideo(prev)
  }

  if (value) {
    return <VideoPreview uri={value} onReplace={() => pick('library')} onClear={clear} />
  }

  return (
    <View className="flex-row gap-3">
      <Pressable
        onPress={() => pick('library')}
        disabled={busy}
        className="flex-1 bg-card border border-border rounded-2xl py-5 items-center active:opacity-80"
      >
        <Ionicons name="cloud-upload-outline" size={22} color="#f59e0b" />
        <Text className="text-white text-sm font-semibold mt-2">Hochladen</Text>
      </Pressable>
      <Pressable
        onPress={() => pick('camera')}
        disabled={busy}
        className="flex-1 bg-card border border-border rounded-2xl py-5 items-center active:opacity-80"
      >
        <Ionicons name="videocam-outline" size={22} color="#f59e0b" />
        <Text className="text-white text-sm font-semibold mt-2">Aufnehmen</Text>
      </Pressable>
    </View>
  )
}

function VideoPreview({
  uri,
  onReplace,
  onClear,
}: {
  uri: string
  onReplace: () => void
  onClear: () => void
}) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true
  })
  return (
    <View className="gap-3">
      <View className="rounded-2xl overflow-hidden bg-black aspect-video">
        <VideoView
          player={player}
          style={{ flex: 1 }}
          allowsFullscreen
          allowsPictureInPicture={false}
          contentFit="contain"
        />
      </View>
      <View className="flex-row gap-3">
        <Pressable
          onPress={onReplace}
          className="flex-1 bg-card border border-border rounded-xl py-3 items-center"
        >
          <Text className="text-white text-sm font-semibold">Ersetzen</Text>
        </Pressable>
        <Pressable
          onPress={onClear}
          className="flex-1 bg-card border border-error/40 rounded-xl py-3 items-center"
        >
          <Text className="text-error text-sm font-semibold">Entfernen</Text>
        </Pressable>
      </View>
    </View>
  )
}
