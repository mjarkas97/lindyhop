import { useCallback, useEffect, useState } from 'react'
import { useFocusEffect } from 'expo-router'
import {
  listEntries,
  type Entry,
  type ListEntriesOptions,
} from '../db/queries'

export function useEntries(options: ListEntriesOptions = {}) {
  const [entries, setEntries] = useState<Entry[]>([])

  const { search, art, sort } = options

  const reload = useCallback(() => {
    setEntries(listEntries({ search, art, sort }))
  }, [search, art, sort])

  useEffect(() => {
    reload()
  }, [reload])

  useFocusEffect(
    useCallback(() => {
      reload()
    }, [reload])
  )

  return { entries, reload }
}
