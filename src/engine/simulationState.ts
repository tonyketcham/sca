import { isPointInPolygon, type Polygon } from '../obstacles/polygons'

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
  obstacles: Polygon[]
): SimulationState {
  const nodes = createSeedNodes(bounds, params)
  const attractors = createAttractors(bounds, params, obstacles)
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

function createSeedNodes(bounds: Bounds, params: SimulationParams): Node[] {
  const margin = Math.max(6, params.stepSize)
  const spread = bounds.width * (params.seedSpread / 100)
  const centerX = bounds.width * 0.5
  const startX = centerX - spread * 0.5
  const count = Math.max(1, Math.floor(params.seedCount))
  const step = count === 1 ? 0 : spread / (count - 1)

  return Array.from({ length: count }, (_, index) => ({
    x: startX + step * index,
    y: bounds.height - margin,
    parent: null
  }))
}

function createAttractors(bounds: Bounds, params: SimulationParams, obstacles: Polygon[]): Attractor[] {
  const attractors: Attractor[] = []
  const maxAttempts = params.attractorCount * 20
  let attempts = 0

  while (attractors.length < params.attractorCount && attempts < maxAttempts) {
    attempts += 1
    const point = {
      x: Math.random() * bounds.width,
      y: Math.random() * bounds.height
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
