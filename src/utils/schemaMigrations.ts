import type { ConfigState } from '../types/ui'

export const LATEST_SCHEMA_VERSION = 2

type Migration = (input: ConfigState) => ConfigState

const migrations: Record<number, Migration> = {
  1: (input) => ({ ...input, schemaVersion: 1 }),
  2: (input) => ({
    ...input,
    schemaVersion: 2,
    params: {
      ...input.params,
      seedPlacement: isSeedPlacement(input.params.seedPlacement) ? input.params.seedPlacement : 'edge',
      seedEdge: isSeedEdge(input.params.seedEdge) ? input.params.seedEdge : 'top',
      seedAngle: Number.isFinite(input.params.seedAngle) ? input.params.seedAngle : 0
    }
  })
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

function isSeedPlacement(value: unknown): value is ConfigState['params']['seedPlacement'] {
  return value === 'edge' || value === 'scatter'
}

function isSeedEdge(value: unknown): value is ConfigState['params']['seedEdge'] {
  return value === 'top' || value === 'bottom' || value === 'left' || value === 'right'
}
