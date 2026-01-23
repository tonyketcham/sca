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
  running,
  canvasRef
}: CanvasViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<ViewTransform>({
    pan: { x: 0, y: 0 },
    zoom: 1
  })
  const isDraggingRef = useRef(false)
  const lastPointerRef = useRef<Vec2>({ x: 0, y: 0 })
  const frameRef = useRef<number | null>(null)

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        canvas.width = Math.max(1, Math.floor(width))
        canvas.height = Math.max(1, Math.floor(height))
      }
    })
    resizeObserver.observe(container)

    return () => resizeObserver.disconnect()
  }, [canvasRef])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const onPointerDown = (event: PointerEvent) => {
      isDraggingRef.current = true
      lastPointerRef.current = { x: event.clientX, y: event.clientY }
      canvas.setPointerCapture(event.pointerId)
    }

    const onPointerUp = (event: PointerEvent) => {
      isDraggingRef.current = false
      canvas.releasePointerCapture(event.pointerId)
    }

    const onPointerMove = (event: PointerEvent) => {
      if (!isDraggingRef.current) return
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
      const origin = getArtboardOrigin(canvas.width, canvas.height, bounds, viewRef.current)
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
        x: nextOrigin.x - (canvas.width - bounds.width * nextZoom) * 0.5,
        y: nextOrigin.y - (canvas.height - bounds.height * nextZoom) * 0.5
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
        delta *= canvas.height
      }

      const zoomSpeed = event.ctrlKey ? 0.025 : 0.015
      const { zoom } = viewRef.current
      const nextZoom = clamp(zoom * Math.exp(-delta * zoomSpeed), MIN_ZOOM, MAX_ZOOM)
      applyZoom(pointer, nextZoom)
    }

    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointerup', onPointerUp)
    canvas.addEventListener('pointerleave', onPointerUp)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('pointerleave', onPointerUp)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('wheel', onWheel)
    }
  }, [canvasRef, simulationRef])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const animate = () => {
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

      renderComposite(ctx, states, {
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        view: viewRef.current,
        mode: 'editor',
        grid: gridLayout,
        frames,
        templateGrid
      })

      frameRef.current = requestAnimationFrame(animate)
    }

    frameRef.current = requestAnimationFrame(animate)

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [canvasRef, framesRef, gridLayout, running, simulationRef, templateGrid])

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
