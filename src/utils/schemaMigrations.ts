import type { ConfigState } from '../types/ui'

export const LATEST_SCHEMA_VERSION = 1

type Migration = (input: ConfigState) => ConfigState

const migrations: Record<number, Migration> = {
  1: (input) => ({ ...input, schemaVersion: 1 })
}

export function migrateConfig(input: ConfigState): ConfigState | null {
  if (!Number.isFinite(input.schemaVersion)) {
    return null
  }

  const version = Math.floor(input.schemaVersion)
  if (version < 1 || version > LATEST_SCHEMA_VERSION) {
    return null
  }

  let current = { ...input, schemaVersion: version }
  for (let v = version; v < LATEST_SCHEMA_VERSION; v += 1) {
    const migrate = migrations[v + 1]
    if (!migrate) {
      return null
    }
    current = migrate(current)
  }

  return current
}
