import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import CanvasView from './components/CanvasView'
import ControlsPanel from './components/ControlsPanel'
import { ScrollArea } from './components/ui/scroll-area'
import { createSimulationState, type Bounds, type SimulationParams, type SimulationState } from './engine/simulationState'
import { unitsToPx } from './geometry/units'
import { generatePolygons, type Polygon } from './obstacles/polygons'
import { renderComposite, type RenderSettings } from './render/canvasRenderer'
import { exportCompositeSvg } from './export/svgExporter'
import { encodeCompositeMp4 } from './export/webcodecsMp4'
import type {
  ConfigState,
  ExportSettings,
  FrameConfig,
  ObstacleSettings,
  PaperSettings,
  StatsSummary,
  TemplateGridSettings
} from './types/ui'
import { useSavedConfigs } from './hooks/useSavedConfigs'
import { decodeConfig, encodeConfig } from './utils/serialize'
import { createSeed, createSeededRng } from './utils/rng'
import { LATEST_SCHEMA_VERSION } from './utils/schemaMigrations'

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
  seedPlacement: 'edge',
  seedEdge: 'top',
  seedAngle: 0,
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

const DEFAULT_TEMPLATE_GRID: TemplateGridSettings = {
  rows: 1,
  cols: 1,
  gutter: 0,
  showGutter: true,
  gutterAsObstacles: false
}

type GridCellLayout = {
  index: number
  row: number
  col: number
  offset: { x: number; y: number }
  bounds: Bounds
}

function createDefaultFrame(): FrameConfig {
  return {
    params: { ...DEFAULT_PARAMS },
    obstacles: { ...DEFAULT_OBSTACLES },
    renderSettings: { ...DEFAULT_RENDER },
    exportSettings: { ...DEFAULT_EXPORT },
    seed: createSeed(),
    randomizeSeed: true
  }
}

export default function App() {
  const [paper, setPaper] = useState<PaperSettings>(DEFAULT_PAPER)
  const [templateGrid, setTemplateGrid] = useState<TemplateGridSettings>(DEFAULT_TEMPLATE_GRID)
  const [frames, setFrames] = useState<FrameConfig[]>(() => [createDefaultFrame()])
  const [activeFrameIndex, setActiveFrameIndex] = useState(0)
  const [running, setRunning] = useState(true)
  const [stats, setStats] = useState<StatsSummary>({
    nodes: 0,
    attractors: 0,
    iterations: 0,
    completed: false
  })

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const framesRef = useRef(frames)
  const hydratingRef = useRef(true)
  const previewConfigRef = useRef<ConfigState | null>(null)
  const previewRunningRef = useRef<boolean>(running)
  const urlUpdateRef = useRef<number | null>(null)
  const simulationRef = useRef<SimulationState[]>([])

  useEffect(() => {
    framesRef.current = frames
  }, [frames])

  const boundsPx = useMemo(
    () => ({
      width: unitsToPx(paper.width, paper.unit, paper.dpi),
      height: unitsToPx(paper.height, paper.unit, paper.dpi)
    }),
    [paper]
  )

  const gridLayout = useMemo(() => {
    const rows = Math.max(1, Math.floor(templateGrid.rows))
    const cols = Math.max(1, Math.floor(templateGrid.cols))
    const cellWidth = Math.max(1, boundsPx.width / cols)
    const cellHeight = Math.max(1, boundsPx.height / rows)
    const gutterPx = unitsToPx(templateGrid.gutter, paper.unit, paper.dpi)
    const cells = Array.from({ length: rows * cols }, (_, index) => {
      const row = Math.floor(index / cols)
      const col = index % cols
      return {
        index,
        row,
        col,
        offset: { x: col * cellWidth, y: row * cellHeight },
        bounds: { width: cellWidth, height: cellHeight }
      }
    })
    return {
      rows,
      cols,
      cellWidth,
      cellHeight,
      gutterPx,
      cells
    }
  }, [boundsPx.height, boundsPx.width, paper.dpi, paper.unit, templateGrid.cols, templateGrid.gutter, templateGrid.rows])

  const gutterPaddingPx = useMemo(() => Math.max(0, gridLayout.gutterPx * 0.5), [gridLayout.gutterPx])

  const buildFrameObstacles = useCallback(
    (frame: FrameConfig, layout: GridCellLayout, seedValue: number): Polygon[] => {
      const rng = createSeededRng(seedValue)
      const minRadiusPx = unitsToPx(frame.obstacles.minRadius, paper.unit, paper.dpi)
      const maxRadiusPx = unitsToPx(frame.obstacles.maxRadius, paper.unit, paper.dpi)
      const marginPx = unitsToPx(frame.obstacles.margin, paper.unit, paper.dpi)
      const polygons = generatePolygons(
        layout.bounds,
        {
          count: frame.obstacles.count,
          minVertices: frame.obstacles.minVertices,
          maxVertices: frame.obstacles.maxVertices,
          minRadius: minRadiusPx,
          maxRadius: maxRadiusPx,
          margin: marginPx
        },
        rng
      )
      if (!templateGrid.gutterAsObstacles || gutterPaddingPx <= 0) {
        return polygons
      }
      const edges = {
        top: layout.row > 0,
        bottom: layout.row < gridLayout.rows - 1,
        left: layout.col > 0,
        right: layout.col < gridLayout.cols - 1
      }
      return [...polygons, ...createGutterObstacles(layout.bounds, gutterPaddingPx, edges)]
    },
    [gridLayout.cols, gridLayout.rows, gutterPaddingPx, paper.dpi, paper.unit, templateGrid.gutterAsObstacles]
  )

  const rebuildFrameSimulation = useCallback(
    (index: number, frame: FrameConfig, seedOverride?: number) => {
      const layout = gridLayout.cells[index]
      if (!layout) return
      const seedValue = seedOverride ?? frame.seed
      const obstacles = buildFrameObstacles(frame, layout, seedValue)
      const rng = createSeededRng(seedValue + 1)
      simulationRef.current[index] = createSimulationState(layout.bounds, frame.params, obstacles, rng)
    },
    [buildFrameObstacles, gridLayout.cells]
  )

  const rebuildAllSimulations = useCallback(
    (nextFrames: FrameConfig[]) => {
      simulationRef.current = nextFrames.map((frame, index) => {
        const layout = gridLayout.cells[index]
        if (!layout) {
          return createSimulationState({ width: 0, height: 0 }, frame.params, [])
        }
        const obstacles = buildFrameObstacles(frame, layout, frame.seed)
        const rng = createSeededRng(frame.seed + 1)
        return createSimulationState(layout.bounds, frame.params, obstacles, rng)
      })
    },
    [buildFrameObstacles, gridLayout.cells]
  )

  useEffect(() => {
    setFrames((prev) => {
      const next = resizeFrames(prev, gridLayout.cells.length)
      if (next !== prev) {
        setActiveFrameIndex((index) => Math.min(index, next.length - 1))
        rebuildAllSimulations(next)
      }
      return next
    })
  }, [gridLayout.cells.length, rebuildAllSimulations])

  useEffect(() => {
    rebuildAllSimulations(frames)
  }, [rebuildAllSimulations, gridLayout.cellHeight, gridLayout.cellWidth, gridLayout.rows, gridLayout.cols])

  useEffect(() => {
    const id = window.setInterval(() => {
      const state = simulationRef.current[activeFrameIndex]
      if (!state) return
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

    renderComposite(ctx, simulationRef.current, {
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      view: { pan: { x: 0, y: 0 }, zoom: 1 },
      mode: 'export',
      grid: gridLayout,
      frames: framesRef.current
    })
    return canvas
  }, [boundsPx.height, boundsPx.width, gridLayout])

  const handleExportPng = useCallback(() => {
    const canvas = exportCanvas()
    if (!canvas) return
    canvas.toBlob((blob) => {
      if (!blob) return
      downloadBlob(blob, `root-growth-${Date.now()}.png`)
    })
  }, [exportCanvas])

  const handleExportSvg = useCallback(() => {
    const svg = exportCompositeSvg({
      states: simulationRef.current,
      frames: framesRef.current,
      grid: gridLayout,
      unit: paper.unit,
      widthInUnits: paper.width,
      heightInUnits: paper.height
    })
    const blob = new Blob([svg], { type: 'image/svg+xml' })
    downloadBlob(blob, `root-growth-${Date.now()}.svg`)
  }, [gridLayout, paper.height, paper.unit, paper.width])

  const handleExportMp4 = useCallback(async () => {
    try {
      const activeFrame = framesRef.current[activeFrameIndex]
      if (!activeFrame) return
      const blob = await encodeCompositeMp4({
        frames: framesRef.current,
        grid: gridLayout,
        states: simulationRef.current,
        fps: activeFrame.exportSettings.fps,
        durationSeconds: activeFrame.exportSettings.durationSeconds,
        durationMode: activeFrame.exportSettings.durationMode,
        stepsPerFrame: activeFrame.exportSettings.stepsPerFrame
      })
      downloadBlob(blob, `root-growth-${Date.now()}.mp4`)
    } catch (error) {
      console.error(error)
      alert(error instanceof Error ? error.message : 'MP4 export failed.')
    }
  }, [activeFrameIndex, gridLayout])

  const handleToggleRunning = useCallback(() => {
    setRunning((value) => !value)
  }, [])

  const configState = useMemo<ConfigState>(
    () => ({
      schemaVersion: LATEST_SCHEMA_VERSION,
      paper,
      templateGrid,
      frames,
      activeFrameIndex
    }),
    [paper, templateGrid, frames, activeFrameIndex]
  )

  const { savedEntries, saveManualEntry, deleteEntry, getEntryConfig, currentConfig } = useSavedConfigs(
    configState,
    { enabled: !hydratingRef.current && previewConfigRef.current === null }
  )

  const normalizeConfig = useCallback((config: ConfigState): ConfigState => {
    const normalizedGrid = normalizeGrid(config.templateGrid)
    const nextFrames = normalizeFrames(config.frames, normalizedGrid.rows * normalizedGrid.cols)
    const activeIndex = clampIndex(config.activeFrameIndex, nextFrames.length)
    return {
      schemaVersion: LATEST_SCHEMA_VERSION,
      paper: { ...DEFAULT_PAPER, ...config.paper },
      templateGrid: normalizedGrid,
      frames: nextFrames,
      activeFrameIndex: activeIndex
    }
  }, [])

  const applyConfig = useCallback((config: ConfigState) => {
    const normalized = normalizeConfig(config)
    setPaper(normalized.paper)
    setTemplateGrid(normalized.templateGrid)
    setFrames(normalized.frames)
    setActiveFrameIndex(normalized.activeFrameIndex)
    rebuildAllSimulations(normalized.frames)
  }, [normalizeConfig, rebuildAllSimulations])

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

  const activeFrame = frames[activeFrameIndex] ?? frames[0]

  const updateActiveFrame = useCallback(
    (updater: (frame: FrameConfig) => FrameConfig, options?: { rebuildSimulation?: boolean; seedOverride?: number }) => {
      if (!activeFrame) return
      const updated = updater(activeFrame)
      setFrames((prev) => {
        const next = [...prev]
        next[activeFrameIndex] = updated
        return next
      })
      if (options?.rebuildSimulation) {
        rebuildFrameSimulation(activeFrameIndex, updated, options.seedOverride)
      }
    },
    [activeFrame, activeFrameIndex, rebuildFrameSimulation]
  )

  const handleResetSimulation = useCallback(() => {
    if (!activeFrame) return
    const nextSeed = activeFrame.randomizeSeed ? createSeed() : activeFrame.seed
    updateActiveFrame(
      (frame) => ({
        ...frame,
        seed: nextSeed
      }),
      { rebuildSimulation: true, seedOverride: nextSeed }
    )
  }, [activeFrame, updateActiveFrame])

  const handleRegenerateObstacles = useCallback(() => {
    if (!activeFrame) return
    const nextSeed = activeFrame.randomizeSeed ? createSeed() : activeFrame.seed
    updateActiveFrame(
      (frame) => ({
        ...frame,
        seed: nextSeed
      }),
      { rebuildSimulation: true, seedOverride: nextSeed }
    )
  }, [activeFrame, updateActiveFrame])

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950">
      <aside className="h-screen w-[360px] border-r border-zinc-800 bg-zinc-950">
        <ScrollArea className="h-full">
          <ControlsPanel
            paper={paper}
            templateGrid={templateGrid}
            frames={frames}
            activeFrameIndex={activeFrameIndex}
            params={activeFrame?.params ?? DEFAULT_PARAMS}
            obstacles={activeFrame?.obstacles ?? DEFAULT_OBSTACLES}
            renderSettings={activeFrame?.renderSettings ?? DEFAULT_RENDER}
            exportSettings={activeFrame?.exportSettings ?? DEFAULT_EXPORT}
            seed={activeFrame?.seed ?? 0}
            randomizeSeed={activeFrame?.randomizeSeed ?? true}
            savedEntries={savedEntries}
            stats={stats}
            running={running}
            onPaperChange={setPaper}
            onTemplateGridChange={setTemplateGrid}
            onActiveFrameChange={setActiveFrameIndex}
            onParamsChange={(next) => {
              updateActiveFrame((frame) => ({ ...frame, params: next }))
            }}
            onObstacleChange={(next) => {
              updateActiveFrame((frame) => ({ ...frame, obstacles: next }), { rebuildSimulation: true })
            }}
            onRenderSettingsChange={(next) => {
              updateActiveFrame((frame) => ({ ...frame, renderSettings: next }))
            }}
            onExportSettingsChange={(next) => {
              updateActiveFrame((frame) => ({ ...frame, exportSettings: next }))
            }}
            onToggleRunning={handleToggleRunning}
            onResetSimulation={handleResetSimulation}
            onRegenerateObstacles={handleRegenerateObstacles}
            onExportPng={handleExportPng}
            onExportSvg={handleExportSvg}
            onExportMp4={handleExportMp4}
            onSeedChange={(next) => {
              updateActiveFrame((frame) => ({ ...frame, seed: next }), { rebuildSimulation: true, seedOverride: next })
            }}
            onRandomizeSeedChange={(next) => {
              updateActiveFrame((frame) => ({ ...frame, randomizeSeed: next }))
            }}
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
          key={`${boundsPx.width}-${boundsPx.height}-${gridLayout.rows}-${gridLayout.cols}`}
          simulationRef={simulationRef}
          framesRef={framesRef}
          gridLayout={gridLayout}
          templateGrid={templateGrid}
          running={running}
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

function normalizeGrid(grid: TemplateGridSettings): TemplateGridSettings {
  return {
    rows: Math.max(1, Math.floor(grid?.rows ?? DEFAULT_TEMPLATE_GRID.rows)),
    cols: Math.max(1, Math.floor(grid?.cols ?? DEFAULT_TEMPLATE_GRID.cols)),
    gutter: Number.isFinite(grid?.gutter) ? grid.gutter : DEFAULT_TEMPLATE_GRID.gutter,
    showGutter: typeof grid?.showGutter === 'boolean' ? grid.showGutter : DEFAULT_TEMPLATE_GRID.showGutter,
    gutterAsObstacles:
      typeof grid?.gutterAsObstacles === 'boolean' ? grid.gutterAsObstacles : DEFAULT_TEMPLATE_GRID.gutterAsObstacles
  }
}

function normalizeFrames(frames: FrameConfig[], targetLength: number): FrameConfig[] {
  const safeFrames = Array.isArray(frames) ? frames : []
  const normalized = safeFrames.map((frame) => ({
    params: { ...DEFAULT_PARAMS, ...(frame?.params ?? {}) },
    obstacles: { ...DEFAULT_OBSTACLES, ...(frame?.obstacles ?? {}) },
    renderSettings: { ...DEFAULT_RENDER, ...(frame?.renderSettings ?? {}) },
    exportSettings: { ...DEFAULT_EXPORT, ...(frame?.exportSettings ?? {}) },
    seed: Number.isFinite(frame?.seed) ? frame.seed : createSeed(),
    randomizeSeed: typeof frame?.randomizeSeed === 'boolean' ? frame.randomizeSeed : true
  }))
  if (normalized.length >= targetLength) {
    return normalized.slice(0, Math.max(1, targetLength))
  }
  const next = [...normalized]
  while (next.length < Math.max(1, targetLength)) {
    next.push(createDefaultFrame())
  }
  return next
}

function resizeFrames(frames: FrameConfig[], targetLength: number): FrameConfig[] {
  if (!Number.isFinite(targetLength) || targetLength < 1) return frames
  if (frames.length === targetLength) return frames
  if (frames.length > targetLength) {
    return frames.slice(0, targetLength)
  }
  const next = [...frames]
  while (next.length < targetLength) {
    next.push(createDefaultFrame())
  }
  return next
}

function clampIndex(index: number, length: number): number {
  if (!Number.isFinite(index)) return 0
  return Math.min(Math.max(0, Math.floor(index)), Math.max(0, length - 1))
}

function createGutterObstacles(
  bounds: Bounds,
  padding: number,
  edges: { top: boolean; bottom: boolean; left: boolean; right: boolean }
): Polygon[] {
  const inset = Math.min(Math.max(0, padding), bounds.width / 2, bounds.height / 2)
  if (inset <= 0) return []
  const w = bounds.width
  const h = bounds.height
  const polygons: Polygon[] = []
  if (edges.top) {
    polygons.push([
      { x: 0, y: 0 },
      { x: w, y: 0 },
      { x: w, y: inset },
      { x: 0, y: inset }
    ])
  }
  if (edges.bottom) {
    polygons.push([
      { x: 0, y: h - inset },
      { x: w, y: h - inset },
      { x: w, y: h },
      { x: 0, y: h }
    ])
  }
  if (edges.left) {
    polygons.push([
      { x: 0, y: inset },
      { x: inset, y: inset },
      { x: inset, y: h - inset },
      { x: 0, y: h - inset }
    ])
  }
  if (edges.right) {
    polygons.push([
      { x: w - inset, y: inset },
      { x: w, y: inset },
      { x: w, y: h - inset },
      { x: w - inset, y: h - inset }
    ])
  }
  return polygons
}
