import type { SimulationParams, SimulationState, Vec2 } from './simulationState'
import { isPointInPolygon, segmentIntersectsPolygon } from '../obstacles/polygons'

type Influence = {
  sum: Vec2
  count: number
}

// #region agent log - debug counter
let _debugLogCount = 0
const _DEBUG_MAX_LOGS = 80
// #endregion

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

  // #region agent log - build child count map
  const _childCountByParent = new Map<number, number>()
  for (let _ci = 0; _ci < state.nodes.length; _ci++) {
    const _n = state.nodes[_ci]
    if (_n.parent !== null) {
      _childCountByParent.set(_n.parent, (_childCountByParent.get(_n.parent) ?? 0) + 1)
    }
  }
  // #endregion

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

    // Skip candidates that are too close to an existing node (prevents hot spots)
    const minDistSq = minDistanceSquared(candidate, nextNodes)
    const proximityThresholdSq = params.stepSize * params.stepSize * 0.25
    if (minDistSq < proximityThresholdSq) {
      // #region agent log - H1 fix: log skipped duplicates
      if (_debugLogCount < _DEBUG_MAX_LOGS) {
        _debugLogCount++
        const _parentChildCount = _childCountByParent.get(nodeIndex) ?? 0
        fetch('http://127.0.0.1:7242/ingest/914c7885-5c16-45c0-aab7-c865f55029d4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'spaceColonization.ts:skip-duplicate',message:'Skipped near-duplicate candidate (FIX ACTIVE)',data:{hypothesisId:'H1_fix',runId:'post-fix',parentIndex:nodeIndex,parentPos:{x:node.x,y:node.y},candidatePos:{x:candidate.x,y:candidate.y},minDistToExisting:Math.sqrt(minDistSq),threshold:params.stepSize*0.5,parentChildCount:_parentChildCount,influenceCount:influence.count,attractorsRemaining:state.attractors.length,iteration:state.iterations,totalNodes:nextNodes.length},timestamp:Date.now()})}).catch(()=>{})
      }
      // #endregion
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

  // #region agent log - step summary when hot spots detected
  if (_debugLogCount > 0 && _debugLogCount < _DEBUG_MAX_LOGS && state.iterations % 100 === 0) {
    _debugLogCount++
    fetch('http://127.0.0.1:7242/ingest/914c7885-5c16-45c0-aab7-c865f55029d4',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'spaceColonization.ts:step-summary',message:'Periodic step summary',data:{hypothesisId:'summary',iteration:state.iterations,totalNodes:state.nodes.length,attractorsRemaining:state.attractors.length,addedThisStep:added,influencedNodes:influences.size,completed:state.completed},timestamp:Date.now()})}).catch(()=>{})
  }
  // #endregion

  if (state.attractors.length === 0 || added === 0 || state.nodes.length >= params.maxNodes) {
    state.completed = true
  }

  return added
}

function minDistanceSquared(point: Vec2, nodes: ReadonlyArray<Vec2>): number {
  let min = Number.POSITIVE_INFINITY
  for (let i = 0; i < nodes.length; i += 1) {
    const dx = point.x - nodes[i].x
    const dy = point.y - nodes[i].y
    const distSq = dx * dx + dy * dy
    if (distSq < min) {
      min = distSq
    }
  }
  return min
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
