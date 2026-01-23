import { isPointInPolygon, type Polygon } from '../obstacles/polygons'
import type { Rng } from '../utils/rng'

export type Vec2 = {
  x: number
  y: number
}

export type Bounds = {
  width: number
  height: number
}

export type Attractor = Vec2

export type Node = Vec2 & {
  parent: number | null
}

export type SimulationParams = {
  influenceRadius: number
  killRadius: number
  stepSize: number
  maxNodes: number
  seedCount: number
  seedSpread: number
  seedPlacement: 'edge' | 'scatter'
  seedEdge: 'top' | 'bottom' | 'left' | 'right'
  seedAngle: number
  attractorCount: number
  stepsPerFrame: number
  avoidObstacles: boolean
}

export type SimulationState = {
  bounds: Bounds
  nodes: Node[]
  attractors: Attractor[]
  obstacles: Polygon[]
  iterations: number
  completed: boolean
}

export function createSimulationState(
  bounds: Bounds,
  params: SimulationParams,
  obstacles: Polygon[],
  rng: Rng = Math.random
): SimulationState {
  const nodes = createSeedNodes(bounds, params, rng)
  const attractors = createAttractors(bounds, params, obstacles, rng)
  return {
    bounds,
    nodes,
    attractors,
    obstacles,
    iterations: 0,
    completed: false
  }
}

export function cloneSimulationState(state: SimulationState): SimulationState {
  return {
    bounds: { ...state.bounds },
    nodes: state.nodes.map((node) => ({ ...node })),
    attractors: state.attractors.map((attractor) => ({ ...attractor })),
    obstacles: state.obstacles.map((polygon) => polygon.map((point) => ({ ...point }))),
    iterations: state.iterations,
    completed: state.completed
  }
}

function createSeedNodes(bounds: Bounds, params: SimulationParams, rng: Rng): Node[] {
  const margin = Math.max(6, params.stepSize)
  const count = Math.max(1, Math.floor(params.seedCount))
  const spreadPercent = clamp(params.seedSpread / 100, 0, 1)

  if (params.seedPlacement === 'scatter') {
    const spreadX = bounds.width * spreadPercent
    const spreadY = bounds.height * spreadPercent
    const centerX = bounds.width * 0.5
    const centerY = bounds.height * 0.5
    return Array.from({ length: count }, () => ({
      x: clamp(centerX + (rng() - 0.5) * spreadX, margin, bounds.width - margin),
      y: clamp(centerY + (rng() - 0.5) * spreadY, margin, bounds.height - margin),
      parent: null
    }))
  }

  const center = getSeedEdgeCenter(bounds, margin, params.seedEdge)
  const baseDirection = getSeedEdgeDirection(params.seedEdge)
  const angle = (params.seedAngle * Math.PI) / 180
  const direction = rotate(baseDirection, angle)
  const spread = (isHorizontalEdge(params.seedEdge) ? bounds.width : bounds.height) * spreadPercent
  const startOffset = -spread * 0.5
  const step = count === 1 ? 0 : spread / (count - 1)

  return Array.from({ length: count }, (_, index) => {
    const offset = startOffset + step * index
    return {
      x: clamp(center.x + direction.x * offset, margin, bounds.width - margin),
      y: clamp(center.y + direction.y * offset, margin, bounds.height - margin),
      parent: null
    }
  })
}

function createAttractors(
  bounds: Bounds,
  params: SimulationParams,
  obstacles: Polygon[],
  rng: Rng
): Attractor[] {
  const attractors: Attractor[] = []
  const maxAttempts = params.attractorCount * 20
  let attempts = 0

  while (attractors.length < params.attractorCount && attempts < maxAttempts) {
    attempts += 1
    const point = {
      x: rng() * bounds.width,
      y: rng() * bounds.height
    }
    if (!isPointInsideAnyObstacle(point, obstacles)) {
      attractors.push(point)
    }
  }

  return attractors
}

function isPointInsideAnyObstacle(point: Vec2, obstacles: Polygon[]): boolean {
  for (const polygon of obstacles) {
    if (isPointInPolygon(point, polygon)) {
      return true
    }
  }
  return false
}

function getSeedEdgeCenter(bounds: Bounds, margin: number, edge: SimulationParams['seedEdge']): Vec2 {
  switch (edge) {
    case 'left':
      return { x: margin, y: bounds.height * 0.5 }
    case 'right':
      return { x: bounds.width - margin, y: bounds.height * 0.5 }
    case 'bottom':
      return { x: bounds.width * 0.5, y: bounds.height - margin }
    case 'top':
    default:
      return { x: bounds.width * 0.5, y: margin }
  }
}

function getSeedEdgeDirection(edge: SimulationParams['seedEdge']): Vec2 {
  return isHorizontalEdge(edge) ? { x: 1, y: 0 } : { x: 0, y: 1 }
}

function isHorizontalEdge(edge: SimulationParams['seedEdge']): boolean {
  return edge === 'top' || edge === 'bottom'
}

function rotate(vec: Vec2, radians: number): Vec2 {
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  return {
    x: vec.x * cos - vec.y * sin,
    y: vec.x * sin + vec.y * cos
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
