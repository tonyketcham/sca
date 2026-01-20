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

export type StatsSummary = {
  nodes: number
  attractors: number
  iterations: number
  completed: boolean
}
