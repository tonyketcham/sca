import type { ConfigState, ExportSettings, FrameConfig, ObstacleSettings, TemplateGridSettings } from '../types/ui'
import type { SimulationParams } from '../engine/simulationState'
import type { RenderSettings } from '../render/canvasRenderer'

export const LATEST_SCHEMA_VERSION = 5

type Migration = (input: any) => any

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
  }),
  3: (input) => ({
    ...input,
    schemaVersion: 3,
    paper: {
      ...input.paper,
      unit: isUnit(input.paper.unit) ? input.paper.unit : 'in'
    }
  }),
  4: (input) => ({
    schemaVersion: 4,
    paper: { ...input.paper },
    templateGrid: normalizeTemplateGrid(input.templateGrid),
    frames: normalizeFrames(input),
    activeFrameIndex: Number.isFinite(input.activeFrameIndex) ? Math.max(0, Math.floor(input.activeFrameIndex)) : 0
  }),
  5: (input) => {
    const frames = normalizeFrames(input)
    const legacyIndex = Number.isFinite(input.activeFrameIndex)
      ? Math.max(0, Math.floor(input.activeFrameIndex))
      : 0
    const selectionSource = Array.isArray(input.selectedFrameIndices)
      ? input.selectedFrameIndices
      : [legacyIndex]
    return {
      schemaVersion: 5,
      paper: { ...input.paper },
      templateGrid: normalizeTemplateGrid(input.templateGrid),
      frames,
      selectedFrameIndices: normalizeSelection(selectionSource, frames.length)
    }
  }
}

export function migrateConfig(input: ConfigState): ConfigState | null {
  if (!Number.isFinite(input.schemaVersion)) {
    return null
  }

  const version = Math.floor(input.schemaVersion)
  if (version < 1 || version > LATEST_SCHEMA_VERSION) {
    return null
  }

  let current: any = { ...input, schemaVersion: version }
  for (let v = version; v < LATEST_SCHEMA_VERSION; v += 1) {
    const migrate = migrations[v + 1]
    if (!migrate) {
      return null
    }
    current = migrate(current)
  }

  return current as ConfigState
}

function isSeedPlacement(value: unknown): value is SimulationParams['seedPlacement'] {
  return value === 'edge' || value === 'scatter'
}

function isSeedEdge(value: unknown): value is SimulationParams['seedEdge'] {
  return value === 'top' || value === 'bottom' || value === 'left' || value === 'right'
}

function isUnit(value: unknown): value is ConfigState['paper']['unit'] {
  return value === 'in' || value === 'cm' || value === 'mm'
}

function normalizeTemplateGrid(input: Partial<TemplateGridSettings> | undefined): TemplateGridSettings {
  return {
    rows: Math.max(1, Math.floor(Number(input?.rows ?? 1))),
    cols: Math.max(1, Math.floor(Number(input?.cols ?? 1))),
    gutter: Number.isFinite(input?.gutter) ? Number(input?.gutter) : 0,
    showGutter: typeof input?.showGutter === 'boolean' ? input.showGutter : true,
    gutterAsObstacles: typeof input?.gutterAsObstacles === 'boolean' ? input.gutterAsObstacles : false
  }
}

function normalizeFrames(input: any): FrameConfig[] {
  if (Array.isArray(input.frames) && input.frames.length > 0) {
    return input.frames.map((frame: unknown) => normalizeFrame(frame as Partial<FrameConfig>))
  }
  const legacy = input as {
    params?: SimulationParams
    obstacles?: ObstacleSettings
    renderSettings?: RenderSettings
    exportSettings?: ExportSettings
    seed?: number
    randomizeSeed?: boolean
  }
  return [
    normalizeFrame({
      params: legacy.params,
      obstacles: legacy.obstacles,
      renderSettings: legacy.renderSettings,
      exportSettings: legacy.exportSettings,
      seed: legacy.seed,
      randomizeSeed: legacy.randomizeSeed
    })
  ]
}

function normalizeSelection(input: unknown, length: number): number[] {
  if (!Array.isArray(input) || length < 1) return []
  const next: number[] = []
  const seen = new Set<number>()
  for (const raw of input) {
    if (!Number.isFinite(raw)) continue
    const index = Math.floor(Number(raw))
    if (index < 0 || index >= length) continue
    if (seen.has(index)) continue
    seen.add(index)
    next.push(index)
  }
  return next
}

function normalizeFrame(frame: Partial<FrameConfig> & {
  params?: SimulationParams
  obstacles?: ObstacleSettings
  renderSettings?: RenderSettings
  exportSettings?: ExportSettings
}): FrameConfig {
  return {
    params: {
      influenceRadius: Number(frame.params?.influenceRadius ?? 80),
      killRadius: Number(frame.params?.killRadius ?? 16),
      stepSize: Number(frame.params?.stepSize ?? 6),
      maxNodes: Number(frame.params?.maxNodes ?? 4000),
      seedCount: Number(frame.params?.seedCount ?? 3),
      seedSpread: Number(frame.params?.seedSpread ?? 30),
      seedPlacement: isSeedPlacement(frame.params?.seedPlacement) ? frame.params!.seedPlacement : 'edge',
      seedEdge: isSeedEdge(frame.params?.seedEdge) ? frame.params!.seedEdge : 'top',
      seedAngle: Number(frame.params?.seedAngle ?? 0),
      attractorCount: Number(frame.params?.attractorCount ?? 900),
      stepsPerFrame: Number(frame.params?.stepsPerFrame ?? 3),
      avoidObstacles: typeof frame.params?.avoidObstacles === 'boolean' ? frame.params.avoidObstacles : true
    },
    obstacles: {
      count: Number(frame.obstacles?.count ?? 4),
      minVertices: Number(frame.obstacles?.minVertices ?? 4),
      maxVertices: Number(frame.obstacles?.maxVertices ?? 7),
      minRadius: Number(frame.obstacles?.minRadius ?? 0.6),
      maxRadius: Number(frame.obstacles?.maxRadius ?? 1.8),
      margin: Number(frame.obstacles?.margin ?? 0.4)
    },
    renderSettings: {
      showAttractors: typeof frame.renderSettings?.showAttractors === 'boolean' ? frame.renderSettings.showAttractors : false,
      showNodes: typeof frame.renderSettings?.showNodes === 'boolean' ? frame.renderSettings.showNodes : false,
      showObstacles: typeof frame.renderSettings?.showObstacles === 'boolean' ? frame.renderSettings.showObstacles : true,
      strokeWidth: Number(frame.renderSettings?.strokeWidth ?? 1.4),
      nodeRadius: Number(frame.renderSettings?.nodeRadius ?? 1.5),
      rootColor: String(frame.renderSettings?.rootColor ?? '#2d3b2c'),
      obstacleFill: String(frame.renderSettings?.obstacleFill ?? '#c85e5e'),
      attractorColor: String(frame.renderSettings?.attractorColor ?? '#2f80ed')
    },
    exportSettings: {
      fps: Number(frame.exportSettings?.fps ?? 30),
      durationSeconds: Number(frame.exportSettings?.durationSeconds ?? 6),
      stepsPerFrame: Number(frame.exportSettings?.stepsPerFrame ?? 3),
      durationMode: frame.exportSettings?.durationMode === 'auto' ? 'auto' : 'fixed'
    },
    seed: Number.isFinite(frame.seed) ? Number(frame.seed) : 0,
    randomizeSeed: typeof frame.randomizeSeed === 'boolean' ? frame.randomizeSeed : true
  }
}
