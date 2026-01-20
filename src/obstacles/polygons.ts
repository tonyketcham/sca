import type { Bounds, Vec2 } from '../engine/simulationState'

export type Polygon = Vec2[]

export type ObstacleConfig = {
  count: number
  minVertices: number
  maxVertices: number
  minRadius: number
  maxRadius: number
  margin: number
}

function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

export function generatePolygons(bounds: Bounds, config: ObstacleConfig): Polygon[] {
  const polygons: Polygon[] = []
  const maxAttempts = config.count * 20
  let attempts = 0

  while (polygons.length < config.count && attempts < maxAttempts) {
    attempts += 1
    const vertexCount = Math.round(randomInRange(config.minVertices, config.maxVertices))
    const radius = randomInRange(config.minRadius, config.maxRadius)
    const cx = randomInRange(
      config.margin + radius,
      bounds.width - config.margin - radius
    )
    const cy = randomInRange(
      config.margin + radius,
      bounds.height - config.margin - radius
    )

    const angles = Array.from({ length: vertexCount }, () => Math.random() * Math.PI * 2).sort(
      (a, b) => a - b
    )
    const points = angles.map((angle) => {
      const jitter = randomInRange(0.65, 1)
      const r = radius * jitter
      return {
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r
      }
    })

    if (points.every((point) => isPointWithinBounds(point, bounds, config.margin))) {
      polygons.push(points)
    }
  }

  return polygons
}

function isPointWithinBounds(point: Vec2, bounds: Bounds, margin: number): boolean {
  return (
    point.x >= margin &&
    point.y >= margin &&
    point.x <= bounds.width - margin &&
    point.y <= bounds.height - margin
  )
}

export function isPointInPolygon(point: Vec2, polygon: Polygon): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x
    const yi = polygon[i].y
    const xj = polygon[j].x
    const yj = polygon[j].y

    const intersects =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi + Number.EPSILON) + xi
    if (intersects) {
      inside = !inside
    }
  }
  return inside
}

export function segmentIntersectsPolygon(a: Vec2, b: Vec2, polygon: Polygon): boolean {
  for (let i = 0; i < polygon.length; i += 1) {
    const c = polygon[i]
    const d = polygon[(i + 1) % polygon.length]
    if (segmentsIntersect(a, b, c, d)) {
      return true
    }
  }
  return false
}

function segmentsIntersect(p1: Vec2, p2: Vec2, p3: Vec2, p4: Vec2): boolean {
  const d1 = direction(p3, p4, p1)
  const d2 = direction(p3, p4, p2)
  const d3 = direction(p1, p2, p3)
  const d4 = direction(p1, p2, p4)

  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true
  }

  if (d1 === 0 && onSegment(p3, p4, p1)) return true
  if (d2 === 0 && onSegment(p3, p4, p2)) return true
  if (d3 === 0 && onSegment(p1, p2, p3)) return true
  if (d4 === 0 && onSegment(p1, p2, p4)) return true

  return false
}

function direction(a: Vec2, b: Vec2, c: Vec2): number {
  return (c.x - a.x) * (b.y - a.y) - (c.y - a.y) * (b.x - a.x)
}

function onSegment(a: Vec2, b: Vec2, c: Vec2): boolean {
  return (
    c.x >= Math.min(a.x, b.x) &&
    c.x <= Math.max(a.x, b.x) &&
    c.y >= Math.min(a.y, b.y) &&
    c.y <= Math.max(a.y, b.y)
  )
}
