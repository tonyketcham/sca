import { useEffect, useMemo, useRef, type RefObject } from 'react'
import type { SimulationState, Vec2 } from '../engine/simulationState'
import { stepSimulation } from '../engine/spaceColonization'
import { getArtboardOrigin, renderComposite, type GridLayout, type ViewTransform } from '../render/canvasRenderer'
import type { FrameConfig, TemplateGridSettings } from '../types/ui'

type CanvasViewProps = {
  simulationRef: RefObject<SimulationState[]>
  framesRef: RefObject<FrameConfig[]>
  gridLayout: GridLayout
  templateGrid: TemplateGridSettings
  selectedFrameIndices: number[]
  onSelectFrame: (index: number) => void
  onToggleFrame: (index: number) => void
  onClearSelection: () => void
  running: boolean
  canvasRef: RefObject<HTMLCanvasElement | null>
}

const MIN_ZOOM = 0.2
const MAX_ZOOM = 4

export default function CanvasView({
  simulationRef,
  framesRef,
  gridLayout,
  templateGrid,
  selectedFrameIndices,
  onSelectFrame,
  onToggleFrame,
  onClearSelection,
  running,
  canvasRef
}: CanvasViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<ViewTransform>({
    pan: { x: 0, y: 0 },
    zoom: 1
  })
  const canvasSizeRef = useRef({ width: 1, height: 1, dpr: 1 })
  const isDraggingRef = useRef(false)
  const lastPointerRef = useRef<Vec2>({ x: 0, y: 0 })
  const pointerDownRef = useRef<{ x: number; y: number; frameIndex: number | null } | null>(null)
  const hoveredFrameRef = useRef<number | null>(null)
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        const dpr = window.devicePixelRatio || 1
        const logicalWidth = Math.max(1, Math.floor(width))
        const logicalHeight = Math.max(1, Math.floor(height))
        canvas.style.width = `${logicalWidth}px`
        canvas.style.height = `${logicalHeight}px`
        canvas.width = Math.max(1, Math.floor(logicalWidth * dpr))
        canvas.height = Math.max(1, Math.floor(logicalHeight * dpr))
        canvasSizeRef.current = { width: logicalWidth, height: logicalHeight, dpr }
      }
    })
    resizeObserver.observe(container)

    return () => resizeObserver.disconnect()
  }, [canvasRef])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const updateHover = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      const point = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      }
      hoveredFrameRef.current = getFrameIndexAtPoint(point, canvas, gridLayout, viewRef.current)
    }

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return
      const rect = canvas.getBoundingClientRect()
      const point = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      }
      pointerDownRef.current = {
        x: event.clientX,
        y: event.clientY,
        frameIndex: getFrameIndexAtPoint(point, canvas, gridLayout, viewRef.current)
      }
      isDraggingRef.current = false
      lastPointerRef.current = { x: event.clientX, y: event.clientY }
      canvas.setPointerCapture(event.pointerId)
    }

    const onPointerUp = (event: PointerEvent) => {
      if (pointerDownRef.current && !isDraggingRef.current) {
        const { frameIndex } = pointerDownRef.current
        if (typeof frameIndex === 'number') {
          if (event.metaKey || event.ctrlKey) {
            onToggleFrame(frameIndex)
          } else {
            onSelectFrame(frameIndex)
          }
        } else {
          onClearSelection()
        }
      }
      pointerDownRef.current = null
      isDraggingRef.current = false
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId)
      }
    }

    const onPointerLeave = (event: PointerEvent) => {
      hoveredFrameRef.current = null
      onPointerUp(event)
    }

    const onPointerMove = (event: PointerEvent) => {
      if (!pointerDownRef.current) {
        updateHover(event)
        return
      }

      if (!isDraggingRef.current) {
        const distance = Math.hypot(
          event.clientX - pointerDownRef.current.x,
          event.clientY - pointerDownRef.current.y
        )
        if (distance < 3) {
          return
        }
        isDraggingRef.current = true
      }

      const deltaX = event.clientX - lastPointerRef.current.x
      const deltaY = event.clientY - lastPointerRef.current.y
      lastPointerRef.current = { x: event.clientX, y: event.clientY }
      viewRef.current.pan.x += deltaX
      viewRef.current.pan.y += deltaY
    }

    const applyZoom = (pointer: Vec2, nextZoom: number) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const { zoom } = viewRef.current
      if (nextZoom === zoom) return

      const bounds = {
        width: gridLayout.cellWidth * gridLayout.cols,
        height: gridLayout.cellHeight * gridLayout.rows
      }
      const { width, height } = canvasSizeRef.current
      const origin = getArtboardOrigin(width, height, bounds, viewRef.current)
      const worldPoint = {
        x: (pointer.x - origin.x) / zoom,
        y: (pointer.y - origin.y) / zoom
      }
      const nextOrigin = {
        x: pointer.x - worldPoint.x * nextZoom,
        y: pointer.y - worldPoint.y * nextZoom
      }

      viewRef.current.zoom = nextZoom
      viewRef.current.pan = {
        x: nextOrigin.x - (width - bounds.width * nextZoom) * 0.5,
        y: nextOrigin.y - (height - bounds.height * nextZoom) * 0.5
      }
    }

    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const pointer = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      }

      let delta = event.deltaY
      if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
        delta *= 16
      } else if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
        delta *= canvasSizeRef.current.height
      }

      const zoomSpeed = event.ctrlKey ? 0.025 : 0.015
      const { zoom } = viewRef.current
      const nextZoom = clamp(zoom * Math.exp(-delta * zoomSpeed), MIN_ZOOM, MAX_ZOOM)
      applyZoom(pointer, nextZoom)
    }

    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointerup', onPointerUp)
    canvas.addEventListener('pointerleave', onPointerLeave)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('pointerleave', onPointerLeave)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('wheel', onWheel)
    }
  }, [canvasRef, gridLayout, onClearSelection, onSelectFrame, onToggleFrame, simulationRef])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

      const ctx = canvas.getContext('2d')
    if (!ctx) return

    const animate = () => {
        const { width, height, dpr } = canvasSizeRef.current
      const frames = framesRef.current
      const states = simulationRef.current

      if (running) {
        for (let index = 0; index < states.length; index += 1) {
          const state = states[index]
          const frame = frames[index]
          if (!state || !frame || state.completed) continue
          for (let i = 0; i < frame.params.stepsPerFrame; i += 1) {
            stepSimulation(state, frame.params)
            if (state.completed) break
          }
        }
      }

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        renderComposite(ctx, states, {
          canvasWidth: width,
          canvasHeight: height,
        view: viewRef.current,
        mode: 'editor',
        grid: gridLayout,
        frames,
        templateGrid,
        hoveredFrameIndex: hoveredFrameRef.current,
        selectedFrameIndices
      })

      frameRef.current = requestAnimationFrame(animate)
    }

    frameRef.current = requestAnimationFrame(animate)

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [canvasRef, framesRef, gridLayout, running, selectedFrameIndices, simulationRef, templateGrid])

  const viewHints = useMemo(
    () => (
      <div className="pointer-events-none absolute bottom-4 right-4 text-xs text-zinc-500">
        <div>Drag to pan</div>
        <div>Pinch or scroll to zoom</div>
      </div>
    ),
    []
  )

  return (
    <div className="relative h-full w-full" ref={containerRef}>
      <canvas ref={canvasRef} className="block h-full w-full" />
      {viewHints}
    </div>
  )
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function getFrameIndexAtPoint(
  point: Vec2,
  canvas: HTMLCanvasElement,
  gridLayout: GridLayout,
  view: ViewTransform
): number | null {
  const bounds = {
    width: gridLayout.cellWidth * gridLayout.cols,
    height: gridLayout.cellHeight * gridLayout.rows
  }
  const canvasWidth = canvas.clientWidth || canvas.width
  const canvasHeight = canvas.clientHeight || canvas.height
  const origin = getArtboardOrigin(canvasWidth, canvasHeight, bounds, view)
  const worldX = (point.x - origin.x) / view.zoom
  const worldY = (point.y - origin.y) / view.zoom
  if (worldX < 0 || worldY < 0 || worldX > bounds.width || worldY > bounds.height) {
    return null
  }
  const col = Math.floor(worldX / gridLayout.cellWidth)
  const row = Math.floor(worldY / gridLayout.cellHeight)
  const index = row * gridLayout.cols + col
  return gridLayout.cells[index] ? index : null
}
