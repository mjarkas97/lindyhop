import React, { useMemo, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Segmented } from './Segmented'
import { VideoPicker } from './VideoPicker'
import {
  ART_LABELS,
  ART_VALUES,
  TAKTZAHL_VALUES,
  type Art,
  type Taktzahl,
} from '../db/schema'
import { listAllTags, type EntryInput } from '../db/queries'

const ART_OPTIONS = ART_VALUES.map((v) => ({ value: v, label: ART_LABELS[v] }))
const TAKT_OPTIONS = TAKTZAHL_VALUES.map((v) => ({
  value: v,
  label: String(v),
}))

const MAX_SUGGESTIONS = 8

interface Props {
  initial?: Partial<EntryInput>
  submitLabel: string
  onSubmit: (values: EntryInput) => void | Promise<void>
  onVideoChange?: (uri: string | null) => void
}

export function EntryForm({
  initial,
  submitLabel,
  onSubmit,
  onVideoChange,
}: Props) {
  const insets = useSafeAreaInsets()

  const [name, setName] = useState(initial?.name ?? '')
  const [art, setArt] = useState<Art>(initial?.art ?? 'figur')
  const [taktzahl, setTaktzahl] = useState<Taktzahl>(initial?.taktzahl ?? 8)
  const [videoUri, setVideoUri] = useState<string | null>(
    initial?.video_uri ?? null
  )
  const [tags, setTags] = useState(initial?.tags ?? '')
  const [note, setNote] = useState(initial?.note ?? '')
  const [saving, setSaving] = useState(false)

  const allTags = useMemo(() => listAllTags(), [])

  const { existingTokens, currentToken } = parseTagTokens(tags)

  const suggestions = useMemo(() => {
    const existingLower = new Set(existingTokens.map((t) => t.toLowerCase()))
    const q = currentToken.toLowerCase()
    const matches = allTags.filter((t) => {
      const lower = t.toLowerCase()
      if (existingLower.has(lower)) return false
      if (!q) return true
      return lower.includes(q) && lower !== q
    })
    return matches.slice(0, MAX_SUGGESTIONS)
  }, [allTags, existingTokens, currentToken])

  const pickTag = (tag: string) => {
    const next = [...existingTokens, tag].join(', ') + ', '
    setTags(next)
  }

  const handleVideoChange = (next: string | null) => {
    setVideoUri(next)
    onVideoChange?.(next)
  }

  const handleSubmit = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      Alert.alert('Name fehlt', 'Bitte gib einen Namen ein.')
      return
    }
    setSaving(true)
    try {
      await onSubmit({
        name: trimmed,
        art,
        taktzahl,
        video_uri: videoUri,
        tags: normalizeTagString(tags),
        note: note.trim(),
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <Field label="Name">
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="z. B. Swing Out"
            placeholderTextColor="#525252"
            className="bg-card border border-border rounded-xl px-4 py-3 text-white"
          />
        </Field>

        <Field label="Art">
          <Segmented options={ART_OPTIONS} value={art} onChange={setArt} />
        </Field>

        <Field label="Taktzahl">
          <Segmented
            options={TAKT_OPTIONS}
            value={taktzahl}
            onChange={setTaktzahl}
          />
        </Field>

        <Field label="Video">
          <VideoPicker value={videoUri} onChange={handleVideoChange} />
        </Field>

        <Field label="Tags" hint="Mit Komma trennen: basics, turn, 8-count">
          <TextInput
            value={tags}
            onChangeText={setTags}
            placeholder="basics, turn, 8-count"
            placeholderTextColor="#525252"
            autoCapitalize="none"
            autoCorrect={false}
            className="bg-card border border-border rounded-xl px-4 py-3 text-white"
          />
          {suggestions.length > 0 ? (
            <View className="flex-row flex-wrap gap-2 mt-2">
              {suggestions.map((t) => (
                <Pressable
                  key={t}
                  onPressIn={() => pickTag(t)}
                  className="px-3 py-1.5 rounded-full bg-accent/15 border border-accent/40 active:opacity-70"
                >
                  <Text className="text-accent text-xs font-semibold">
                    #{t}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </Field>

        <Field label="Notiz">
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Ergänzende Gedanken, Counts, Hinweise …"
            placeholderTextColor="#525252"
            multiline
            className="bg-card border border-border rounded-xl px-4 py-3 text-white min-h-[120px]"
            style={{ textAlignVertical: 'top' }}
          />
        </Field>
      </ScrollView>

      <View
        className="px-5"
        style={{ paddingBottom: Math.max(insets.bottom, 16) + 8 }}
      >
        <Pressable
          onPress={handleSubmit}
          disabled={saving}
          className="bg-accent rounded-2xl py-4 items-center active:opacity-80"
        >
          <Text className="text-background font-bold text-base">
            {submitLabel}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  )
}

function parseTagTokens(raw: string): {
  existingTokens: string[]
  currentToken: string
} {
  const parts = raw.split(',')
  const last = parts[parts.length - 1] ?? ''
  const existing = parts.slice(0, -1).map((p) => p.trim()).filter(Boolean)
  return { existingTokens: existing, currentToken: last.trim() }
}

function normalizeTagString(raw: string): string {
  const seen = new Set<string>()
  const out: string[] = []
  for (const part of raw.split(',')) {
    const t = part.trim()
    if (!t) continue
    const key = t.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(t)
  }
  return out.join(', ')
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <View className="mt-5">
      <Text className="text-text-secondary text-xs font-semibold uppercase tracking-widest mb-2">
        {label}
      </Text>
      {children}
      {hint ? (
        <Text className="text-text-muted text-xs mt-2">{hint}</Text>
      ) : null}
    </View>
  )
}
