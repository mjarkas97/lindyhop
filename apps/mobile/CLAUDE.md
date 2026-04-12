# LindyHop Mobile — Project Notes

Lindy Hop practice app. User creates **entries** (moves/sequences/choreos), each with optional video. Local-only (expo-sqlite). No auth. German UI.

## Stack

- Expo SDK 54 / React Native 0.81 / React 19.1
- expo-router v6 (file-based, typed routes)
- NativeWind 4 (Tailwind RN)
- expo-sqlite (sync API: `openDatabaseSync`, `execSync`, `runSync`, `getAllSync`, `getFirstSync`)
- expo-image-picker, expo-video, expo-file-system/legacy
- expo-secure-store (NextCloud credentials)
- react-native-safe-area-context
- pnpm workspaces + Turborepo

## Data model

`entries` table (schema in `db/schema.ts`):
- `name` TEXT
- `art` TEXT — one of `choreography | sequence | figur | solo` (German labels via `ART_LABELS`)
- `taktzahl` INTEGER — one of `4 | 6 | 8 | 10`
- `video_uri` TEXT NULL (persisted in `documentDirectory/videos/`)
- `tags` TEXT (comma-separated)
- `note` TEXT
- `created_at` INTEGER

DB filename: `lindyhop_v2.db` (bump when schema changes; prior was `lindyhop.db` from Duolingo-era scaffold).

## Key files

- `db/schema.ts` — SQL + `ART_VALUES`/`ART_LABELS`/`TAKTZAHL_VALUES` enums
- `db/client.ts` — singleton `getDb()`, runs schema + seed on first open; also `getDbPath()` and `closeDb()` for sync
- `db/queries.ts` — `listEntries({search, art, sort})`, `getEntry`, `createEntry`, `updateEntry`, `deleteEntry`
- `db/seed.ts` — 6 sample entries, no videos
- `hooks/useEntries.ts` — reloads on option change + `useFocusEffect`
- `lib/videoStorage.ts` — `persistVideo` (copy to docs dir), `deleteVideo` (guarded to VIDEO_DIR)
- `lib/nextcloud.ts` — WebDAV sync via NextCloud: `uploadToNextCloud`, `downloadFromNextCloud`, `testConnection`, `saveConfig`/`loadConfig`/`clearConfig`
- `components/EntryForm.tsx` — shared new+edit form
- `components/VideoPicker.tsx` — upload/record/replace/remove
- `components/EntryCard.tsx`, `FilterChip.tsx`, `Highlight.tsx`, `Segmented.tsx`
- `app/_layout.tsx` — minimal Stack, calls `getDb()` once
- `app/index.tsx` — dashboard (search + art filter + sort + FAB + settings button)
- `app/settings.tsx` — NextCloud sync configuration
- `app/entry/new.tsx`, `app/entry/[id].tsx` (detail = editable)

## NextCloud Sync

Endpoint: `{serverUrl}/remote.php/dav/files/{username}/LindyHop/lindyhop_v2.db`

- Credentials stored via `expo-secure-store`
- Uses `SQLiteDatabase.serializeSync()` for upload (exports full DB as Uint8Array)
- Download writes raw bytes, closes DB, replaces file, reopens DB
- `db/client.ts` exposes `closeDb()` and `getDbPath()` for this flow

## Conventions

- German labels in UI ("Choreographie", "Sequenz", "Figur", "Solo", "Neueste", "Älteste", "Takte", "Hochladen", "Aufnehmen", "Ersetzen", "Entfernen", "Filter zurücksetzen")
- Dark palette, accent = amber `#f59e0b` (palette in `tailwind.config.js`)
- Bottom buttons/FAB use `useSafeAreaInsets()` — Samsung S24 gesture bar overlaps otherwise
- Inline icon hex colors (`#f59e0b`, `#525252`, `#a3a3a3`) mirror tailwind palette
- Plain hyphen in chip labels (no en-dash — some fonts render it as tofu)
- Filter rows use `flex-row flex-wrap`, not horizontal ScrollView (clips German labels)

## Video lifecycle

- ImagePicker returns temp URIs — always pipe through `persistVideo` before saving to DB
- Edit screen tracks `originalVideo` + `currentVideo` refs → on cancel or replace, delete abandoned file
- `deleteVideo` refuses paths outside `VIDEO_DIR` (safety)

## Build (Android APK)

```sh
# 1. Install deps
pnpm install

# 2. Regenerate Android project
pnpm --filter @lindyhop/mobile exec expo prebuild --clean --platform android

# 3. Bundle JS (use ABSOLUTE paths to avoid nested directory bug with pnpm exec)
pnpm --filter @lindyhop/mobile exec npx expo export:embed \\
  --platform android --dev false \\
  --entry-file $(pwd)/apps/mobile/index.js \\
  --bundle-output $(pwd)/apps/mobile/android/app/src/main/assets/index.android.bundle \\
  --assets-dest $(pwd)/apps/mobile/android/app/src/main/res

# 4. Build APK
cd apps/mobile/android && ./gradlew assembleDebug

# Output: apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

Requires: Java 17 JDK, Android SDK (platform 36, build-tools 36.0.0, NDK 27.1).

## Commands

- `pnpm --filter @lindyhop/mobile start` — Expo dev (user runs, don't auto-start)
- `pnpm --filter @lindyhop/mobile typecheck` — TS check
- Delete `.expo/types/router.d.ts` when typed-routes complains about removed routes

## Gotchas

- `params` in `listEntries` must be typed `(string | number)[]`, not `unknown[]` — SQLiteBindValue mismatch
- peer dep warning `react-dom 19.2.5 ↔ react 19.1.0` is non-fatal, ignore
- expo-video plugin in `app.json`: no background, no PiP
- NativeWind picks up `tailwind.config.js` via Metro — Fast Refresh usually works, else press `r` in Expo
- `newArchEnabled=true` required for `react-native-reanimated` and `react-native-worklets`
- `react-native-worklets@0.8.1` required for RN 0.81 compatibility
