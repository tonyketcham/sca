import type { SimulationParams, SimulationState, Vec2 } from './simulationState'
import { isPointInPolygon, segmentIntersectsPolygon } from '../obstacles/polygons'

type Influence = {
  sum: Vec2
  count: number
}

export function stepSimulation(state: SimulationState, params: SimulationParams): number {
  if (state.completed) {
    return 0
  }

  const influences = new Map<number, Influence>()
  const removedAttractors = new Set<number>()
  const influenceRadius = params.influenceRadius
  const killRadius = params.killRadius
  const influenceRadiusSq = influenceRadius * influenceRadius
  const killRadiusSq = killRadius * killRadius

  for (let i = 0; i < state.attractors.length; i += 1) {
    const attractor = state.attractors[i]
    let closestIndex = -1
    let closestDistSq = Number.POSITIVE_INFINITY

    for (let j = 0; j < state.nodes.length; j += 1) {
      const node = state.nodes[j]
      const dx = attractor.x - node.x
      const dy = attractor.y - node.y
      const distSq = dx * dx + dy * dy

      if (distSq < killRadiusSq) {
        removedAttractors.add(i)
        closestIndex = -1
        break
      }

      if (distSq < influenceRadiusSq && distSq < closestDistSq) {
        closestDistSq = distSq
        closestIndex = j
      }
    }

    if (closestIndex >= 0) {
      const node = state.nodes[closestIndex]
      const dx = attractor.x - node.x
      const dy = attractor.y - node.y
      const invLen = 1 / (Math.sqrt(dx * dx + dy * dy) || 1)
      const influence = influences.get(closestIndex) ?? { sum: { x: 0, y: 0 }, count: 0 }
      influence.sum.x += dx * invLen
      influence.sum.y += dy * invLen
      influence.count += 1
      influences.set(closestIndex, influence)
    }
  }

  if (removedAttractors.size > 0) {
    state.attractors = state.attractors.filter((_, index) => !removedAttractors.has(index))
  }

  let added = 0
  const nextNodes = [...state.nodes]

  for (const [nodeIndex, influence] of influences) {
    if (nextNodes.length >= params.maxNodes) {
      break
    }

    const node = state.nodes[nodeIndex]
    const direction = normalize({
      x: influence.sum.x / Math.max(1, influence.count),
      y: influence.sum.y / Math.max(1, influence.count)
    })

    const candidate = {
      x: node.x + direction.x * params.stepSize,
      y: node.y + direction.y * params.stepSize
    }

    if (!isWithinBounds(candidate, state.bounds)) {
      continue
    }

    if (params.avoidObstacles && intersectsObstacles(node, candidate, state.obstacles)) {
      continue
    }

    nextNodes.push({
      x: candidate.x,
      y: candidate.y,
      parent: nodeIndex
    })
    added += 1
  }

  state.nodes = nextNodes
  state.iterations += 1

  if (state.attractors.length === 0 || added === 0 || state.nodes.length >= params.maxNodes) {
    state.completed = true
  }

  return added
}

function normalize(vec: Vec2): Vec2 {
  const length = Math.sqrt(vec.x * vec.x + vec.y * vec.y)
  if (length === 0) {
    return { x: 0, y: 0 }
  }
  return { x: vec.x / length, y: vec.y / length }
}

function isWithinBounds(point: Vec2, bounds: SimulationState['bounds']): boolean {
  return point.x >= 0 && point.y >= 0 && point.x <= bounds.width && point.y <= bounds.height
}

function intersectsObstacles(a: Vec2, b: Vec2, obstacles: SimulationState['obstacles']): boolean {
  for (const polygon of obstacles) {
    if (isPointInPolygon(b, polygon) || segmentIntersectsPolygon(a, b, polygon)) {
      return true
    }
  }
  return false
}
