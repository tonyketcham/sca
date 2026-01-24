import type { SimulationParams } from '../engine/simulationState'
import type { Unit } from '../geometry/units'
import { useMemo, useState } from 'react'
import type {
  PaperSettings,
  StatsSummary,
  SavedEntry,
  TemplateGridSettings,
  FrameConfig
} from '../types/ui'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Switch } from './ui/switch'
import { ScrubbableNumberInput } from './ui/scrubbable-number-input'
import { useUiContextState } from '../hooks/useUiContext'
import { ScrollArea } from './ui/scroll-area'
import LayersPanel from './LayersPanel'

type ControlsPanelProps = {
  paper: PaperSettings
  templateGrid: TemplateGridSettings
  frames: FrameConfig[]
  selectedFrameIndices: number[]
  savedEntries: SavedEntry[]
  stats: StatsSummary
  running: boolean
  onPaperChange: (next: PaperSettings) => void
  onTemplateGridChange: (next: TemplateGridSettings) => void
  onSelectProject: () => void
  onSelectFrame: (index: number) => void
  onToggleFrame: (index: number) => void
  onReorderFrames: (startIndex: number, endIndex: number) => void
  onUpdateSelectedFrames: (
    updater: (frame: FrameConfig) => FrameConfig,
    options?: { rebuildSimulation?: boolean; seedOverride?: number }
  ) => void
  onToggleRunning: () => void
  onResetSimulation: () => void
  onRegenerateObstacles: () => void
  onExportPng: () => void
  onExportSvg: () => void
  onExportMp4: () => void
  onSaveEntry: (name?: string) => void
  onLoadEntry: (id: string) => void
  onDeleteEntry: (id: string) => void
  onPreviewEntry: (id: string) => void
  onPreviewEnd: () => void
}

type SectionKey = 'simulation' | 'template' | 'paper' | 'obstacles' | 'rendering' | 'export' | 'saved'

export default function ControlsPanel({
  paper,
  templateGrid,
  frames,
  selectedFrameIndices,
  savedEntries,
  stats,
  running,
  onPaperChange,
  onTemplateGridChange,
  onSelectProject,
  onSelectFrame,
  onToggleFrame,
  onReorderFrames,
  onUpdateSelectedFrames,
  onToggleRunning,
  onResetSimulation,
  onRegenerateObstacles,
  onExportPng,
  onExportSvg,
  onExportMp4,
  onSaveEntry,
  onLoadEntry,
  onDeleteEntry,
  onPreviewEntry,
  onPreviewEnd
}: ControlsPanelProps) {
  const [saveName, setSaveName] = useState('')
  const defaultSections: Record<SectionKey, boolean> = {
    simulation: true,
    template: true,
    paper: false,
    obstacles: false,
    rendering: false,
    export: false,
    saved: false
  }
  const [openSections, setOpenSections] = useUiContextState<Record<SectionKey, boolean>>(
    'controlsPanel.sections',
    defaultSections,
    {
      merge: (stored) => ({ ...defaultSections, ...(stored ?? {}) })
    }
  )

  const selectedFrames = useMemo(
    () => selectedFrameIndices.map((index) => frames[index]).filter(Boolean),
    [frames, selectedFrameIndices]
  )
  const hasFrameSelection = selectedFrames.length > 0
  const showProjectControls = !hasFrameSelection

  const getMixedValue = <T,>(values: T[]): T | null => {
    if (values.length === 0) return null
    const first = values[0]
    return values.every((value) => value === first) ? first : null
  }

  const mixedParams = useMemo(() => {
    if (!hasFrameSelection) return null
    return {
      influenceRadius: getMixedValue(selectedFrames.map((frame) => frame.params.influenceRadius)),
      killRadius: getMixedValue(selectedFrames.map((frame) => frame.params.killRadius)),
      stepSize: getMixedValue(selectedFrames.map((frame) => frame.params.stepSize)),
      maxNodes: getMixedValue(selectedFrames.map((frame) => frame.params.maxNodes)),
      attractorCount: getMixedValue(selectedFrames.map((frame) => frame.params.attractorCount)),
      stepsPerFrame: getMixedValue(selectedFrames.map((frame) => frame.params.stepsPerFrame)),
      seedCount: getMixedValue(selectedFrames.map((frame) => frame.params.seedCount)),
      seedSpread: getMixedValue(selectedFrames.map((frame) => frame.params.seedSpread)),
      seedPlacement: getMixedValue(selectedFrames.map((frame) => frame.params.seedPlacement)),
      seedEdge: getMixedValue(selectedFrames.map((frame) => frame.params.seedEdge)),
      seedAngle: getMixedValue(selectedFrames.map((frame) => frame.params.seedAngle)),
      avoidObstacles: getMixedValue(selectedFrames.map((frame) => frame.params.avoidObstacles))
    }
  }, [hasFrameSelection, selectedFrames])

  const mixedObstacles = useMemo(() => {
    if (!hasFrameSelection) return null
    return {
      count: getMixedValue(selectedFrames.map((frame) => frame.obstacles.count)),
      minVertices: getMixedValue(selectedFrames.map((frame) => frame.obstacles.minVertices)),
      maxVertices: getMixedValue(selectedFrames.map((frame) => frame.obstacles.maxVertices)),
      minRadius: getMixedValue(selectedFrames.map((frame) => frame.obstacles.minRadius)),
      maxRadius: getMixedValue(selectedFrames.map((frame) => frame.obstacles.maxRadius)),
      margin: getMixedValue(selectedFrames.map((frame) => frame.obstacles.margin))
    }
  }, [hasFrameSelection, selectedFrames])

  const mixedRenderSettings = useMemo(() => {
    if (!hasFrameSelection) return null
    return {
      showAttractors: getMixedValue(selectedFrames.map((frame) => frame.renderSettings.showAttractors)),
      showNodes: getMixedValue(selectedFrames.map((frame) => frame.renderSettings.showNodes)),
      showObstacles: getMixedValue(selectedFrames.map((frame) => frame.renderSettings.showObstacles)),
      strokeWidth: getMixedValue(selectedFrames.map((frame) => frame.renderSettings.strokeWidth)),
      nodeRadius: getMixedValue(selectedFrames.map((frame) => frame.renderSettings.nodeRadius)),
      rootColor: getMixedValue(selectedFrames.map((frame) => frame.renderSettings.rootColor)),
      obstacleFill: getMixedValue(selectedFrames.map((frame) => frame.renderSettings.obstacleFill)),
      attractorColor: getMixedValue(selectedFrames.map((frame) => frame.renderSettings.attractorColor))
    }
  }, [hasFrameSelection, selectedFrames])

  const mixedExportSettings = useMemo(() => {
    if (!hasFrameSelection) return null
    return {
      fps: getMixedValue(selectedFrames.map((frame) => frame.exportSettings.fps)),
      durationSeconds: getMixedValue(selectedFrames.map((frame) => frame.exportSettings.durationSeconds)),
      stepsPerFrame: getMixedValue(selectedFrames.map((frame) => frame.exportSettings.stepsPerFrame)),
      durationMode: getMixedValue(selectedFrames.map((frame) => frame.exportSettings.durationMode))
    }
  }, [hasFrameSelection, selectedFrames])

  const mixedSeed = useMemo(() => {
    if (!hasFrameSelection) return null
    return {
      seed: getMixedValue(selectedFrames.map((frame) => frame.seed)),
      randomizeSeed: getMixedValue(selectedFrames.map((frame) => frame.randomizeSeed))
    }
  }, [hasFrameSelection, selectedFrames])

  const toggleSection = (key: SectionKey) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const renderSectionHeader = (title: string, key: SectionKey, description?: string) => {
    const isOpen = openSections[key] ?? defaultSections[key]
    const sectionId = `section-${key}`
    return (
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={sectionId}
        onClick={() => toggleSection(key)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <div className="space-y-0.5">
          <h2 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-zinc-200">
            {title}
          </h2>
          {description ? <div className="text-[10px] text-zinc-500">{description}</div> : null}
        </div>
        <span className="rounded-md border border-zinc-800 bg-zinc-950/60 px-2 py-1 text-[10px] text-zinc-400">
          {isOpen ? 'v' : '>'}
        </span>
      </button>
    )
  }
  return (
    <div className="flex h-full flex-col text-[11px] text-zinc-300">
      <LayersPanel
        frames={frames}
        templateGrid={templateGrid}
        selectedFrameIndices={selectedFrameIndices}
        onSelectProject={onSelectProject}
        onSelectFrame={onSelectFrame}
        onToggleFrame={onToggleFrame}
        onReorderFrames={onReorderFrames}
      />
      <ScrollArea className="flex-1">
        <div className="space-y-4 p-4">
          <header className="space-y-1">
            <h1 className="text-[13px] font-semibold text-white">Root Growth Studio</h1>
            <p className="text-[11px] text-zinc-400">
              Space colonization growth with real-time parameter control.
            </p>
          </header>
          <div className="-mx-4 divide-y divide-zinc-800 border-y border-zinc-800">
        {hasFrameSelection ? (
          <section className="space-y-3 px-4 py-3">
            {renderSectionHeader('Simulation', 'simulation')}
            {openSections.simulation ? (
              <div id="section-simulation" className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label>Influence radius</Label>
                    <ScrubbableNumberInput
                      min={5}
                      integer
                      value={mixedParams?.influenceRadius ?? null}
                      placeholder={mixedParams?.influenceRadius === null ? 'Mixed' : undefined}
                      onValueChange={(next) =>
                        onUpdateSelectedFrames((frame) => ({
                          ...frame,
                          params: { ...frame.params, influenceRadius: next }
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Kill radius</Label>
                    <ScrubbableNumberInput
                      min={1}
                      integer
                      value={mixedParams?.killRadius ?? null}
                      placeholder={mixedParams?.killRadius === null ? 'Mixed' : undefined}
                      onValueChange={(next) =>
                        onUpdateSelectedFrames((frame) => ({
                          ...frame,
                          params: { ...frame.params, killRadius: next }
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Step size</Label>
                    <ScrubbableNumberInput
                      min={0.5}
                      step={0.5}
                      value={mixedParams?.stepSize ?? null}
                      placeholder={mixedParams?.stepSize === null ? 'Mixed' : undefined}
                      onValueChange={(next) =>
                        onUpdateSelectedFrames((frame) => ({
                          ...frame,
                          params: { ...frame.params, stepSize: next }
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Max nodes</Label>
                    <ScrubbableNumberInput
                      min={100}
                      integer
                      value={mixedParams?.maxNodes ?? null}
                      placeholder={mixedParams?.maxNodes === null ? 'Mixed' : undefined}
                      onValueChange={(next) =>
                        onUpdateSelectedFrames((frame) => ({
                          ...frame,
                          params: { ...frame.params, maxNodes: next }
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Attractor count</Label>
                    <ScrubbableNumberInput
                      min={50}
                      integer
                      value={mixedParams?.attractorCount ?? null}
                      placeholder={mixedParams?.attractorCount === null ? 'Mixed' : undefined}
                      onValueChange={(next) =>
                        onUpdateSelectedFrames((frame) => ({
                          ...frame,
                          params: { ...frame.params, attractorCount: next }
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Steps per frame</Label>
                    <ScrubbableNumberInput
                      min={1}
                      integer
                      value={mixedParams?.stepsPerFrame ?? null}
                      placeholder={mixedParams?.stepsPerFrame === null ? 'Mixed' : undefined}
                      onValueChange={(next) =>
                        onUpdateSelectedFrames((frame) => ({
                          ...frame,
                          params: { ...frame.params, stepsPerFrame: next }
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Seed count</Label>
                    <ScrubbableNumberInput
                      min={1}
                      integer
                      value={mixedParams?.seedCount ?? null}
                      placeholder={mixedParams?.seedCount === null ? 'Mixed' : undefined}
                      onValueChange={(next) =>
                        onUpdateSelectedFrames((frame) => ({
                          ...frame,
                          params: { ...frame.params, seedCount: next }
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Seed spread (%)</Label>
                    <ScrubbableNumberInput
                      min={0}
                      max={100}
                      integer
                      value={mixedParams?.seedSpread ?? null}
                      placeholder={mixedParams?.seedSpread === null ? 'Mixed' : undefined}
                      onValueChange={(next) =>
                        onUpdateSelectedFrames((frame) => ({
                          ...frame,
                          params: { ...frame.params, seedSpread: next }
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Seed placement</Label>
                    <Select
                      value={mixedParams?.seedPlacement ?? undefined}
                      onValueChange={(value) =>
                        onUpdateSelectedFrames((frame) => ({
                          ...frame,
                          params: { ...frame.params, seedPlacement: value as SimulationParams['seedPlacement'] }
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={mixedParams?.seedPlacement ? undefined : 'Mixed'} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="edge">Edge line</SelectItem>
                        <SelectItem value="scatter">Scatter</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {mixedParams?.seedPlacement === 'edge' ? (
                    <>
                      <div className="space-y-1">
                        <Label>Seed edge</Label>
                        <Select
                          value={mixedParams?.seedEdge ?? undefined}
                          onValueChange={(value) =>
                            onUpdateSelectedFrames((frame) => ({
                              ...frame,
                              params: { ...frame.params, seedEdge: value as SimulationParams['seedEdge'] }
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={mixedParams?.seedEdge ? undefined : 'Mixed'} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="top">Top</SelectItem>
                            <SelectItem value="bottom">Bottom</SelectItem>
                            <SelectItem value="left">Left</SelectItem>
                            <SelectItem value="right">Right</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label>Seed angle (deg)</Label>
                        <ScrubbableNumberInput
                          min={-180}
                          max={180}
                          step={1}
                          integer
                          value={mixedParams?.seedAngle ?? null}
                          placeholder={mixedParams?.seedAngle === null ? 'Mixed' : undefined}
                          onValueChange={(next) =>
                            onUpdateSelectedFrames((frame) => ({
                              ...frame,
                              params: { ...frame.params, seedAngle: next }
                            }))
                          }
                        />
                      </div>
                    </>
                  ) : null}
                </div>
                <div className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950/60 px-2 py-1.5">
                  <div>
                    <Label className="text-[11px] text-zinc-200">Avoid obstacles</Label>
                    <div className="text-[10px] text-zinc-500">
                      {mixedParams?.avoidObstacles === null ? 'Mixed' : 'Block growth inside polygons.'}
                    </div>
                  </div>
                  <Switch
                    checked={mixedParams?.avoidObstacles ?? false}
                    onCheckedChange={(checked) =>
                      onUpdateSelectedFrames((frame) => ({
                        ...frame,
                        params: { ...frame.params, avoidObstacles: checked }
                      }))
                    }
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={onToggleRunning}
                    variant="default"
                    size="sm"
                    className="h-7 px-2 text-[11px]"
                  >
                    {running ? 'Pause' : 'Run'}
                  </Button>
                  <Button
                    onClick={onResetSimulation}
                    variant="secondary"
                    size="sm"
                    className="h-7 px-2 text-[11px]"
                  >
                    Reset growth
                  </Button>
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950/60 px-2 py-1.5">
                    <div>
                      <Label className="text-[11px] text-zinc-200">Randomize seed</Label>
                      <div className="text-[10px] text-zinc-500">
                        {mixedSeed?.randomizeSeed === null ? 'Mixed' : 'Generate a new seed on reset.'}
                      </div>
                    </div>
                    <Switch
                      checked={mixedSeed?.randomizeSeed ?? false}
                      onCheckedChange={(checked) =>
                        onUpdateSelectedFrames((frame) => ({
                          ...frame,
                          randomizeSeed: checked
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Seed</Label>
                    <ScrubbableNumberInput
                      min={0}
                      integer
                      value={mixedSeed?.seed ?? null}
                      placeholder={mixedSeed?.seed === null ? 'Mixed' : undefined}
                      onValueChange={(next) =>
                        onUpdateSelectedFrames(
                          (frame) => ({
                            ...frame,
                            seed: next
                          }),
                          { rebuildSimulation: true, seedOverride: next }
                        )
                      }
                      disabled={mixedSeed?.randomizeSeed === true}
                      className={mixedSeed?.randomizeSeed === true ? 'opacity-60' : undefined}
                    />
                  </div>
                </div>
                <div className="grid gap-1 text-[10px] text-zinc-500">
                  <div>Nodes: {stats.nodes}</div>
                  <div>Attractors: {stats.attractors}</div>
                  <div>Iterations: {stats.iterations}</div>
                  <div>Status: {stats.completed ? 'Complete' : 'Growing'}</div>
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {showProjectControls ? (
          <section className="space-y-3 px-4 py-3">
            {renderSectionHeader('Template Grid', 'template')}
            {openSections.template ? (
              <div id="section-template" className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label>Rows</Label>
                    <ScrubbableNumberInput
                      min={1}
                      integer
                      value={templateGrid.rows}
                      onValueChange={(next) => onTemplateGridChange({ ...templateGrid, rows: next })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Columns</Label>
                    <ScrubbableNumberInput
                      min={1}
                      integer
                      value={templateGrid.cols}
                      onValueChange={(next) => onTemplateGridChange({ ...templateGrid, cols: next })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Gutter ({paper.unit})</Label>
                    <ScrubbableNumberInput
                      min={0}
                      step={0.1}
                      value={templateGrid.gutter}
                      onValueChange={(next) => onTemplateGridChange({ ...templateGrid, gutter: next })}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950/60 px-2 py-1.5">
                    <div>
                      <Label className="text-[11px] text-zinc-200">Show gutter</Label>
                      <div className="text-[10px] text-zinc-500">Display grid margins in the editor.</div>
                    </div>
                    <Switch
                      checked={templateGrid.showGutter}
                      onCheckedChange={(checked) => onTemplateGridChange({ ...templateGrid, showGutter: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950/60 px-2 py-1.5">
                    <div>
                      <Label className="text-[11px] text-zinc-200">Gutter as obstacles</Label>
                      <div className="text-[10px] text-zinc-500">Prevent growth inside the gutter margins.</div>
                    </div>
                    <Switch
                      checked={templateGrid.gutterAsObstacles}
                      onCheckedChange={(checked) =>
                        onTemplateGridChange({ ...templateGrid, gutterAsObstacles: checked })
                      }
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {showProjectControls ? (
          <section className="space-y-3 px-4 py-3">
            {renderSectionHeader('Paper', 'paper')}
            {openSections.paper ? (
              <div id="section-paper" className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label>Width ({paper.unit})</Label>
                    <ScrubbableNumberInput
                      min={1}
                      value={paper.width}
                      onValueChange={(next) => onPaperChange({ ...paper, width: next })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Height ({paper.unit})</Label>
                    <ScrubbableNumberInput
                      min={1}
                      value={paper.height}
                      onValueChange={(next) => onPaperChange({ ...paper, height: next })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Units</Label>
                    <Select
                      value={paper.unit}
                      onValueChange={(value) => onPaperChange({ ...paper, unit: value as Unit })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="in">Inches</SelectItem>
                        <SelectItem value="cm">Centimeters</SelectItem>
                        <SelectItem value="mm">Millimeters</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>DPI</Label>
                    <ScrubbableNumberInput
                      min={36}
                      integer
                      value={paper.dpi}
                      onValueChange={(next) => onPaperChange({ ...paper, dpi: next })}
                    />
                  </div>
                </div>
                <p className="text-[10px] text-zinc-500">
                  Changing paper size resets the simulation and obstacles.
                </p>
              </div>
            ) : null}
          </section>
        ) : null}

        {hasFrameSelection ? (
          <section className="space-y-3 px-4 py-3">
            {renderSectionHeader('Obstacles', 'obstacles')}
            {openSections.obstacles ? (
              <div id="section-obstacles" className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label>Polygon count</Label>
                    <ScrubbableNumberInput
                      min={0}
                      integer
                      value={mixedObstacles?.count ?? null}
                      placeholder={mixedObstacles?.count === null ? 'Mixed' : undefined}
                      onValueChange={(next) =>
                        onUpdateSelectedFrames(
                          (frame) => ({
                            ...frame,
                            obstacles: { ...frame.obstacles, count: next }
                          }),
                          { rebuildSimulation: true }
                        )
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Vertices (min)</Label>
                    <ScrubbableNumberInput
                      min={3}
                      integer
                      value={mixedObstacles?.minVertices ?? null}
                      placeholder={mixedObstacles?.minVertices === null ? 'Mixed' : undefined}
                      onValueChange={(next) =>
                        onUpdateSelectedFrames(
                          (frame) => ({
                            ...frame,
                            obstacles: { ...frame.obstacles, minVertices: next }
                          }),
                          { rebuildSimulation: true }
                        )
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Vertices (max)</Label>
                    <ScrubbableNumberInput
                      min={3}
                      integer
                      value={mixedObstacles?.maxVertices ?? null}
                      placeholder={mixedObstacles?.maxVertices === null ? 'Mixed' : undefined}
                      onValueChange={(next) =>
                        onUpdateSelectedFrames(
                          (frame) => ({
                            ...frame,
                            obstacles: { ...frame.obstacles, maxVertices: next }
                          }),
                          { rebuildSimulation: true }
                        )
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Min radius ({paper.unit})</Label>
                    <ScrubbableNumberInput
                      min={0.1}
                      step={0.1}
                      value={mixedObstacles?.minRadius ?? null}
                      placeholder={mixedObstacles?.minRadius === null ? 'Mixed' : undefined}
                      onValueChange={(next) =>
                        onUpdateSelectedFrames(
                          (frame) => ({
                            ...frame,
                            obstacles: { ...frame.obstacles, minRadius: next }
                          }),
                          { rebuildSimulation: true }
                        )
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Max radius ({paper.unit})</Label>
                    <ScrubbableNumberInput
                      min={0.2}
                      step={0.1}
                      value={mixedObstacles?.maxRadius ?? null}
                      placeholder={mixedObstacles?.maxRadius === null ? 'Mixed' : undefined}
                      onValueChange={(next) =>
                        onUpdateSelectedFrames(
                          (frame) => ({
                            ...frame,
                            obstacles: { ...frame.obstacles, maxRadius: next }
                          }),
                          { rebuildSimulation: true }
                        )
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Margin ({paper.unit})</Label>
                    <ScrubbableNumberInput
                      min={0}
                      step={0.1}
                      value={mixedObstacles?.margin ?? null}
                      placeholder={mixedObstacles?.margin === null ? 'Mixed' : undefined}
                      onValueChange={(next) =>
                        onUpdateSelectedFrames(
                          (frame) => ({
                            ...frame,
                            obstacles: { ...frame.obstacles, margin: next }
                          }),
                          { rebuildSimulation: true }
                        )
                      }
                    />
                  </div>
                </div>
                <Button
                  onClick={onRegenerateObstacles}
                  variant="secondary"
                  size="sm"
                  className="h-7 px-2 text-[11px]"
                >
                  Regenerate obstacles
                </Button>
              </div>
            ) : null}
          </section>
        ) : null}

        {hasFrameSelection ? (
          <section className="space-y-3 px-4 py-3">
            {renderSectionHeader('Rendering', 'rendering')}
            {openSections.rendering ? (
              <div id="section-rendering" className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label>Stroke width</Label>
                    <ScrubbableNumberInput
                      min={0.5}
                      step={0.5}
                      value={mixedRenderSettings?.strokeWidth ?? null}
                      placeholder={mixedRenderSettings?.strokeWidth === null ? 'Mixed' : undefined}
                      onValueChange={(next) =>
                        onUpdateSelectedFrames((frame) => ({
                          ...frame,
                          renderSettings: { ...frame.renderSettings, strokeWidth: next }
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Node radius</Label>
                    <ScrubbableNumberInput
                      min={0.5}
                      step={0.5}
                      value={mixedRenderSettings?.nodeRadius ?? null}
                      placeholder={mixedRenderSettings?.nodeRadius === null ? 'Mixed' : undefined}
                      onValueChange={(next) =>
                        onUpdateSelectedFrames((frame) => ({
                          ...frame,
                          renderSettings: { ...frame.renderSettings, nodeRadius: next }
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label>Root color</Label>
                    {mixedRenderSettings?.rootColor === null ? (
                      <div className="text-[10px] text-zinc-500">Mixed</div>
                    ) : null}
                    <Input
                      type="color"
                      value={mixedRenderSettings?.rootColor ?? '#000000'}
                      onChange={(event) =>
                        onUpdateSelectedFrames((frame) => ({
                          ...frame,
                          renderSettings: { ...frame.renderSettings, rootColor: event.target.value }
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Obstacle color</Label>
                    {mixedRenderSettings?.obstacleFill === null ? (
                      <div className="text-[10px] text-zinc-500">Mixed</div>
                    ) : null}
                    <Input
                      type="color"
                      value={mixedRenderSettings?.obstacleFill ?? '#000000'}
                      onChange={(event) =>
                        onUpdateSelectedFrames((frame) => ({
                          ...frame,
                          renderSettings: { ...frame.renderSettings, obstacleFill: event.target.value }
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Attractor color</Label>
                    {mixedRenderSettings?.attractorColor === null ? (
                      <div className="text-[10px] text-zinc-500">Mixed</div>
                    ) : null}
                    <Input
                      type="color"
                      value={mixedRenderSettings?.attractorColor ?? '#000000'}
                      onChange={(event) =>
                        onUpdateSelectedFrames((frame) => ({
                          ...frame,
                          renderSettings: { ...frame.renderSettings, attractorColor: event.target.value }
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950/60 px-2 py-1.5">
                  <div>
                    <Label className="text-[11px] text-zinc-200">Show obstacles</Label>
                    <div className="text-[10px] text-zinc-500">
                      {mixedRenderSettings?.showObstacles === null ? 'Mixed' : 'Hide polygons in view + exports.'}
                    </div>
                  </div>
                  <Switch
                    checked={mixedRenderSettings?.showObstacles ?? false}
                    onCheckedChange={(checked) =>
                      onUpdateSelectedFrames((frame) => ({
                        ...frame,
                        renderSettings: { ...frame.renderSettings, showObstacles: checked }
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950/60 px-2 py-1.5">
                  <div>
                    <Label className="text-[11px] text-zinc-200">Show attractors</Label>
                    <div className="text-[10px] text-zinc-500">
                      {mixedRenderSettings?.showAttractors === null ? 'Mixed' : 'Reveal growth targets.'}
                    </div>
                  </div>
                  <Switch
                    checked={mixedRenderSettings?.showAttractors ?? false}
                    onCheckedChange={(checked) =>
                      onUpdateSelectedFrames((frame) => ({
                        ...frame,
                        renderSettings: { ...frame.renderSettings, showAttractors: checked }
                      }))
                    }
                  />
                </div>
                <div className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950/60 px-2 py-1.5">
                  <div>
                    <Label className="text-[11px] text-zinc-200">Show nodes</Label>
                    <div className="text-[10px] text-zinc-500">
                      {mixedRenderSettings?.showNodes === null ? 'Mixed' : 'Draw node points along roots.'}
                    </div>
                  </div>
                  <Switch
                    checked={mixedRenderSettings?.showNodes ?? false}
                    onCheckedChange={(checked) =>
                      onUpdateSelectedFrames((frame) => ({
                        ...frame,
                        renderSettings: { ...frame.renderSettings, showNodes: checked }
                      }))
                    }
                  />
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {hasFrameSelection ? (
          <section className="space-y-3 px-4 py-3">
            {renderSectionHeader('Export', 'export')}
            {openSections.export ? (
              <div id="section-export" className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label>MP4 FPS</Label>
                    <ScrubbableNumberInput
                      min={1}
                      integer
                      value={mixedExportSettings?.fps ?? null}
                      placeholder={mixedExportSettings?.fps === null ? 'Mixed' : undefined}
                      onValueChange={(next) =>
                        onUpdateSelectedFrames((frame) => ({
                          ...frame,
                          exportSettings: { ...frame.exportSettings, fps: next }
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>MP4 Duration (s)</Label>
                    <ScrubbableNumberInput
                      min={1}
                      integer
                      value={mixedExportSettings?.durationSeconds ?? null}
                      placeholder={mixedExportSettings?.durationSeconds === null ? 'Mixed' : undefined}
                      onValueChange={(next) =>
                        onUpdateSelectedFrames((frame) => ({
                          ...frame,
                          exportSettings: { ...frame.exportSettings, durationSeconds: next }
                        }))
                      }
                      className={mixedExportSettings?.durationMode === 'auto' ? 'opacity-60' : undefined}
                      disabled={mixedExportSettings?.durationMode === 'auto'}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>MP4 Steps/frame</Label>
                    <ScrubbableNumberInput
                      min={1}
                      integer
                      value={mixedExportSettings?.stepsPerFrame ?? null}
                      placeholder={mixedExportSettings?.stepsPerFrame === null ? 'Mixed' : undefined}
                      onValueChange={(next) =>
                        onUpdateSelectedFrames((frame) => ({
                          ...frame,
                          exportSettings: { ...frame.exportSettings, stepsPerFrame: next }
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950/60 px-2 py-1.5">
                  <div>
                    <Label className="text-[11px] text-zinc-200">Auto duration</Label>
                    <div className="text-[10px] text-zinc-500">
                      {mixedExportSettings?.durationMode === null ? 'Mixed' : 'Stop when growth completes.'}
                    </div>
                  </div>
                  <Switch
                    checked={mixedExportSettings?.durationMode === 'auto'}
                    onCheckedChange={(checked) =>
                      onUpdateSelectedFrames((frame) => ({
                        ...frame,
                        exportSettings: { ...frame.exportSettings, durationMode: checked ? 'auto' : 'fixed' }
                      }))
                    }
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={onExportPng} variant="secondary" size="sm" className="h-7 px-2">
                    Export PNG
                  </Button>
                  <Button onClick={onExportSvg} variant="secondary" size="sm" className="h-7 px-2">
                    Export SVG
                  </Button>
                  <Button onClick={onExportMp4} variant="default" size="sm" className="h-7 px-2">
                    Export MP4
                  </Button>
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {showProjectControls ? (
          <section className="space-y-3 px-4 py-3">
            {renderSectionHeader('Saved Runs', 'saved')}
            {openSections.saved ? (
              <div id="section-saved" className="space-y-3">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={saveName}
                    onChange={(event) => setSaveName(event.target.value)}
                    placeholder="New save name"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-7 px-2 text-[11px]"
                    onClick={() => {
                      onSaveEntry(saveName)
                      setSaveName('')
                    }}
                  >
                    Save current
                  </Button>
                </div>
                <div className="space-y-2">
                  {savedEntries.length === 0 ? (
                    <div className="text-[10px] text-zinc-500">No saved runs yet.</div>
                  ) : (
                    savedEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="rounded-md border border-zinc-800 bg-zinc-950/60 p-2 text-[11px] text-zinc-300"
                        onMouseEnter={() => onPreviewEntry(entry.id)}
                        onMouseLeave={onPreviewEnd}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="text-[12px] text-zinc-100">{entry.name}</div>
                            <div className="text-[10px] text-zinc-500">
                              Seed: {entry.seed} {entry.randomizeSeed ? '(random)' : '(fixed)'}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 text-[11px]"
                              onClick={() => onLoadEntry(entry.id)}
                            >
                              Load
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="h-7 px-2 text-[11px]"
                              onClick={() => onDeleteEntry(entry.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : null}
          </section>
        ) : null}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
