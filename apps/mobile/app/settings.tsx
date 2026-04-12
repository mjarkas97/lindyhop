import React, { useCallback, useEffect, useState } from 'react'
import {
  View, Text, TextInput, Pressable, ScrollView, Alert,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import {
  loadConfig, saveConfig, clearConfig, testConnection,
  uploadToNextCloud, downloadFromNextCloud,
} from '../lib/nextcloud'

export default function SettingsScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const [serverUrl, setServerUrl] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [syncing, setSyncing] = useState<'upload' | 'download' | null>(null)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    loadConfig().then((cfg) => {
      if (cfg) {
        setServerUrl(cfg.serverUrl)
        setUsername(cfg.username)
        setPassword(cfg.password)
      }
    })
  }, [])

  const showStatus = useCallback((msg: string) => {
    setStatus(msg)
    setTimeout(() => setStatus(null), 4000)
  }, [])

  const handleSave = async () => {
    if (!serverUrl.trim() || !username.trim() || !password.trim()) {
      Alert.alert('Fehler', 'Bitte fülle alle Felder aus.')
      return
    }
    setSaving(true)
    try {
      await saveConfig({ serverUrl: serverUrl.trim(), username: username.trim(), password })
      showStatus('Einstellungen gespeichert')
    } catch {
      showStatus('Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    if (!serverUrl.trim() || !username.trim() || !password.trim()) {
      Alert.alert('Fehler', 'Bitte fülle alle Felder aus.')
      return
    }
    setTesting(true)
    const result = await testConnection({ serverUrl: serverUrl.trim(), username: username.trim(), password })
    setTesting(false)
    if (result.ok) {
      showStatus('Verbindung erfolgreich')
    } else {
      showStatus(result.error)
    }
  }

  const handleUpload = async () => {
    setSyncing('upload')
    const result = await uploadToNextCloud({ serverUrl: serverUrl.trim(), username: username.trim(), password })
    setSyncing(null)
    if (result.ok) {
      showStatus('Backup hochgeladen')
    } else {
      showStatus(result.error)
    }
  }

  const handleDownload = async () => {
    setSyncing('download')
    const result = await downloadFromNextCloud({ serverUrl: serverUrl.trim(), username: username.trim(), password })
    setSyncing(null)
    if (result.ok) {
      showStatus('Backup wiederhergestellt')
    } else {
      showStatus(result.error)
    }
  }

  const handleClear = () => {
    Alert.alert('Zugangsdaten entfernen?', 'Dies löscht nur die gespeicherte Server-Konfiguration, nicht deine lokalen Daten.', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Entfernen', style: 'destructive',
        onPress: async () => {
          await clearConfig()
          setServerUrl('')
          setUsername('')
          setPassword('')
          showStatus('Zugangsdaten entfernt')
        },
      },
    ])
  }

  const isConfigured = serverUrl.trim() && username.trim()

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <View className="flex-row items-center justify-between px-5 pt-3 pb-4">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-card border border-border items-center justify-center"
          >
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </Pressable>
          <Text className="text-white text-base font-bold">NextCloud Sync</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView className="flex-1 px-5" keyboardShouldPersistTaps="handled">
          <Text className="text-text-secondary text-xs font-semibold uppercase tracking-widest mb-4">
            Server-Verbindung
          </Text>

          <Text className="text-text-muted text-xs mb-2">Server-URL</Text>
          <TextInput
            value={serverUrl}
            onChangeText={setServerUrl}
            placeholder="https://nextcloud.example.com"
            placeholderTextColor="#525252"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            className="bg-card border border-border rounded-xl px-4 py-3 text-white mb-4"
          />

          <Text className="text-text-muted text-xs mb-2">Benutzername</Text>
          <TextInput
            value={username}
            onChangeText={setUsername}
            placeholder="Benutzername"
            placeholderTextColor="#525252"
            autoCapitalize="none"
            autoCorrect={false}
            className="bg-card border border-border rounded-xl px-4 py-3 text-white mb-4"
          />

          <Text className="text-text-muted text-xs mb-2">Passwort / App-Passwort</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Passwort"
            placeholderTextColor="#525252"
            secureTextEntry
            className="bg-card border border-border rounded-xl px-4 py-3 text-white mb-6"
          />

          <View className="flex-row gap-3 mb-6">
            <Pressable
              onPress={handleSave}
              disabled={saving}
              className="flex-1 bg-accent rounded-xl py-3 items-center active:opacity-80"
            >
              {saving ? (
                <ActivityIndicator size="small" color="#0a0a0a" />
              ) : (
                <Text className="text-background font-bold text-sm">Speichern</Text>
              )}
            </Pressable>
            <Pressable
              onPress={handleTest}
              disabled={testing}
              className="flex-1 bg-card border border-border rounded-xl py-3 items-center active:opacity-80"
            >
              {testing ? (
                <ActivityIndicator size="small" color="#a3a3a3" />
              ) : (
                <Text className="text-white font-bold text-sm">Testen</Text>
              )}
            </Pressable>
          </View>

          {status && (
            <View className="bg-card border border-border rounded-xl px-4 py-3 mb-6">
              <Text className="text-white text-sm">{status}</Text>
            </View>
          )}

          {isConfigured && (
            <>
              <Text className="text-text-secondary text-xs font-semibold uppercase tracking-widest mb-4">
                Backup & Wiederherstellung
              </Text>
              <Text className="text-text-muted text-xs mb-4 leading-5">
                Die Datenbank wird in der Cloud unter {'{Server}/remote.php/dav/files/{Benutzer}/LindyHop/'} gespeichert.
              </Text>

              <Pressable
                onPress={handleUpload}
                disabled={syncing !== null}
                className="bg-accent rounded-2xl py-4 items-center mb-3 active:opacity-80"
              >
                {syncing === 'upload' ? (
                  <ActivityIndicator size="small" color="#0a0a0a" />
                ) : (
                  <Text className="text-background font-bold text-base">⬆ Backup hochladen</Text>
                )}
              </Pressable>

              <Pressable
                onPress={handleDownload}
                disabled={syncing !== null}
                className="bg-card border border-accent rounded-2xl py-4 items-center mb-6 active:opacity-80"
              >
                {syncing === 'download' ? (
                  <ActivityIndicator size="small" color="#f59e0b" />
                ) : (
                  <Text className="text-accent font-bold text-base">⬇ Backup herunterladen</Text>
                )}
              </Pressable>
            </>
          )}

          {isConfigured && (
            <Pressable
              onPress={handleClear}
              className="py-3 items-center mb-8"
            >
              <Text className="text-error text-sm font-semibold">Zugangsdaten entfernen</Text>
            </Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
