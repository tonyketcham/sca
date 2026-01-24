import type { Unit } from '../geometry/units'

export type PaperSettings = {
  width: number
  height: number
  unit: Unit
  dpi: number
}

export type ObstacleSettings = {
  count: number
  minVertices: number
  maxVertices: number
  minRadius: number
  maxRadius: number
  margin: number
}

export type ExportSettings = {
  fps: number
  durationSeconds: number
  stepsPerFrame: number
  durationMode: 'fixed' | 'auto'
}

export type TemplateGridSettings = {
  rows: number
  cols: number
  gutter: number
  showGutter: boolean
  gutterAsObstacles: boolean
}

export type FrameConfig = {
  name: string
  params: import('../engine/simulationState').SimulationParams
  obstacles: ObstacleSettings
  renderSettings: import('../render/canvasRenderer').RenderSettings
  exportSettings: ExportSettings
  seed: number
  randomizeSeed: boolean
}

export type StatsSummary = {
  nodes: number
  attractors: number
  iterations: number
  completed: boolean
}

export type ConfigState = {
  schemaVersion: number
  paper: PaperSettings
  templateGrid: TemplateGridSettings
  frames: FrameConfig[]
  selectedFrameIndices: number[]
}

export type SavedEntry = {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  seed: number
  randomizeSeed: boolean
  payload: string
}
