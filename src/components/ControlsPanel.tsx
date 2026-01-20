import type { SimulationParams } from '../engine/simulationState'
import type { Unit } from '../geometry/units'
import type { RenderSettings } from '../render/canvasRenderer'
import type { ObstacleSettings, PaperSettings, ExportSettings, StatsSummary } from '../types/ui'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Switch } from './ui/switch'
import { ScrubbableNumberInput } from './ui/scrubbable-number-input'

type ControlsPanelProps = {
  paper: PaperSettings
  params: SimulationParams
  obstacles: ObstacleSettings
  renderSettings: RenderSettings
  exportSettings: ExportSettings
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
}

export default function ControlsPanel({
  paper,
  params,
  obstacles,
  renderSettings,
  exportSettings,
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
  onExportMp4
}: ControlsPanelProps) {
  return (
    <div className="space-y-6 p-6">
      <header className="space-y-2">
        <h1 className="text-lg font-semibold text-white">Root Growth Studio</h1>
        <p className="text-xs text-zinc-400">
          Space colonization growth with real-time parameter control.
        </p>
      </header>

      <section className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
        <h2 className="text-sm font-semibold text-zinc-100">Simulation</h2>
        <div className="grid grid-cols-2 gap-3">
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
        </div>
        <div className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950/60 px-3 py-2">
          <div>
            <Label className="text-sm text-zinc-200">Avoid obstacles</Label>
            <div className="text-xs text-zinc-500">Block growth inside polygons.</div>
          </div>
          <Switch
            checked={params.avoidObstacles}
            onCheckedChange={(checked) => onParamsChange({ ...params, avoidObstacles: checked })}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onToggleRunning} variant="default" size="sm">
            {running ? 'Pause' : 'Run'}
          </Button>
          <Button onClick={onResetSimulation} variant="secondary" size="sm">
            Reset growth
          </Button>
        </div>
        <div className="grid gap-1 text-xs text-zinc-400">
          <div>Nodes: {stats.nodes}</div>
          <div>Attractors: {stats.attractors}</div>
          <div>Iterations: {stats.iterations}</div>
          <div>Status: {stats.completed ? 'Complete' : 'Growing'}</div>
        </div>
      </section>

      <section className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
        <h2 className="text-sm font-semibold text-zinc-100">Paper</h2>
        <div className="grid grid-cols-2 gap-3">
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
        <p className="text-xs text-zinc-500">Changing paper size resets the simulation and obstacles.</p>
      </section>

      <section className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
        <h2 className="text-sm font-semibold text-zinc-100">Obstacles</h2>
        <div className="grid grid-cols-2 gap-3">
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
        <Button onClick={onRegenerateObstacles} variant="secondary" size="sm">
          Regenerate obstacles
        </Button>
      </section>

      <section className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
        <h2 className="text-sm font-semibold text-zinc-100">Rendering</h2>
        <div className="grid grid-cols-2 gap-3">
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
        <div className="grid grid-cols-2 gap-3">
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
        <div className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950/60 px-3 py-2">
          <div>
            <Label className="text-sm text-zinc-200">Show obstacles</Label>
            <div className="text-xs text-zinc-500">Hide polygons in view + exports.</div>
          </div>
          <Switch
            checked={renderSettings.showObstacles}
            onCheckedChange={(checked) =>
              onRenderSettingsChange({ ...renderSettings, showObstacles: checked })
            }
          />
        </div>
        <div className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950/60 px-3 py-2">
          <div>
            <Label className="text-sm text-zinc-200">Show attractors</Label>
            <div className="text-xs text-zinc-500">Reveal growth targets.</div>
          </div>
          <Switch
            checked={renderSettings.showAttractors}
            onCheckedChange={(checked) =>
              onRenderSettingsChange({ ...renderSettings, showAttractors: checked })
            }
          />
        </div>
        <div className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950/60 px-3 py-2">
          <div>
            <Label className="text-sm text-zinc-200">Show nodes</Label>
            <div className="text-xs text-zinc-500">Draw node points along roots.</div>
          </div>
          <Switch
            checked={renderSettings.showNodes}
            onCheckedChange={(checked) =>
              onRenderSettingsChange({ ...renderSettings, showNodes: checked })
            }
          />
        </div>
      </section>

      <section className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
        <h2 className="text-sm font-semibold text-zinc-100">Export</h2>
        <div className="grid grid-cols-2 gap-3">
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
        <div className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-950/60 px-3 py-2">
          <div>
            <Label className="text-sm text-zinc-200">Auto duration</Label>
            <div className="text-xs text-zinc-500">Stop when growth completes.</div>
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
          <Button onClick={onExportPng} variant="secondary" size="sm">
            Export PNG
          </Button>
          <Button onClick={onExportSvg} variant="secondary" size="sm">
            Export SVG
          </Button>
          <Button onClick={onExportMp4} variant="default" size="sm">
            Export MP4
          </Button>
        </div>
      </section>
    </div>
  )
}
