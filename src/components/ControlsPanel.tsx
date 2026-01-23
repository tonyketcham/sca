import type { SimulationParams } from '../engine/simulationState'
import type { Unit } from '../geometry/units'
import type { RenderSettings } from '../render/canvasRenderer'
import { useState } from 'react'
import type { ObstacleSettings, PaperSettings, ExportSettings, StatsSummary, SavedEntry } from '../types/ui'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Switch } from './ui/switch'
import { ScrubbableNumberInput } from './ui/scrubbable-number-input'
import { useUiContextState } from '../hooks/useUiContext'

type ControlsPanelProps = {
  paper: PaperSettings
  params: SimulationParams
  obstacles: ObstacleSettings
  renderSettings: RenderSettings
  exportSettings: ExportSettings
  seed: number
  randomizeSeed: boolean
  savedEntries: SavedEntry[]
  stats: StatsSummary
  running: boolean
  onPaperChange: (next: PaperSettings) => void
  onParamsChange: (next: SimulationParams) => void
  onObstacleChange: (next: ObstacleSettings) => void
  onRenderSettingsChange: (next: RenderSettings) => void
  onExportSettingsChange: (next: ExportSettings) => void
  onToggleRunning: () => void
  onResetSimulation: () => void
  onRegenerateObstacles: () => void
  onExportPng: () => void
  onExportSvg: () => void
  onExportMp4: () => void
  onSeedChange: (next: number) => void
  onRandomizeSeedChange: (next: boolean) => void
  onSaveEntry: (name?: string) => void
  onLoadEntry: (id: string) => void
  onDeleteEntry: (id: string) => void
  onPreviewEntry: (id: string) => void
  onPreviewEnd: () => void
}

type SectionKey = 'simulation' | 'paper' | 'obstacles' | 'rendering' | 'export' | 'saved'

export default function ControlsPanel({
  paper,
  params,
  obstacles,
  renderSettings,
  exportSettings,
  seed,
  randomizeSeed,
  savedEntries,
  stats,
  running,
  onPaperChange,
  onParamsChange,
  onObstacleChange,
  onRenderSettingsChange,
  onExportSettingsChange,
  onToggleRunning,
  onResetSimulation,
  onRegenerateObstacles,
  onExportPng,
  onExportSvg,
  onExportMp4,
  onSeedChange,
  onRandomizeSeedChange,
  onSaveEntry,
  onLoadEntry,
  onDeleteEntry,
  onPreviewEntry,
  onPreviewEnd
}: ControlsPanelProps) {
  const [saveName, setSaveName] = useState('')
  const defaultSections: Record<SectionKey, boolean> = {
    simulation: true,
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
    <div className="space-y-4 p-4 text-[11px] text-zinc-300">
      <header className="space-y-1">
        <h1 className="text-[13px] font-semibold text-white">Root Growth Studio</h1>
        <p className="text-[11px] text-zinc-400">
          Space colonization growth with real-time parameter control.
        </p>
      </header>
      <div className="-mx-4 divide-y divide-zinc-800 border-y border-zinc-800">
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
                value={params.influenceRadius}
                onValueChange={(next) => onParamsChange({ ...params, influenceRadius: next })}
              />
            </div>
            <div className="space-y-1">
              <Label>Kill radius</Label>
              <ScrubbableNumberInput
                min={1}
                integer
                value={params.killRadius}
                onValueChange={(next) => onParamsChange({ ...params, killRadius: next })}
              />
            </div>
            <div className="space-y-1">
              <Label>Step size</Label>
              <ScrubbableNumberInput
                min={0.5}
                step={0.5}
                value={params.stepSize}
                onValueChange={(next) => onParamsChange({ ...params, stepSize: next })}
              />
            </div>
            <div className="space-y-1">
              <Label>Max nodes</Label>
              <ScrubbableNumberInput
                min={100}
                integer
                value={params.maxNodes}
                onValueChange={(next) => onParamsChange({ ...params, maxNodes: next })}
              />
            </div>
            <div className="space-y-1">
              <Label>Attractor count</Label>
              <ScrubbableNumberInput
                min={50}
                integer
                value={params.attractorCount}
                onValueChange={(next) => onParamsChange({ ...params, attractorCount: next })}
              />
            </div>
            <div className="space-y-1">
              <Label>Steps per frame</Label>
              <ScrubbableNumberInput
                min={1}
                integer
                value={params.stepsPerFrame}
                onValueChange={(next) => onParamsChange({ ...params, stepsPerFrame: next })}
              />
            </div>
            <div className="space-y-1">
              <Label>Seed count</Label>
              <ScrubbableNumberInput
                min={1}
                integer
                value={params.seedCount}
                onValueChange={(next) => onParamsChange({ ...params, seedCount: next })}
              />
            </div>
            <div className="space-y-1">
              <Label>Seed spread (%)</Label>
              <ScrubbableNumberInput
                min={0}
                max={100}
                integer
                value={params.seedSpread}
                onValueChange={(next) => onParamsChange({ ...params, seedSpread: next })}
              />
            </div>
            <div className="space-y-1">
              <Label>Seed placement</Label>
              <Select
                value={params.seedPlacement}
                onValueChange={(value) =>
                  onParamsChange({ ...params, seedPlacement: value as SimulationParams['seedPlacement'] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="edge">Edge line</SelectItem>
                  <SelectItem value="scatter">Scatter</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {params.seedPlacement === 'edge' ? (
              <>
                <div className="space-y-1">
                  <Label>Seed edge</Label>
                  <Select
                    value={params.seedEdge}
                    onValueChange={(value) =>
                      onParamsChange({ ...params, seedEdge: value as SimulationParams['seedEdge'] })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
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
                    value={params.seedAngle}
                    onValueChange={(next) => onParamsChange({ ...params, seedAngle: next })}
                  />
                </div>
              </>
            ) : null}
              </div>
              <div className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950/60 px-2 py-1.5">
                <div>
                  <Label className="text-[11px] text-zinc-200">Avoid obstacles</Label>
                  <div className="text-[10px] text-zinc-500">Block growth inside polygons.</div>
                </div>
                <Switch
                  checked={params.avoidObstacles}
                  onCheckedChange={(checked) =>
                    onParamsChange({ ...params, avoidObstacles: checked })
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
                    <div className="text-[10px] text-zinc-500">Generate a new seed on reset.</div>
                  </div>
                  <Switch checked={randomizeSeed} onCheckedChange={onRandomizeSeedChange} />
                </div>
                <div className="space-y-1">
                  <Label>Seed</Label>
                  <ScrubbableNumberInput
                    min={0}
                    integer
                    value={seed}
                    onValueChange={onSeedChange}
                    disabled={randomizeSeed}
                    className={randomizeSeed ? 'opacity-60' : undefined}
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
                value={obstacles.count}
                onValueChange={(next) => onObstacleChange({ ...obstacles, count: next })}
              />
            </div>
            <div className="space-y-1">
              <Label>Vertices (min)</Label>
              <ScrubbableNumberInput
                min={3}
                integer
                value={obstacles.minVertices}
                onValueChange={(next) => onObstacleChange({ ...obstacles, minVertices: next })}
              />
            </div>
            <div className="space-y-1">
              <Label>Vertices (max)</Label>
              <ScrubbableNumberInput
                min={3}
                integer
                value={obstacles.maxVertices}
                onValueChange={(next) => onObstacleChange({ ...obstacles, maxVertices: next })}
              />
            </div>
            <div className="space-y-1">
              <Label>Min radius ({paper.unit})</Label>
              <ScrubbableNumberInput
                min={0.1}
                step={0.1}
                value={obstacles.minRadius}
                onValueChange={(next) => onObstacleChange({ ...obstacles, minRadius: next })}
              />
            </div>
            <div className="space-y-1">
              <Label>Max radius ({paper.unit})</Label>
              <ScrubbableNumberInput
                min={0.2}
                step={0.1}
                value={obstacles.maxRadius}
                onValueChange={(next) => onObstacleChange({ ...obstacles, maxRadius: next })}
              />
            </div>
            <div className="space-y-1">
              <Label>Margin ({paper.unit})</Label>
              <ScrubbableNumberInput
                min={0}
                step={0.1}
                value={obstacles.margin}
                onValueChange={(next) => onObstacleChange({ ...obstacles, margin: next })}
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
                value={renderSettings.strokeWidth}
                onValueChange={(next) =>
                  onRenderSettingsChange({
                    ...renderSettings,
                    strokeWidth: next
                  })
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Node radius</Label>
              <ScrubbableNumberInput
                min={0.5}
                step={0.5}
                value={renderSettings.nodeRadius}
                onValueChange={(next) =>
                  onRenderSettingsChange({
                    ...renderSettings,
                    nodeRadius: next
                  })
                }
              />
            </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Root color</Label>
              <Input
                type="color"
                value={renderSettings.rootColor}
                onChange={(event) =>
                  onRenderSettingsChange({ ...renderSettings, rootColor: event.target.value })
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Obstacle color</Label>
              <Input
                type="color"
                value={renderSettings.obstacleFill}
                onChange={(event) =>
                  onRenderSettingsChange({ ...renderSettings, obstacleFill: event.target.value })
                }
              />
            </div>
              </div>
              <div className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950/60 px-2 py-1.5">
                <div>
                  <Label className="text-[11px] text-zinc-200">Show obstacles</Label>
                  <div className="text-[10px] text-zinc-500">Hide polygons in view + exports.</div>
                </div>
                <Switch
                  checked={renderSettings.showObstacles}
                  onCheckedChange={(checked) =>
                    onRenderSettingsChange({ ...renderSettings, showObstacles: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950/60 px-2 py-1.5">
                <div>
                  <Label className="text-[11px] text-zinc-200">Show attractors</Label>
                  <div className="text-[10px] text-zinc-500">Reveal growth targets.</div>
                </div>
                <Switch
                  checked={renderSettings.showAttractors}
                  onCheckedChange={(checked) =>
                    onRenderSettingsChange({ ...renderSettings, showAttractors: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950/60 px-2 py-1.5">
                <div>
                  <Label className="text-[11px] text-zinc-200">Show nodes</Label>
                  <div className="text-[10px] text-zinc-500">Draw node points along roots.</div>
                </div>
                <Switch
                  checked={renderSettings.showNodes}
                  onCheckedChange={(checked) =>
                    onRenderSettingsChange({ ...renderSettings, showNodes: checked })
                  }
                />
              </div>
            </div>
          ) : null}
        </section>

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
                value={exportSettings.fps}
                onValueChange={(next) => onExportSettingsChange({ ...exportSettings, fps: next })}
              />
            </div>
            <div className="space-y-1">
              <Label>MP4 Duration (s)</Label>
              <ScrubbableNumberInput
                min={1}
                integer
                value={exportSettings.durationSeconds}
                onValueChange={(next) =>
                  onExportSettingsChange({
                    ...exportSettings,
                    durationSeconds: next
                  })
                }
                className={exportSettings.durationMode === 'auto' ? 'opacity-60' : undefined}
                disabled={exportSettings.durationMode === 'auto'}
              />
            </div>
            <div className="space-y-1">
              <Label>MP4 Steps/frame</Label>
              <ScrubbableNumberInput
                min={1}
                integer
                value={exportSettings.stepsPerFrame}
                onValueChange={(next) =>
                  onExportSettingsChange({
                    ...exportSettings,
                    stepsPerFrame: next
                  })
                }
              />
            </div>
              </div>
              <div className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950/60 px-2 py-1.5">
                <div>
                  <Label className="text-[11px] text-zinc-200">Auto duration</Label>
                  <div className="text-[10px] text-zinc-500">Stop when growth completes.</div>
                </div>
                <Switch
                  checked={exportSettings.durationMode === 'auto'}
                  onCheckedChange={(checked) =>
                    onExportSettingsChange({
                      ...exportSettings,
                      durationMode: checked ? 'auto' : 'fixed'
                    })
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
      </div>
    </div>
  )
}
