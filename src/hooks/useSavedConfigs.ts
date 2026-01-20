import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ConfigState, SavedEntry } from '../types/ui'
import { decodeConfig, encodeConfig } from '../utils/serialize'

const CURRENT_KEY = 'sca.current'
const SAVED_KEY = 'sca.saved'

type UseSavedConfigsOptions = {
  enabled: boolean
}

export function useSavedConfigs(config: ConfigState, options: UseSavedConfigsOptions) {
  const [savedEntries, setSavedEntries] = useState<SavedEntry[]>(() => loadSavedEntries())

  useEffect(() => {
    if (!options.enabled) return
    const payload = encodeConfig(config)
    localStorage.setItem(CURRENT_KEY, payload)
  }, [config, options.enabled])

  const refreshEntries = useCallback(() => {
    setSavedEntries(loadSavedEntries())
  }, [])

  const saveManualEntry = useCallback(
    (name?: string) => {
      const payload = encodeConfig(config)
      const timestamp = Date.now()
      const entry: SavedEntry = {
        id: `save_${timestamp}_${Math.floor(Math.random() * 1000)}`,
        name: name && name.trim().length > 0 ? name.trim() : `Saved ${new Date(timestamp).toLocaleString()}`,
        createdAt: timestamp,
        updatedAt: timestamp,
        seed: config.seed,
        randomizeSeed: config.randomizeSeed,
        payload
      }
      const nextEntries = [entry, ...savedEntries]
      persistSavedEntries(nextEntries)
      setSavedEntries(nextEntries)
      return entry
    },
    [config, savedEntries]
  )

  const deleteEntry = useCallback(
    (id: string) => {
      const nextEntries = savedEntries.filter((entry) => entry.id !== id)
      persistSavedEntries(nextEntries)
      setSavedEntries(nextEntries)
    },
    [savedEntries]
  )

  const getEntryConfig = useCallback((id: string): ConfigState | null => {
    const entry = savedEntries.find((item) => item.id === id)
    if (!entry) return null
    return decodeConfig(entry.payload)
  }, [savedEntries])

  const currentConfig = useMemo(() => {
    const stored = localStorage.getItem(CURRENT_KEY)
    return stored ? decodeConfig(stored) : null
  }, [])

  return {
    savedEntries,
    refreshEntries,
    saveManualEntry,
    deleteEntry,
    getEntryConfig,
    currentConfig
  }
}

function loadSavedEntries(): SavedEntry[] {
  try {
    const raw = localStorage.getItem(SAVED_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((entry) => entry && typeof entry.id === 'string') as SavedEntry[]
  } catch {
    return []
  }
}

function persistSavedEntries(entries: SavedEntry[]) {
  localStorage.setItem(SAVED_KEY, JSON.stringify(entries))
}
