import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import CanvasView from './components/CanvasView'
import ControlsPanel from './components/ControlsPanel'
import { ScrollArea } from './components/ui/scroll-area'
import { createSimulationState, type SimulationParams, type SimulationState } from './engine/simulationState'
import { unitsToPx } from './geometry/units'
import { generatePolygons, type Polygon } from './obstacles/polygons'
import { renderSimulation, type RenderSettings } from './render/canvasRenderer'
import { exportSvg } from './export/svgExporter'
import { encodeSimulationMp4 } from './export/webcodecsMp4'
import type { ExportSettings, ObstacleSettings, PaperSettings, StatsSummary } from './types/ui'

const DEFAULT_PAPER: PaperSettings = {
  width: 8.5,
  height: 11,
  unit: 'in',
  dpi: 96
}

const DEFAULT_PARAMS: SimulationParams = {
  influenceRadius: 80,
  killRadius: 16,
  stepSize: 6,
  maxNodes: 4000,
  seedCount: 3,
  seedSpread: 30,
  attractorCount: 900,
  stepsPerFrame: 3,
  avoidObstacles: true
}

const DEFAULT_OBSTACLES: ObstacleSettings = {
  count: 4,
  minVertices: 4,
  maxVertices: 7,
  minRadius: 0.6,
  maxRadius: 1.8,
  margin: 0.4
}

const DEFAULT_RENDER: RenderSettings = {
  showAttractors: false,
  showNodes: false,
  showObstacles: true,
  strokeWidth: 1.4,
  nodeRadius: 1.5,
  rootColor: '#2d3b2c',
  obstacleFill: '#c85e5e',
  attractorColor: '#2f80ed'
}

const DEFAULT_EXPORT: ExportSettings = {
  fps: 30,
  durationSeconds: 6,
  stepsPerFrame: 3,
  durationMode: 'fixed'
}

export default function App() {
  const [paper, setPaper] = useState<PaperSettings>(DEFAULT_PAPER)
  const [params, setParams] = useState<SimulationParams>(DEFAULT_PARAMS)
  const [obstacleSettings, setObstacleSettings] = useState<ObstacleSettings>(DEFAULT_OBSTACLES)
  const [renderSettings, setRenderSettings] = useState<RenderSettings>(DEFAULT_RENDER)
  const [exportSettings, setExportSettings] = useState<ExportSettings>(DEFAULT_EXPORT)
  const [obstacles, setObstacles] = useState<Polygon[]>([])
  const [running, setRunning] = useState(true)
  const [stats, setStats] = useState<StatsSummary>({
    nodes: 0,
    attractors: 0,
    iterations: 0,
    completed: false
  })

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const paramsRef = useRef(params)
  const simulationRef = useRef<SimulationState>(
    createSimulationState(
      { width: 0, height: 0 },
      params,
      []
    )
  )

  useEffect(() => {
    paramsRef.current = params
  }, [params])

  const boundsPx = useMemo(
    () => ({
      width: unitsToPx(paper.width, paper.unit, paper.dpi),
      height: unitsToPx(paper.height, paper.unit, paper.dpi)
    }),
    [paper]
  )

  const regenerateObstacles = useCallback(() => {
    const minRadiusPx = unitsToPx(obstacleSettings.minRadius, paper.unit, paper.dpi)
    const maxRadiusPx = unitsToPx(obstacleSettings.maxRadius, paper.unit, paper.dpi)
    const marginPx = unitsToPx(obstacleSettings.margin, paper.unit, paper.dpi)
    const polygons = generatePolygons(boundsPx, {
      count: obstacleSettings.count,
      minVertices: obstacleSettings.minVertices,
      maxVertices: obstacleSettings.maxVertices,
      minRadius: minRadiusPx,
      maxRadius: maxRadiusPx,
      margin: marginPx
    })
    setObstacles(polygons)
  }, [boundsPx, obstacleSettings, paper.dpi, paper.unit])

  const resetSimulation = useCallback(() => {
    simulationRef.current = createSimulationState(boundsPx, paramsRef.current, obstacles)
  }, [boundsPx, obstacles])

  useEffect(() => {
    regenerateObstacles()
  }, [regenerateObstacles])

  useEffect(() => {
    resetSimulation()
  }, [resetSimulation, obstacles])

  useEffect(() => {
    const id = window.setInterval(() => {
      const state = simulationRef.current
      setStats({
        nodes: state.nodes.length,
        attractors: state.attractors.length,
        iterations: state.iterations,
        completed: state.completed
      })
    }, 200)

    return () => window.clearInterval(id)
  }, [])

  const exportCanvas = useCallback(() => {
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(boundsPx.width)
    canvas.height = Math.round(boundsPx.height)
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) return null

    renderSimulation(ctx, simulationRef.current, {
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      view: { pan: { x: 0, y: 0 }, zoom: 1 },
      mode: 'export',
      settings: renderSettings
    })
    return canvas
  }, [boundsPx.height, boundsPx.width, renderSettings])

  const handleExportPng = useCallback(() => {
    const canvas = exportCanvas()
    if (!canvas) return
    canvas.toBlob((blob) => {
      if (!blob) return
      downloadBlob(blob, `root-growth-${Date.now()}.png`)
    })
  }, [exportCanvas])

  const handleExportSvg = useCallback(() => {
    const svg = exportSvg(simulationRef.current, paper.unit, paper.width, paper.height, renderSettings)
    const blob = new Blob([svg], { type: 'image/svg+xml' })
    downloadBlob(blob, `root-growth-${Date.now()}.svg`)
  }, [paper.height, paper.unit, paper.width, renderSettings])

  const handleExportMp4 = useCallback(async () => {
    try {
      const blob = await encodeSimulationMp4({
        state: simulationRef.current,
        params: paramsRef.current,
        settings: renderSettings,
        fps: exportSettings.fps,
        durationSeconds: exportSettings.durationSeconds,
        durationMode: exportSettings.durationMode,
        stepsPerFrame: exportSettings.stepsPerFrame
      })
      downloadBlob(blob, `root-growth-${Date.now()}.mp4`)
    } catch (error) {
      console.error(error)
      alert(error instanceof Error ? error.message : 'MP4 export failed.')
    }
  }, [exportSettings, renderSettings])

  const handleToggleRunning = useCallback(() => {
    setRunning((value) => !value)
  }, [])

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950">
      <aside className="h-screen w-[360px] border-r border-zinc-800 bg-zinc-950">
        <ScrollArea className="h-full">
          <ControlsPanel
            paper={paper}
            params={params}
            obstacles={obstacleSettings}
            renderSettings={renderSettings}
            exportSettings={exportSettings}
            stats={stats}
            running={running}
            onPaperChange={setPaper}
            onParamsChange={(next) => {
              paramsRef.current = next
              setParams(next)
            }}
            onObstacleChange={setObstacleSettings}
            onRenderSettingsChange={setRenderSettings}
            onExportSettingsChange={setExportSettings}
            onToggleRunning={handleToggleRunning}
            onResetSimulation={resetSimulation}
            onRegenerateObstacles={regenerateObstacles}
            onExportPng={handleExportPng}
            onExportSvg={handleExportSvg}
            onExportMp4={handleExportMp4}
          />
        </ScrollArea>
      </aside>
      <main className="relative flex-1 bg-zinc-950">
        <CanvasView
          key={`${boundsPx.width}-${boundsPx.height}`}
          simulationRef={simulationRef}
          paramsRef={paramsRef}
          running={running}
          renderSettings={renderSettings}
          canvasRef={canvasRef}
        />
      </main>
    </div>
  )
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
