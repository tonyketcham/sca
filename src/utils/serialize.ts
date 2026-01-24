import type { ConfigState, FrameConfig } from '../types/ui'
import { LATEST_SCHEMA_VERSION, migrateConfig } from './schemaMigrations'

type CompactConfig = (number | string | null | CompactConfig)[]

export function encodeConfig(config: ConfigState): string {
  const compact = toCompact({ ...config, schemaVersion: LATEST_SCHEMA_VERSION })
  const json = JSON.stringify(compact)
  const compressed = lzwCompress(json)
  return base64UrlEncode(new Uint8Array(compressed.buffer))
}

export function decodeConfig(encoded: string): ConfigState | null {
  try {
    const bytes = base64UrlDecode(encoded)
    const json = lzwDecompress(new Uint16Array(bytes.buffer))
    const parsed = JSON.parse(json)
    const raw = fromCompact(parsed)
    return raw ? migrateConfig(raw) : null
  } catch {
    return null
  }
}

function toCompact(config: ConfigState): CompactConfig {
  return [
    LATEST_SCHEMA_VERSION,
    [config.paper.width, config.paper.height, unitToCompact(config.paper.unit), config.paper.dpi],
    [
      config.templateGrid.rows,
      config.templateGrid.cols,
      config.templateGrid.gutter,
      config.templateGrid.showGutter ? 1 : 0,
      config.templateGrid.gutterAsObstacles ? 1 : 0
    ],
    config.frames.map((frame) => frameToCompact(frame)),
    config.selectedFrameIndices
  ]
}

function fromCompact(input: unknown): ConfigState | null {
  if (!Array.isArray(input)) return null
  const version = Number(input[0])
  if (!Number.isFinite(version)) return null
  const paper = input[1] as CompactConfig
  if (!paper) return null

  if (version >= 5) {
    const grid = input[2] as CompactConfig
    const frames = input[3] as CompactConfig
    const selected = input[4] as CompactConfig
    if (!grid || !Array.isArray(frames) || !Array.isArray(selected)) return null
    const parsedFrames = frames
      .map((item) => (Array.isArray(item) ? frameFromCompact(item as CompactConfig) : null))
      .filter(Boolean) as FrameConfig[]
    return {
      schemaVersion: version,
      paper: {
        width: Number(paper[0]),
        height: Number(paper[1]),
        unit: compactToUnit(paper[2]),
        dpi: Number(paper[3])
      },
      templateGrid: {
        rows: Number(grid[0]),
        cols: Number(grid[1]),
        gutter: Number(grid[2]),
        showGutter: Number(grid[3]) === 1,
        gutterAsObstacles: Number(grid[4]) === 1
      },
      frames: parsedFrames,
      selectedFrameIndices: selected.map((value) => Number(value))
    }
  }

  if (version >= 4) {
    const grid = input[2] as CompactConfig
    const frames = input[3] as CompactConfig
    if (!grid || !Array.isArray(frames)) return null
    const parsedFrames = frames
      .map((item) => (Array.isArray(item) ? frameFromCompact(item as CompactConfig) : null))
      .filter(Boolean) as FrameConfig[]
    return {
      schemaVersion: version,
      paper: {
        width: Number(paper[0]),
        height: Number(paper[1]),
        unit: compactToUnit(paper[2]),
        dpi: Number(paper[3])
      },
      templateGrid: {
        rows: Number(grid[0]),
        cols: Number(grid[1]),
        gutter: Number(grid[2]),
        showGutter: Number(grid[3]) === 1,
        gutterAsObstacles: Number(grid[4]) === 1
      },
      frames: parsedFrames,
      selectedFrameIndices: [Number(input[4])]
    }
  }

  const params = input[2] as CompactConfig
  const obstacles = input[3] as CompactConfig
  const render = input[4] as CompactConfig
  const exportSettings = input[5] as CompactConfig
  if (!params || !obstacles || !render || !exportSettings) return null

  const parsedParams =
    version >= 2
      ? {
          influenceRadius: Number(params[0]),
          killRadius: Number(params[1]),
          stepSize: Number(params[2]),
          maxNodes: Number(params[3]),
          seedCount: Number(params[4]),
          seedSpread: Number(params[5]),
          seedPlacement: Number(params[6]) === 1 ? 'scatter' : 'edge',
          seedEdge:
            Number(params[7]) === 1
              ? 'bottom'
              : Number(params[7]) === 2
              ? 'left'
              : Number(params[7]) === 3
              ? 'right'
              : 'top',
          seedAngle: Number(params[8]),
          attractorCount: Number(params[9]),
          stepsPerFrame: Number(params[10]),
          avoidObstacles: Number(params[11]) === 1
        }
      : {
          influenceRadius: Number(params[0]),
          killRadius: Number(params[1]),
          stepSize: Number(params[2]),
          maxNodes: Number(params[3]),
          seedCount: Number(params[4]),
          seedSpread: Number(params[5]),
          seedPlacement: 'edge',
          seedEdge: 'top',
          seedAngle: 0,
          attractorCount: Number(params[6]),
          stepsPerFrame: Number(params[7]),
          avoidObstacles: Number(params[8]) === 1
        }

  return {
    schemaVersion: version,
    paper: {
      width: Number(paper[0]),
      height: Number(paper[1]),
      unit: compactToUnit(paper[2]),
      dpi: Number(paper[3])
    },
    params: parsedParams,
    obstacles: {
      count: Number(obstacles[0]),
      minVertices: Number(obstacles[1]),
      maxVertices: Number(obstacles[2]),
      minRadius: Number(obstacles[3]),
      maxRadius: Number(obstacles[4]),
      margin: Number(obstacles[5])
    },
    renderSettings: {
      showAttractors: Number(render[0]) === 1,
      showNodes: Number(render[1]) === 1,
      showObstacles: Number(render[2]) === 1,
      strokeWidth: Number(render[3]),
      nodeRadius: Number(render[4]),
      rootColor: String(render[5]),
      obstacleFill: String(render[6]),
      attractorColor: String(render[7])
    },
    exportSettings: {
      fps: Number(exportSettings[0]),
      durationSeconds: Number(exportSettings[1]),
      stepsPerFrame: Number(exportSettings[2]),
      durationMode: Number(exportSettings[3]) === 0 ? 'fixed' : 'auto'
    },
    seed: Number(input[6]),
    randomizeSeed: Number(input[7]) === 1
  } as unknown as ConfigState
}

function unitToCompact(unit: ConfigState['paper']['unit']): number {
  switch (unit) {
    case 'in':
      return 0
    case 'cm':
      return 1
    case 'mm':
      return 2
    default:
      return 0
  }
}

function compactToUnit(value: unknown): ConfigState['paper']['unit'] {
  const unit = Number(value)
  if (unit === 0) return 'in'
  if (unit === 1) return 'cm'
  if (unit === 2) return 'mm'
  return 'in'
}

function frameToCompact(frame: FrameConfig): CompactConfig {
  return [
    [
      frame.params.influenceRadius,
      frame.params.killRadius,
      frame.params.stepSize,
      frame.params.maxNodes,
      frame.params.seedCount,
      frame.params.seedSpread,
      frame.params.seedPlacement === 'scatter' ? 1 : 0,
      frame.params.seedEdge === 'bottom' ? 1 : frame.params.seedEdge === 'left' ? 2 : frame.params.seedEdge === 'right' ? 3 : 0,
      frame.params.seedAngle,
      frame.params.attractorCount,
      frame.params.stepsPerFrame,
      frame.params.avoidObstacles ? 1 : 0
    ],
    [
      frame.obstacles.count,
      frame.obstacles.minVertices,
      frame.obstacles.maxVertices,
      frame.obstacles.minRadius,
      frame.obstacles.maxRadius,
      frame.obstacles.margin
    ],
    [
      frame.renderSettings.showAttractors ? 1 : 0,
      frame.renderSettings.showNodes ? 1 : 0,
      frame.renderSettings.showObstacles ? 1 : 0,
      frame.renderSettings.strokeWidth,
      frame.renderSettings.nodeRadius,
      frame.renderSettings.rootColor,
      frame.renderSettings.obstacleFill,
      frame.renderSettings.attractorColor
    ],
    [
      frame.exportSettings.fps,
      frame.exportSettings.durationSeconds,
      frame.exportSettings.stepsPerFrame,
      frame.exportSettings.durationMode === 'fixed' ? 0 : 1
    ],
    frame.seed,
    frame.randomizeSeed ? 1 : 0
  ]
}

function frameFromCompact(input: CompactConfig): FrameConfig {
  const params = input[0] as CompactConfig
  const obstacles = input[1] as CompactConfig
  const render = input[2] as CompactConfig
  const exportSettings = input[3] as CompactConfig
  return {
    params: {
      influenceRadius: Number(params[0]),
      killRadius: Number(params[1]),
      stepSize: Number(params[2]),
      maxNodes: Number(params[3]),
      seedCount: Number(params[4]),
      seedSpread: Number(params[5]),
      seedPlacement: Number(params[6]) === 1 ? 'scatter' : 'edge',
      seedEdge:
        Number(params[7]) === 1
          ? 'bottom'
          : Number(params[7]) === 2
          ? 'left'
          : Number(params[7]) === 3
          ? 'right'
          : 'top',
      seedAngle: Number(params[8]),
      attractorCount: Number(params[9]),
      stepsPerFrame: Number(params[10]),
      avoidObstacles: Number(params[11]) === 1
    },
    obstacles: {
      count: Number(obstacles[0]),
      minVertices: Number(obstacles[1]),
      maxVertices: Number(obstacles[2]),
      minRadius: Number(obstacles[3]),
      maxRadius: Number(obstacles[4]),
      margin: Number(obstacles[5])
    },
    renderSettings: {
      showAttractors: Number(render[0]) === 1,
      showNodes: Number(render[1]) === 1,
      showObstacles: Number(render[2]) === 1,
      strokeWidth: Number(render[3]),
      nodeRadius: Number(render[4]),
      rootColor: String(render[5]),
      obstacleFill: String(render[6]),
      attractorColor: String(render[7])
    },
    exportSettings: {
      fps: Number(exportSettings[0]),
      durationSeconds: Number(exportSettings[1]),
      stepsPerFrame: Number(exportSettings[2]),
      durationMode: Number(exportSettings[3]) === 0 ? 'fixed' : 'auto'
    },
    seed: Number(input[4]),
    randomizeSeed: Number(input[5]) === 1
  }
}

function lzwCompress(input: string): Uint16Array {
  const dictionary = new Map<string, number>()
  for (let i = 0; i < 256; i += 1) {
    dictionary.set(String.fromCharCode(i), i)
  }
  let dictSize = 256
  let w = ''
  const result: number[] = []
  for (let i = 0; i < input.length; i += 1) {
    const c = input.charAt(i)
    const wc = w + c
    if (dictionary.has(wc)) {
      w = wc
    } else {
      if (w) {
        result.push(dictionary.get(w)!)
      }
      dictionary.set(wc, dictSize)
      dictSize += 1
      w = c
    }
  }
  if (w) {
    result.push(dictionary.get(w)!)
  }
  return Uint16Array.from(result)
}

function lzwDecompress(data: Uint16Array): string {
  if (data.length === 0) return ''
  const dictionary: string[] = []
  for (let i = 0; i < 256; i += 1) {
    dictionary[i] = String.fromCharCode(i)
  }
  let dictSize = 256
  let w = dictionary[data[0]]
  let result = w
  for (let i = 1; i < data.length; i += 1) {
    const k = data[i]
    let entry = dictionary[k]
    if (entry === undefined) {
      if (k === dictSize) {
        entry = w + w.charAt(0)
      } else {
        return ''
      }
    }
    result += entry
    dictionary[dictSize] = w + entry.charAt(0)
    dictSize += 1
    w = entry
  }
  return result
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function base64UrlDecode(input: string): Uint8Array {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(input.length / 4) * 4, '=')
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}
