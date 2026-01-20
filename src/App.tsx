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
import type { ConfigState, ExportSettings, ObstacleSettings, PaperSettings, StatsSummary } from './types/ui'
import { useSavedConfigs } from './hooks/useSavedConfigs'
import { decodeConfig, encodeConfig } from './utils/serialize'
import { createSeed, createSeededRng } from './utils/rng'

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
  const [seed, setSeed] = useState(() => createSeed())
  const [randomizeSeed, setRandomizeSeed] = useState(true)
  const [stats, setStats] = useState<StatsSummary>({
    nodes: 0,
    attractors: 0,
    iterations: 0,
    completed: false
  })

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const paramsRef = useRef(params)
  const hydratingRef = useRef(true)
  const previewConfigRef = useRef<ConfigState | null>(null)
  const previewRunningRef = useRef<boolean>(running)
  const urlUpdateRef = useRef<number | null>(null)
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

  const buildObstacles = useCallback(
    (seedValue: number) => {
      const rng = createSeededRng(seedValue)
      const minRadiusPx = unitsToPx(obstacleSettings.minRadius, paper.unit, paper.dpi)
      const maxRadiusPx = unitsToPx(obstacleSettings.maxRadius, paper.unit, paper.dpi)
      const marginPx = unitsToPx(obstacleSettings.margin, paper.unit, paper.dpi)
      return generatePolygons(
        boundsPx,
        {
          count: obstacleSettings.count,
          minVertices: obstacleSettings.minVertices,
          maxVertices: obstacleSettings.maxVertices,
          minRadius: minRadiusPx,
          maxRadius: maxRadiusPx,
          margin: marginPx
        },
        rng
      )
    },
    [boundsPx, obstacleSettings, paper.dpi, paper.unit]
  )

  const regenerateObstacles = useCallback(
    (shouldRandomize = false) => {
      const nextSeed = shouldRandomize && randomizeSeed ? createSeed() : seed
      if (shouldRandomize && randomizeSeed) {
        setSeed(nextSeed)
      }
      const polygons = buildObstacles(nextSeed)
      setObstacles(polygons)
    },
    [buildObstacles, randomizeSeed, seed]
  )

  const resetSimulation = useCallback(
    (seedValue: number) => {
      const rng = createSeededRng(seedValue + 1)
      simulationRef.current = createSimulationState(boundsPx, paramsRef.current, obstacles, rng)
    },
    [boundsPx, obstacles]
  )

  const handleResetSimulation = useCallback(() => {
    const nextSeed = randomizeSeed ? createSeed() : seed
    if (randomizeSeed) {
      setSeed(nextSeed)
    }
    resetSimulation(nextSeed)
  }, [randomizeSeed, resetSimulation, seed])

  const handleRegenerateObstacles = useCallback(() => {
    regenerateObstacles(true)
  }, [regenerateObstacles])

  useEffect(() => {
    regenerateObstacles(false)
  }, [regenerateObstacles, seed])

  useEffect(() => {
    resetSimulation(seed)
  }, [resetSimulation, obstacles, seed])

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
        stepsPerFrame: exportSettings.stepsPerFrame,
        seed
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

  const configState = useMemo<ConfigState>(
    () => ({
      schemaVersion: 1,
      paper,
      params,
      obstacles: obstacleSettings,
      renderSettings,
      exportSettings,
      seed,
      randomizeSeed
    }),
    [paper, params, obstacleSettings, renderSettings, exportSettings, seed, randomizeSeed]
  )

  const { savedEntries, saveManualEntry, deleteEntry, getEntryConfig, currentConfig } = useSavedConfigs(
    configState,
    { enabled: !hydratingRef.current && previewConfigRef.current === null }
  )

  const normalizeConfig = useCallback((config: ConfigState): ConfigState => {
    return {
      schemaVersion: 1,
      paper: { ...DEFAULT_PAPER, ...config.paper },
      params: { ...DEFAULT_PARAMS, ...config.params },
      obstacles: { ...DEFAULT_OBSTACLES, ...config.obstacles },
      renderSettings: { ...DEFAULT_RENDER, ...config.renderSettings },
      exportSettings: { ...DEFAULT_EXPORT, ...config.exportSettings },
      seed: Number.isFinite(config.seed) ? config.seed : createSeed(),
      randomizeSeed: typeof config.randomizeSeed === 'boolean' ? config.randomizeSeed : true
    }
  }, [])

  const applyConfig = useCallback((config: ConfigState) => {
    const normalized = normalizeConfig(config)
    setPaper(normalized.paper)
    setParams(normalized.params)
    setObstacleSettings(normalized.obstacles)
    setRenderSettings(normalized.renderSettings)
    setExportSettings(normalized.exportSettings)
    setSeed(normalized.seed)
    setRandomizeSeed(normalized.randomizeSeed)
  }, [normalizeConfig])

  useEffect(() => {
    if (!hydratingRef.current) return
    const url = new URL(window.location.href)
    const fromUrl = url.searchParams.get('cfg')
    if (fromUrl) {
      const decoded = decodeConfig(fromUrl)
      if (decoded) {
        applyConfig(decoded)
        hydratingRef.current = false
        return
      }
    }
    if (currentConfig) {
      applyConfig(currentConfig)
    }
    hydratingRef.current = false
  }, [applyConfig, currentConfig])

  useEffect(() => {
    if (hydratingRef.current || previewConfigRef.current) return
    if (urlUpdateRef.current) {
      window.clearTimeout(urlUpdateRef.current)
    }
    urlUpdateRef.current = window.setTimeout(() => {
      const url = new URL(window.location.href)
      const encoded = encodeConfig(configState)
      url.searchParams.set('cfg', encoded)
      window.history.replaceState({}, '', url.toString())
    }, 250)
    return () => {
      if (urlUpdateRef.current) {
        window.clearTimeout(urlUpdateRef.current)
      }
    }
  }, [configState])

  const handlePreviewEntry = useCallback(
    (id: string) => {
      if (previewConfigRef.current) return
      const config = getEntryConfig(id)
      if (!config) return
      previewConfigRef.current = configState
      previewRunningRef.current = running
      setRunning(true)
      applyConfig(normalizeConfig(config))
    },
    [applyConfig, configState, getEntryConfig, normalizeConfig, running]
  )

  const handlePreviewEnd = useCallback(() => {
    if (!previewConfigRef.current) return
    const restore = previewConfigRef.current
    previewConfigRef.current = null
    applyConfig(restore)
    setRunning(previewRunningRef.current)
  }, [applyConfig])

  const handleLoadEntry = useCallback(
    (id: string) => {
      const config = getEntryConfig(id)
      if (!config) return
      previewConfigRef.current = null
      applyConfig(normalizeConfig(config))
    },
    [applyConfig, getEntryConfig, normalizeConfig]
  )

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
            seed={seed}
            randomizeSeed={randomizeSeed}
            savedEntries={savedEntries}
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
            onResetSimulation={handleResetSimulation}
            onRegenerateObstacles={handleRegenerateObstacles}
            onExportPng={handleExportPng}
            onExportSvg={handleExportSvg}
            onExportMp4={handleExportMp4}
            onSeedChange={setSeed}
            onRandomizeSeedChange={setRandomizeSeed}
            onSaveEntry={saveManualEntry}
            onLoadEntry={handleLoadEntry}
            onDeleteEntry={deleteEntry}
            onPreviewEntry={handlePreviewEntry}
            onPreviewEnd={handlePreviewEnd}
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
