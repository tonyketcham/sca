import { useEffect, useState } from 'react'

type UiContextStore = Record<string, unknown>

const STORAGE_KEY = 'sca.ui.context'

function readStore(): UiContextStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as UiContextStore
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return parsed
  } catch {
    return {}
  }
}

function writeStore(store: UiContextStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

function readValue<T>(key: string): T | undefined {
  const store = readStore()
  return store[key] as T | undefined
}

function writeValue<T>(key: string, value: T) {
  const store = readStore()
  store[key] = value
  writeStore(store)
}

export function registerUiContext<T>(
  key: string,
  valueOrUpdater: T | ((prev: T | undefined) => T)
): T {
  const prev = readValue<T>(key)
  const next =
    typeof valueOrUpdater === 'function'
      ? (valueOrUpdater as (prev: T | undefined) => T)(prev)
      : valueOrUpdater
  writeValue(key, next)
  return next
}

type UseUiContextOptions<T> = {
  merge?: (stored: T | undefined) => T
}

export function useUiContextState<T>(
  key: string,
  defaultValue: T,
  options?: UseUiContextOptions<T>
) {
  const [value, setValue] = useState<T>(() => {
    const stored = readValue<T>(key)
    if (options?.merge) return options.merge(stored)
    return stored ?? defaultValue
  })

  useEffect(() => {
    writeValue(key, value)
  }, [key, value])

  return [value, setValue] as const
}
