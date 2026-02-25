import { useId, useMemo, useCallback } from 'react';
import type { FrameConfig } from '../types/ui';
import type { SimulationParams } from '../engine/simulationState';
import { Button } from './ui/button';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Switch } from './ui/switch';
import { ScrubbableNumberInput } from './ui/scrubbable-number-input';
import { ScrollArea } from './ui/scroll-area';
import { ControlRow } from './ui/control-row';
import { SidebarHeader, SidebarShell } from './ui/sidebar-shell';
import { SectionHeading } from './ui/section-heading';
import { InsetPanel } from './ui/inset-panel';
import { ColorSwatchField } from './ui/color-swatch-field';
import { Settings2, RefreshCw } from 'lucide-react';

type RightSidebarProps = {
  frames: FrameConfig[];
  selectedFrameIndices: number[];
  onUpdateSelectedFrames: (
    updater: (frame: FrameConfig) => FrameConfig,
    options?: { rebuildSimulation?: boolean; seedOverride?: number },
  ) => void;
  onRegenerateObstacles: () => void;
  unit: string;
};

export default function RightSidebar({
  frames,
  selectedFrameIndices,
  onUpdateSelectedFrames,
  onRegenerateObstacles,
  unit,
}: RightSidebarProps) {
  const controlsIdPrefix = useId();
  const fieldId = useCallback(
    (name: string): string => `${controlsIdPrefix}-${name}`,
    [controlsIdPrefix],
  );

  const selectedFrames = useMemo(
    () => selectedFrameIndices.map((index) => frames[index]).filter(Boolean),
    [frames, selectedFrameIndices],
  );

  const hasFrameSelection = selectedFrames.length > 0;

  const getMixedValue = <T,>(values: T[]): T | null => {
    if (values.length === 0) return null;
    const first = values[0];
    return values.every((value) => value === first) ? first : null;
  };

  const mixedParams = useMemo(() => {
    if (!hasFrameSelection) return null;
    return {
      influenceRadius: getMixedValue(
        selectedFrames.map((f) => f.params.influenceRadius),
      ),
      killRadius: getMixedValue(selectedFrames.map((f) => f.params.killRadius)),
      stepSize: getMixedValue(selectedFrames.map((f) => f.params.stepSize)),
      maxNodes: getMixedValue(selectedFrames.map((f) => f.params.maxNodes)),
      attractorCount: getMixedValue(
        selectedFrames.map((f) => f.params.attractorCount),
      ),
      stepsPerFrame: getMixedValue(
        selectedFrames.map((f) => f.params.stepsPerFrame),
      ),
      seedCount: getMixedValue(selectedFrames.map((f) => f.params.seedCount)),
      seedSpread: getMixedValue(selectedFrames.map((f) => f.params.seedSpread)),
      seedPlacement: getMixedValue(
        selectedFrames.map((f) => f.params.seedPlacement),
      ),
      seedEdge: getMixedValue(selectedFrames.map((f) => f.params.seedEdge)),
      seedAngle: getMixedValue(selectedFrames.map((f) => f.params.seedAngle)),
      avoidObstacles: getMixedValue(
        selectedFrames.map((f) => f.params.avoidObstacles),
      ),
    };
  }, [hasFrameSelection, selectedFrames]);

  const mixedObstacles = useMemo(() => {
    if (!hasFrameSelection) return null;
    return {
      count: getMixedValue(selectedFrames.map((f) => f.obstacles.count)),
      minVertices: getMixedValue(
        selectedFrames.map((f) => f.obstacles.minVertices),
      ),
      maxVertices: getMixedValue(
        selectedFrames.map((f) => f.obstacles.maxVertices),
      ),
      minRadius: getMixedValue(
        selectedFrames.map((f) => f.obstacles.minRadius),
      ),
      maxRadius: getMixedValue(
        selectedFrames.map((f) => f.obstacles.maxRadius),
      ),
      margin: getMixedValue(selectedFrames.map((f) => f.obstacles.margin)),
    };
  }, [hasFrameSelection, selectedFrames]);

  const mixedRenderSettings = useMemo(() => {
    if (!hasFrameSelection) return null;
    return {
      showAttractors: getMixedValue(
        selectedFrames.map((f) => f.renderSettings.showAttractors),
      ),
      showNodes: getMixedValue(
        selectedFrames.map((f) => f.renderSettings.showNodes),
      ),
      showObstacles: getMixedValue(
        selectedFrames.map((f) => f.renderSettings.showObstacles),
      ),
      strokeWidth: getMixedValue(
        selectedFrames.map((f) => f.renderSettings.strokeWidth),
      ),
      nodeRadius: getMixedValue(
        selectedFrames.map((f) => f.renderSettings.nodeRadius),
      ),
      rootColor: getMixedValue(
        selectedFrames.map((f) => f.renderSettings.rootColor),
      ),
      obstacleFill: getMixedValue(
        selectedFrames.map((f) => f.renderSettings.obstacleFill),
      ),
      attractorColor: getMixedValue(
        selectedFrames.map((f) => f.renderSettings.attractorColor),
      ),
    };
  }, [hasFrameSelection, selectedFrames]);

  const mixedExportSettings = useMemo(() => {
    if (!hasFrameSelection) return null;
    return {
      fps: getMixedValue(selectedFrames.map((f) => f.exportSettings.fps)),
      durationSeconds: getMixedValue(
        selectedFrames.map((f) => f.exportSettings.durationSeconds),
      ),
      stepsPerFrame: getMixedValue(
        selectedFrames.map((f) => f.exportSettings.stepsPerFrame),
      ),
      durationMode: getMixedValue(
        selectedFrames.map((f) => f.exportSettings.durationMode),
      ),
    };
  }, [hasFrameSelection, selectedFrames]);

  const mixedSeed = useMemo(() => {
    if (!hasFrameSelection) return null;
    return {
      seed: getMixedValue(selectedFrames.map((f) => f.seed)),
      randomizeSeed: getMixedValue(selectedFrames.map((f) => f.randomizeSeed)),
    };
  }, [hasFrameSelection, selectedFrames]);

  if (!hasFrameSelection) {
    return (
      <SidebarShell side="right">
        <SidebarHeader>Inspector</SidebarHeader>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-muted">
          <Settings2 className="h-8 w-8 opacity-20 mb-3" />
          <p className="text-[12px]">No frame selected</p>
          <p className="text-[11px] opacity-70 mt-1">
            Select a frame in the explorer to view its properties.
          </p>
        </div>
      </SidebarShell>
    );
  }

  return (
    <SidebarShell side="right">
      <SidebarHeader className="justify-between">
        <span>Inspector</span>
        <span className="text-[10px] font-mono text-muted bg-surface py-0.5 px-2 rounded-full border border-border">
          {selectedFrames.length} selected
        </span>
      </SidebarHeader>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          <div className="space-y-4">
            <SectionHeading>Simulation Parameters</SectionHeading>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor={fieldId('sim-influence-radius')}>
                  Influence
                </Label>
                <ScrubbableNumberInput
                  id={fieldId('sim-influence-radius')}
                  min={5}
                  integer
                  value={mixedParams?.influenceRadius ?? null}
                  placeholder={
                    mixedParams?.influenceRadius === null ? 'Mixed' : undefined
                  }
                  onValueChange={(next) =>
                    onUpdateSelectedFrames((f) => ({
                      ...f,
                      params: { ...f.params, influenceRadius: next },
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={fieldId('sim-kill-radius')}>Kill Radius</Label>
                <ScrubbableNumberInput
                  id={fieldId('sim-kill-radius')}
                  min={1}
                  integer
                  value={mixedParams?.killRadius ?? null}
                  placeholder={
                    mixedParams?.killRadius === null ? 'Mixed' : undefined
                  }
                  onValueChange={(next) =>
                    onUpdateSelectedFrames((f) => ({
                      ...f,
                      params: { ...f.params, killRadius: next },
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={fieldId('sim-step-size')}>Step Size</Label>
                <ScrubbableNumberInput
                  id={fieldId('sim-step-size')}
                  min={0.5}
                  step={0.5}
                  value={mixedParams?.stepSize ?? null}
                  placeholder={
                    mixedParams?.stepSize === null ? 'Mixed' : undefined
                  }
                  onValueChange={(next) =>
                    onUpdateSelectedFrames((f) => ({
                      ...f,
                      params: { ...f.params, stepSize: next },
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={fieldId('sim-max-nodes')}>Max Nodes</Label>
                <ScrubbableNumberInput
                  id={fieldId('sim-max-nodes')}
                  min={100}
                  integer
                  value={mixedParams?.maxNodes ?? null}
                  placeholder={
                    mixedParams?.maxNodes === null ? 'Mixed' : undefined
                  }
                  onValueChange={(next) =>
                    onUpdateSelectedFrames((f) => ({
                      ...f,
                      params: { ...f.params, maxNodes: next },
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={fieldId('sim-attractor-count')}>Targets</Label>
                <ScrubbableNumberInput
                  id={fieldId('sim-attractor-count')}
                  min={50}
                  integer
                  value={mixedParams?.attractorCount ?? null}
                  placeholder={
                    mixedParams?.attractorCount === null ? 'Mixed' : undefined
                  }
                  onValueChange={(next) =>
                    onUpdateSelectedFrames((f) => ({
                      ...f,
                      params: { ...f.params, attractorCount: next },
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={fieldId('sim-steps-per-frame')}>Speed</Label>
                <ScrubbableNumberInput
                  id={fieldId('sim-steps-per-frame')}
                  min={1}
                  integer
                  value={mixedParams?.stepsPerFrame ?? null}
                  placeholder={
                    mixedParams?.stepsPerFrame === null ? 'Mixed' : undefined
                  }
                  onValueChange={(next) =>
                    onUpdateSelectedFrames((f) => ({
                      ...f,
                      params: { ...f.params, stepsPerFrame: next },
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <ControlRow>
                <Label
                  htmlFor={fieldId('sim-avoid-obstacles')}
                  className="text-foreground"
                >
                  Avoid obstacles
                </Label>
                <Switch
                  id={fieldId('sim-avoid-obstacles')}
                  checked={mixedParams?.avoidObstacles ?? false}
                  onCheckedChange={(checked) =>
                    onUpdateSelectedFrames((f) => ({
                      ...f,
                      params: { ...f.params, avoidObstacles: checked },
                    }))
                  }
                />
              </ControlRow>
            </div>

            <InsetPanel tone="subtle" className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor={fieldId('sim-seed-count')}>Seed Count</Label>
                  <ScrubbableNumberInput
                    id={fieldId('sim-seed-count')}
                    min={1}
                    integer
                    value={mixedParams?.seedCount ?? null}
                    placeholder={
                      mixedParams?.seedCount === null ? 'Mixed' : undefined
                    }
                    onValueChange={(next) =>
                      onUpdateSelectedFrames((f) => ({
                        ...f,
                        params: { ...f.params, seedCount: next },
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={fieldId('sim-seed-spread')}>Spread %</Label>
                  <ScrubbableNumberInput
                    id={fieldId('sim-seed-spread')}
                    min={0}
                    max={100}
                    integer
                    value={mixedParams?.seedSpread ?? null}
                    placeholder={
                      mixedParams?.seedSpread === null ? 'Mixed' : undefined
                    }
                    onValueChange={(next) =>
                      onUpdateSelectedFrames((f) => ({
                        ...f,
                        params: { ...f.params, seedSpread: next },
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label htmlFor={fieldId('sim-seed-placement')}>
                    Placement
                  </Label>
                  <Select
                    value={mixedParams?.seedPlacement ?? undefined}
                    onValueChange={(value) =>
                      onUpdateSelectedFrames((f) => ({
                        ...f,
                        params: {
                          ...f.params,
                          seedPlacement:
                            value as SimulationParams['seedPlacement'],
                        },
                      }))
                    }
                  >
                    <SelectTrigger id={fieldId('sim-seed-placement')}>
                      <SelectValue
                        placeholder={
                          mixedParams?.seedPlacement ? undefined : 'Mixed'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="edge">Edge line</SelectItem>
                      <SelectItem value="scatter">Scatter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {mixedParams?.seedPlacement === 'edge' && (
                <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-1">
                  <div className="space-y-1.5">
                    <Label htmlFor={fieldId('sim-seed-edge')}>Edge</Label>
                    <Select
                      value={mixedParams?.seedEdge ?? undefined}
                      onValueChange={(value) =>
                        onUpdateSelectedFrames((f) => ({
                          ...f,
                          params: {
                            ...f.params,
                            seedEdge: value as SimulationParams['seedEdge'],
                          },
                        }))
                      }
                    >
                      <SelectTrigger id={fieldId('sim-seed-edge')}>
                        <SelectValue
                          placeholder={
                            mixedParams?.seedEdge ? undefined : 'Mixed'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="top">Top</SelectItem>
                        <SelectItem value="bottom">Bottom</SelectItem>
                        <SelectItem value="left">Left</SelectItem>
                        <SelectItem value="right">Right</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={fieldId('sim-seed-angle')}>Angle °</Label>
                    <ScrubbableNumberInput
                      id={fieldId('sim-seed-angle')}
                      min={-180}
                      max={180}
                      integer
                      value={mixedParams?.seedAngle ?? null}
                      placeholder={
                        mixedParams?.seedAngle === null ? 'Mixed' : undefined
                      }
                      onValueChange={(next) =>
                        onUpdateSelectedFrames((f) => ({
                          ...f,
                          params: { ...f.params, seedAngle: next },
                        }))
                      }
                    />
                  </div>
                </div>
              )}
            </InsetPanel>

            <InsetPanel tone="subtle" className="space-y-3">
              <ControlRow
                tone="default"
                className="px-0 py-0 bg-transparent border-none hover:bg-transparent"
              >
                <Label
                  htmlFor={fieldId('sim-randomize-seed')}
                  className="text-foreground"
                >
                  Randomize Seed
                </Label>
                <Switch
                  id={fieldId('sim-randomize-seed')}
                  checked={mixedSeed?.randomizeSeed ?? false}
                  onCheckedChange={(checked) =>
                    onUpdateSelectedFrames((f) => ({
                      ...f,
                      randomizeSeed: checked,
                    }))
                  }
                />
              </ControlRow>
              <div className="flex items-center gap-2">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor={fieldId('sim-seed')}>Seed Value</Label>
                  <ScrubbableNumberInput
                    id={fieldId('sim-seed')}
                    min={0}
                    integer
                    value={mixedSeed?.seed ?? null}
                    placeholder={mixedSeed?.seed === null ? 'Mixed' : undefined}
                    onValueChange={(next) =>
                      onUpdateSelectedFrames((f) => ({ ...f, seed: next }), {
                        rebuildSimulation: true,
                        seedOverride: next,
                      })
                    }
                    disabled={mixedSeed?.randomizeSeed === true}
                    className={
                      mixedSeed?.randomizeSeed === true ? 'opacity-50' : ''
                    }
                  />
                </div>
              </div>
            </InsetPanel>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <SectionHeading>Obstacles</SectionHeading>
              <Button
                variant="ghost"
                size="icon"
                onClick={onRegenerateObstacles}
                className="h-6 w-6"
                title="Regenerate Obstacles"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor={fieldId('obs-count')}>Count</Label>
                <ScrubbableNumberInput
                  id={fieldId('obs-count')}
                  min={0}
                  integer
                  value={mixedObstacles?.count ?? null}
                  placeholder={
                    mixedObstacles?.count === null ? 'Mixed' : undefined
                  }
                  onValueChange={(next) =>
                    onUpdateSelectedFrames(
                      (f) => ({
                        ...f,
                        obstacles: { ...f.obstacles, count: next },
                      }),
                      { rebuildSimulation: true },
                    )
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={fieldId('obs-margin')}>Margin ({unit})</Label>
                <ScrubbableNumberInput
                  id={fieldId('obs-margin')}
                  min={0}
                  step={0.1}
                  value={mixedObstacles?.margin ?? null}
                  placeholder={
                    mixedObstacles?.margin === null ? 'Mixed' : undefined
                  }
                  onValueChange={(next) =>
                    onUpdateSelectedFrames(
                      (f) => ({
                        ...f,
                        obstacles: { ...f.obstacles, margin: next },
                      }),
                      { rebuildSimulation: true },
                    )
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={fieldId('obs-min-vertices')}>
                  Min Vertices
                </Label>
                <ScrubbableNumberInput
                  id={fieldId('obs-min-vertices')}
                  min={3}
                  integer
                  value={mixedObstacles?.minVertices ?? null}
                  placeholder={
                    mixedObstacles?.minVertices === null ? 'Mixed' : undefined
                  }
                  onValueChange={(next) =>
                    onUpdateSelectedFrames(
                      (f) => ({
                        ...f,
                        obstacles: { ...f.obstacles, minVertices: next },
                      }),
                      { rebuildSimulation: true },
                    )
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={fieldId('obs-max-vertices')}>
                  Max Vertices
                </Label>
                <ScrubbableNumberInput
                  id={fieldId('obs-max-vertices')}
                  min={3}
                  integer
                  value={mixedObstacles?.maxVertices ?? null}
                  placeholder={
                    mixedObstacles?.maxVertices === null ? 'Mixed' : undefined
                  }
                  onValueChange={(next) =>
                    onUpdateSelectedFrames(
                      (f) => ({
                        ...f,
                        obstacles: { ...f.obstacles, maxVertices: next },
                      }),
                      { rebuildSimulation: true },
                    )
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={fieldId('obs-min-radius')}>
                  Min Radius ({unit})
                </Label>
                <ScrubbableNumberInput
                  id={fieldId('obs-min-radius')}
                  min={0.1}
                  step={0.1}
                  value={mixedObstacles?.minRadius ?? null}
                  placeholder={
                    mixedObstacles?.minRadius === null ? 'Mixed' : undefined
                  }
                  onValueChange={(next) =>
                    onUpdateSelectedFrames(
                      (f) => ({
                        ...f,
                        obstacles: { ...f.obstacles, minRadius: next },
                      }),
                      { rebuildSimulation: true },
                    )
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={fieldId('obs-max-radius')}>
                  Max Radius ({unit})
                </Label>
                <ScrubbableNumberInput
                  id={fieldId('obs-max-radius')}
                  min={0.2}
                  step={0.1}
                  value={mixedObstacles?.maxRadius ?? null}
                  placeholder={
                    mixedObstacles?.maxRadius === null ? 'Mixed' : undefined
                  }
                  onValueChange={(next) =>
                    onUpdateSelectedFrames(
                      (f) => ({
                        ...f,
                        obstacles: { ...f.obstacles, maxRadius: next },
                      }),
                      { rebuildSimulation: true },
                    )
                  }
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <SectionHeading>Appearance</SectionHeading>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor={fieldId('render-stroke-width')}>
                  Stroke Width
                </Label>
                <ScrubbableNumberInput
                  id={fieldId('render-stroke-width')}
                  min={0.5}
                  step={0.5}
                  value={mixedRenderSettings?.strokeWidth ?? null}
                  placeholder={
                    mixedRenderSettings?.strokeWidth === null
                      ? 'Mixed'
                      : undefined
                  }
                  onValueChange={(next) =>
                    onUpdateSelectedFrames((f) => ({
                      ...f,
                      renderSettings: {
                        ...f.renderSettings,
                        strokeWidth: next,
                      },
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={fieldId('render-node-radius')}>
                  Node Radius
                </Label>
                <ScrubbableNumberInput
                  id={fieldId('render-node-radius')}
                  min={0.5}
                  step={0.5}
                  value={mixedRenderSettings?.nodeRadius ?? null}
                  placeholder={
                    mixedRenderSettings?.nodeRadius === null
                      ? 'Mixed'
                      : undefined
                  }
                  onValueChange={(next) =>
                    onUpdateSelectedFrames((f) => ({
                      ...f,
                      renderSettings: { ...f.renderSettings, nodeRadius: next },
                    }))
                  }
                />
              </div>
              <ColorSwatchField
                id={fieldId('render-root-color')}
                label="Root Color"
                value={mixedRenderSettings?.rootColor ?? '#000000'}
                onValueChange={(value) =>
                  onUpdateSelectedFrames((f) => ({
                    ...f,
                    renderSettings: { ...f.renderSettings, rootColor: value },
                  }))
                }
              />
              <ColorSwatchField
                id={fieldId('render-obstacle-color')}
                label="Obstacle Color"
                value={mixedRenderSettings?.obstacleFill ?? '#000000'}
                onValueChange={(value) =>
                  onUpdateSelectedFrames((f) => ({
                    ...f,
                    renderSettings: {
                      ...f.renderSettings,
                      obstacleFill: value,
                    },
                  }))
                }
              />
              <ColorSwatchField
                id={fieldId('render-attractor-color')}
                label="Target Color"
                value={mixedRenderSettings?.attractorColor ?? '#000000'}
                onValueChange={(value) =>
                  onUpdateSelectedFrames((f) => ({
                    ...f,
                    renderSettings: {
                      ...f.renderSettings,
                      attractorColor: value,
                    },
                  }))
                }
              />
            </div>

            <div className="space-y-2 pt-2">
              <ControlRow>
                <Label
                  htmlFor={fieldId('render-show-obstacles')}
                  className="text-foreground"
                >
                  Show Obstacles
                </Label>
                <Switch
                  id={fieldId('render-show-obstacles')}
                  checked={mixedRenderSettings?.showObstacles ?? false}
                  onCheckedChange={(checked) =>
                    onUpdateSelectedFrames((f) => ({
                      ...f,
                      renderSettings: {
                        ...f.renderSettings,
                        showObstacles: checked,
                      },
                    }))
                  }
                />
              </ControlRow>
              <ControlRow>
                <Label
                  htmlFor={fieldId('render-show-attractors')}
                  className="text-foreground"
                >
                  Show Targets
                </Label>
                <Switch
                  id={fieldId('render-show-attractors')}
                  checked={mixedRenderSettings?.showAttractors ?? false}
                  onCheckedChange={(checked) =>
                    onUpdateSelectedFrames((f) => ({
                      ...f,
                      renderSettings: {
                        ...f.renderSettings,
                        showAttractors: checked,
                      },
                    }))
                  }
                />
              </ControlRow>
              <ControlRow>
                <Label
                  htmlFor={fieldId('render-show-nodes')}
                  className="text-foreground"
                >
                  Show Nodes
                </Label>
                <Switch
                  id={fieldId('render-show-nodes')}
                  checked={mixedRenderSettings?.showNodes ?? false}
                  onCheckedChange={(checked) =>
                    onUpdateSelectedFrames((f) => ({
                      ...f,
                      renderSettings: {
                        ...f.renderSettings,
                        showNodes: checked,
                      },
                    }))
                  }
                />
              </ControlRow>
            </div>
          </div>

          <div className="space-y-4">
            <SectionHeading>Export Settings</SectionHeading>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor={fieldId('export-fps')}>FPS</Label>
                <ScrubbableNumberInput
                  id={fieldId('export-fps')}
                  min={1}
                  integer
                  value={mixedExportSettings?.fps ?? null}
                  placeholder={
                    mixedExportSettings?.fps === null ? 'Mixed' : undefined
                  }
                  onValueChange={(next) =>
                    onUpdateSelectedFrames((f) => ({
                      ...f,
                      exportSettings: { ...f.exportSettings, fps: next },
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={fieldId('export-steps')}>Steps/Frame</Label>
                <ScrubbableNumberInput
                  id={fieldId('export-steps')}
                  min={1}
                  integer
                  value={mixedExportSettings?.stepsPerFrame ?? null}
                  placeholder={
                    mixedExportSettings?.stepsPerFrame === null
                      ? 'Mixed'
                      : undefined
                  }
                  onValueChange={(next) =>
                    onUpdateSelectedFrames((f) => ({
                      ...f,
                      exportSettings: {
                        ...f.exportSettings,
                        stepsPerFrame: next,
                      },
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor={fieldId('export-duration')}>Duration (s)</Label>
                <ScrubbableNumberInput
                  id={fieldId('export-duration')}
                  min={1}
                  integer
                  value={mixedExportSettings?.durationSeconds ?? null}
                  placeholder={
                    mixedExportSettings?.durationSeconds === null
                      ? 'Mixed'
                      : undefined
                  }
                  onValueChange={(next) =>
                    onUpdateSelectedFrames((f) => ({
                      ...f,
                      exportSettings: {
                        ...f.exportSettings,
                        durationSeconds: next,
                      },
                    }))
                  }
                  disabled={mixedExportSettings?.durationMode === 'auto'}
                  className={
                    mixedExportSettings?.durationMode === 'auto'
                      ? 'opacity-50'
                      : ''
                  }
                />
              </div>
            </div>

            <ControlRow>
              <Label
                htmlFor={fieldId('export-auto')}
                className="text-foreground"
              >
                Auto duration
              </Label>
              <Switch
                id={fieldId('export-auto')}
                checked={mixedExportSettings?.durationMode === 'auto'}
                onCheckedChange={(checked) =>
                  onUpdateSelectedFrames((f) => ({
                    ...f,
                    exportSettings: {
                      ...f.exportSettings,
                      durationMode: checked ? 'auto' : 'fixed',
                    },
                  }))
                }
              />
            </ControlRow>
          </div>
        </div>
      </ScrollArea>
    </SidebarShell>
  );
}
