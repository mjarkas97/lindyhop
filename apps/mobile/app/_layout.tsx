import '../global.css'

import React, { useEffect, useState } from 'react'
import { View, Text } from 'react-native'
import { Stack } from 'expo-router'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import { getDb } from '../db/client'

try {
  SplashScreen.preventAutoHideAsync()
} catch {}

export default function RootLayout() {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      getDb()
      setReady(true)
      SplashScreen.hideAsync()
    } catch (e) {
      setError(e instanceof Error ? `${e.name}: ${e.message}` : String(e))
      SplashScreen.hideAsync()
    }
  }, [])

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text style={{ color: '#ef4444', fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>Fehler beim Start</Text>
        <Text style={{ color: '#a3a3a3', fontSize: 13, fontFamily: 'monospace', textAlign: 'center' }}>{error}</Text>
      </View>
    )
  }

  if (!ready) return null

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#0a0a0a' },
            animation: 'fade',
          }}
        />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
