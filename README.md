# LindyHop

Mobile learning app for Lindy Hop, Duolingo-style. Early prototype.

## Stack

- Expo SDK 54 + expo-router v6
- React Native 0.81
- NativeWind 4 (Tailwind for RN)
- Local SQLite via `expo-sqlite`

No auth, no server. All state is on-device.

## Run

```bash
pnpm install
pnpm --filter @lindyhop/mobile start
```

Then press `i`, `a`, `w`, or scan the QR with Expo Go.

## Structure

```
apps/mobile/
├── app/                  # expo-router file-based routes
│   ├── _layout.tsx       # root stack, DB init
│   ├── index.tsx         # Level 1 dashboard (Duolingo path)
│   └── lesson/[id].tsx   # single lesson
├── components/           # LevelHeader, LessonNode
├── db/                   # SQLite client, schema, seed, queries
└── hooks/                # useLessons
```

## Typecheck

```bash
pnpm --filter @lindyhop/mobile typecheck
```
