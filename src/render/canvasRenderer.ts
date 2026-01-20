import type { SimulationState, Vec2 } from '../engine/simulationState'

export type ViewTransform = {
  pan: Vec2
  zoom: number
}

export type RenderSettings = {
  showAttractors: boolean
  showNodes: boolean
  showObstacles: boolean
  strokeWidth: number
  nodeRadius: number
  rootColor: string
  obstacleFill: string
  attractorColor: string
}

export type RenderOptions = {
  canvasWidth: number
  canvasHeight: number
  view: ViewTransform
  mode: 'editor' | 'export'
  settings: RenderSettings
}

export function renderSimulation(
  ctx: CanvasRenderingContext2D,
  state: SimulationState,
  options: RenderOptions
): void {
  const { canvasWidth, canvasHeight, view, settings, mode } = options
  ctx.clearRect(0, 0, canvasWidth, canvasHeight)

  if (mode === 'editor') {
    ctx.fillStyle = '#1f1f1f'
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)
  } else {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)
  }

  const origin = getArtboardOrigin(canvasWidth, canvasHeight, state.bounds, view)

  ctx.save()
  ctx.translate(origin.x, origin.y)
  ctx.scale(view.zoom, view.zoom)

  if (mode === 'editor') {
    ctx.save()
    ctx.shadowColor = 'rgba(0,0,0,0.35)'
    ctx.shadowBlur = 16
    ctx.shadowOffsetY = 6
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, state.bounds.width, state.bounds.height)
    ctx.restore()

    ctx.strokeStyle = 'rgba(0,0,0,0.2)'
    ctx.lineWidth = 1 / view.zoom
    ctx.strokeRect(0, 0, state.bounds.width, state.bounds.height)
  }

  if (settings.showObstacles) {
    drawObstacles(ctx, state, settings)
  }
  drawRoots(ctx, state, settings)

  if (settings.showNodes) {
    drawNodes(ctx, state, settings)
  }

  if (settings.showAttractors) {
    drawAttractors(ctx, state, settings)
  }

  ctx.restore()
}

export function getArtboardOrigin(
  canvasWidth: number,
  canvasHeight: number,
  bounds: SimulationState['bounds'],
  view: ViewTransform
): Vec2 {
  return {
    x: (canvasWidth - bounds.width * view.zoom) * 0.5 + view.pan.x,
    y: (canvasHeight - bounds.height * view.zoom) * 0.5 + view.pan.y
  }
}

function drawObstacles(
  ctx: CanvasRenderingContext2D,
  state: SimulationState,
  settings: RenderSettings
): void {
  ctx.fillStyle = settings.obstacleFill
  for (const polygon of state.obstacles) {
    if (polygon.length === 0) continue
    ctx.beginPath()
    ctx.moveTo(polygon[0].x, polygon[0].y)
    for (let i = 1; i < polygon.length; i += 1) {
      ctx.lineTo(polygon[i].x, polygon[i].y)
    }
    ctx.closePath()
    ctx.fill()
  }
}

function drawRoots(
  ctx: CanvasRenderingContext2D,
  state: SimulationState,
  settings: RenderSettings
): void {
  ctx.strokeStyle = settings.rootColor
  ctx.lineWidth = settings.strokeWidth
  ctx.lineCap = 'round'

  ctx.beginPath()
  for (let i = 0; i < state.nodes.length; i += 1) {
    const node = state.nodes[i]
    if (node.parent === null) continue
    const parent = state.nodes[node.parent]
    ctx.moveTo(parent.x, parent.y)
    ctx.lineTo(node.x, node.y)
  }
  ctx.stroke()
}

function drawNodes(
  ctx: CanvasRenderingContext2D,
  state: SimulationState,
  settings: RenderSettings
): void {
  ctx.fillStyle = settings.rootColor
  for (const node of state.nodes) {
    ctx.beginPath()
    ctx.arc(node.x, node.y, settings.nodeRadius, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawAttractors(
  ctx: CanvasRenderingContext2D,
  state: SimulationState,
  settings: RenderSettings
): void {
  ctx.fillStyle = settings.attractorColor
  for (const attractor of state.attractors) {
    ctx.beginPath()
    ctx.arc(attractor.x, attractor.y, 1.5, 0, Math.PI * 2)
    ctx.fill()
  }
}
