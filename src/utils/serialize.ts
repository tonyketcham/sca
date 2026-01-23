import type { ConfigState } from '../types/ui'
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
    [config.paper.width, config.paper.height, config.paper.unit === 'in' ? 0 : 1, config.paper.dpi],
    [
      config.params.influenceRadius,
      config.params.killRadius,
      config.params.stepSize,
      config.params.maxNodes,
      config.params.seedCount,
      config.params.seedSpread,
      config.params.seedPlacement === 'scatter' ? 1 : 0,
      config.params.seedEdge === 'bottom' ? 1 : config.params.seedEdge === 'left' ? 2 : config.params.seedEdge === 'right' ? 3 : 0,
      config.params.seedAngle,
      config.params.attractorCount,
      config.params.stepsPerFrame,
      config.params.avoidObstacles ? 1 : 0
    ],
    [
      config.obstacles.count,
      config.obstacles.minVertices,
      config.obstacles.maxVertices,
      config.obstacles.minRadius,
      config.obstacles.maxRadius,
      config.obstacles.margin
    ],
    [
      config.renderSettings.showAttractors ? 1 : 0,
      config.renderSettings.showNodes ? 1 : 0,
      config.renderSettings.showObstacles ? 1 : 0,
      config.renderSettings.strokeWidth,
      config.renderSettings.nodeRadius,
      config.renderSettings.rootColor,
      config.renderSettings.obstacleFill,
      config.renderSettings.attractorColor
    ],
    [
      config.exportSettings.fps,
      config.exportSettings.durationSeconds,
      config.exportSettings.stepsPerFrame,
      config.exportSettings.durationMode === 'fixed' ? 0 : 1
    ],
    config.seed,
    config.randomizeSeed ? 1 : 0
  ]
}

function fromCompact(input: unknown): ConfigState | null {
  if (!Array.isArray(input)) return null
  const version = Number(input[0])
  if (!Number.isFinite(version)) return null
  const paper = input[1] as CompactConfig
  const params = input[2] as CompactConfig
  const obstacles = input[3] as CompactConfig
  const render = input[4] as CompactConfig
  const exportSettings = input[5] as CompactConfig

  if (!paper || !params || !obstacles || !render || !exportSettings) return null

  const parsedParams: ConfigState['params'] =
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
      unit: Number(paper[2]) === 0 ? 'in' : 'cm',
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
