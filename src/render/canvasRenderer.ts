import type { SimulationState, Vec2 } from '../engine/simulationState'
import type { FrameConfig, TemplateGridSettings } from '../types/ui'

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

export type GridLayout = {
  rows: number
  cols: number
  cellWidth: number
  cellHeight: number
  gutterPx: number
  cells: Array<{
    index: number
    row: number
    col: number
    offset: Vec2
    bounds: SimulationState['bounds']
  }>
}

export type CompositeRenderOptions = {
  canvasWidth: number
  canvasHeight: number
  view: ViewTransform
  mode: 'editor' | 'export'
  grid: GridLayout
  frames: FrameConfig[]
  templateGrid?: TemplateGridSettings
  hoveredFrameIndex?: number | null
  selectedFrameIndices?: number[]
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

export function renderComposite(
  ctx: CanvasRenderingContext2D,
  states: SimulationState[],
  options: CompositeRenderOptions
): void {
  const {
    canvasWidth,
    canvasHeight,
    view,
    mode,
    grid,
    frames,
    templateGrid,
    hoveredFrameIndex,
    selectedFrameIndices
  } = options
  ctx.clearRect(0, 0, canvasWidth, canvasHeight)
  if (mode === 'editor') {
    ctx.fillStyle = '#1f1f1f'
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)
  } else {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)
  }

  const bounds = {
    width: grid.cellWidth * grid.cols,
    height: grid.cellHeight * grid.rows
  }
  const origin = getArtboardOrigin(canvasWidth, canvasHeight, bounds, view)

  ctx.save()
  ctx.translate(origin.x, origin.y)
  ctx.scale(view.zoom, view.zoom)

  if (mode === 'editor') {
    ctx.save()
    ctx.shadowColor = 'rgba(0,0,0,0.35)'
    ctx.shadowBlur = 16
    ctx.shadowOffsetY = 6
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, bounds.width, bounds.height)
    ctx.restore()

    ctx.strokeStyle = 'rgba(0,0,0,0.2)'
    ctx.lineWidth = 1 / view.zoom
    ctx.strokeRect(0, 0, bounds.width, bounds.height)
  }

  const selectedSet = new Set(selectedFrameIndices ?? [])

  for (let index = 0; index < grid.cells.length; index += 1) {
    const cell = grid.cells[index]
    const state = states[index]
    const frame = frames[index]
    if (!cell || !state || !frame) continue

    ctx.save()
    ctx.translate(cell.offset.x, cell.offset.y)
    renderFrame(ctx, state, frame.renderSettings, mode)
    if (mode === 'editor' && templateGrid?.showGutter && grid.gutterPx > 0) {
      const edges = {
        top: cell.row > 0,
        bottom: cell.row < grid.rows - 1,
        left: cell.col > 0,
        right: cell.col < grid.cols - 1
      }
      drawGutterOverlay(ctx, state.bounds, grid.gutterPx * 0.5, frame.renderSettings.obstacleFill, edges)
    }

    if (mode === 'editor') {
      const isSelected = selectedSet.has(index)
      const isHovered = hoveredFrameIndex === index
      if (isSelected || isHovered) {
        drawSelectionOutline(ctx, state.bounds, view.zoom, {
          hovered: isHovered,
          selected: isSelected
        })
      }
    }
    ctx.restore()
  }

  ctx.restore()
}

function drawSelectionOutline(
  ctx: CanvasRenderingContext2D,
  bounds: SimulationState['bounds'],
  zoom: number,
  state: { hovered: boolean; selected: boolean }
): void {
  ctx.save()
  if (state.selected) {
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.9)'
    ctx.lineWidth = 2 / zoom
    ctx.strokeRect(0, 0, bounds.width, bounds.height)
  }
  if (state.hovered) {
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.8)'
    ctx.lineWidth = 1 / zoom
    ctx.strokeRect(0, 0, bounds.width, bounds.height)
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

function renderFrame(
  ctx: CanvasRenderingContext2D,
  state: SimulationState,
  settings: RenderSettings,
  mode: 'editor' | 'export'
): void {
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
  if (mode === 'editor') {
    ctx.strokeStyle = 'rgba(0,0,0,0.15)'
    ctx.lineWidth = 1
    ctx.strokeRect(0, 0, state.bounds.width, state.bounds.height)
  }
}

function drawGutterOverlay(
  ctx: CanvasRenderingContext2D,
  bounds: SimulationState['bounds'],
  padding: number,
  fill: string,
  edges: { top: boolean; bottom: boolean; left: boolean; right: boolean }
): void {
  const inset = Math.min(Math.max(0, padding), bounds.width / 2, bounds.height / 2)
  if (inset <= 0) return
  ctx.save()
  ctx.globalAlpha = 0.25
  ctx.fillStyle = fill
  if (edges.top) {
    ctx.fillRect(0, 0, bounds.width, inset)
  }
  if (edges.bottom) {
    ctx.fillRect(0, bounds.height - inset, bounds.width, inset)
  }
  if (edges.left) {
    ctx.fillRect(0, inset, inset, bounds.height - inset * 2)
  }
  if (edges.right) {
    ctx.fillRect(bounds.width - inset, inset, inset, bounds.height - inset * 2)
  }
  ctx.restore()
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
