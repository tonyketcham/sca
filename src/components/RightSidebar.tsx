import { useId, useMemo, useCallback } from 'react';
import type { FrameConfig } from '../types/ui';
import type { SimulationParams } from '../engine/simulationState';
import { Button } from './ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { ScrubbableNumberField } from './ui/scrubbable-number-field';
import { ScrollArea } from './ui/scroll-area';
import { SidebarHeader, SidebarShell } from './ui/sidebar-shell';
import { SectionHeading } from './ui/section-heading';
import { InsetPanel } from './ui/inset-panel';
import { ColorSwatchField } from './ui/color-swatch-field';
import { SwitchControlRow } from './ui/switch-control-row';
import { LabeledField } from './ui/labeled-field';
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
      seedRotationStrength: getMixedValue(
        selectedFrames.map((f) => f.params.seedRotationStrength),
      ),
      attractorTangentStrength: getMixedValue(
        selectedFrames.map((f) => f.params.attractorTangentStrength),
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
              <ScrubbableNumberField
                id={fieldId('sim-influence-radius')}
                label="Influence"
                min={5}
                integer
                coarseness="coarse"
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
              <ScrubbableNumberField
                id={fieldId('sim-kill-radius')}
                label="Kill Radius"
                min={1}
                integer
                coarseness="fine"
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
              <ScrubbableNumberField
                id={fieldId('sim-step-size')}
                label="Step Size"
                min={0.5}
                step={0.5}
                coarseness="fine"
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
              <ScrubbableNumberField
                id={fieldId('sim-max-nodes')}
                label="Max Nodes"
                min={100}
                integer
                coarseness="coarse"
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
              <ScrubbableNumberField
                id={fieldId('sim-attractor-count')}
                label="Targets"
                min={50}
                integer
                coarseness="coarse"
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
              <ScrubbableNumberField
                id={fieldId('sim-steps-per-frame')}
                label="Speed"
                min={1}
                integer
                coarseness="coarse"
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
              <ScrubbableNumberField
                id={fieldId('sim-seed-rotation')}
                label="Seed Rotation"
                min={-2}
                max={2}
                step={0.05}
                coarseness="fine"
                value={mixedParams?.seedRotationStrength ?? null}
                placeholder={
                  mixedParams?.seedRotationStrength === null
                    ? 'Mixed'
                    : undefined
                }
                onValueChange={(next) =>
                  onUpdateSelectedFrames((f) => ({
                    ...f,
                    params: { ...f.params, seedRotationStrength: next },
                  }))
                }
              />
              <ScrubbableNumberField
                id={fieldId('sim-attractor-rotation')}
                label="Attractor Rotation"
                min={-2}
                max={2}
                step={0.05}
                coarseness="fine"
                value={mixedParams?.attractorTangentStrength ?? null}
                placeholder={
                  mixedParams?.attractorTangentStrength === null
                    ? 'Mixed'
                    : undefined
                }
                onValueChange={(next) =>
                  onUpdateSelectedFrames((f) => ({
                    ...f,
                    params: { ...f.params, attractorTangentStrength: next },
                  }))
                }
              />
            </div>

            <div className="space-y-2 pt-2">
              <SwitchControlRow
                id={fieldId('sim-avoid-obstacles')}
                label="Avoid obstacles"
                checked={mixedParams?.avoidObstacles ?? false}
                onCheckedChange={(checked) =>
                  onUpdateSelectedFrames((f) => ({
                    ...f,
                    params: { ...f.params, avoidObstacles: checked },
                  }))
                }
              />
            </div>

            <InsetPanel tone="subtle" className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <ScrubbableNumberField
                  id={fieldId('sim-seed-count')}
                  label="Seed Count"
                  min={1}
                  integer
                  coarseness="coarse"
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
                <ScrubbableNumberField
                  id={fieldId('sim-seed-spread')}
                  label="Spread %"
                  min={0}
                  max={100}
                  integer
                  coarseness="fine"
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
                <LabeledField
                  id={fieldId('sim-seed-placement')}
                  label="Placement"
                  className="col-span-2"
                >
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
                </LabeledField>
              </div>
              {mixedParams?.seedPlacement === 'edge' && (
                <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-1">
                  <LabeledField id={fieldId('sim-seed-edge')} label="Edge">
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
                  </LabeledField>
                  <ScrubbableNumberField
                    id={fieldId('sim-seed-angle')}
                    label="Angle °"
                    min={-180}
                    max={180}
                    integer
                    coarseness="fine"
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
              )}
            </InsetPanel>

            <InsetPanel tone="subtle" className="space-y-3">
              <SwitchControlRow
                id={fieldId('sim-randomize-seed')}
                label="Randomize Seed"
                checked={mixedSeed?.randomizeSeed ?? false}
                onCheckedChange={(checked) =>
                  onUpdateSelectedFrames((f) => ({
                    ...f,
                    randomizeSeed: checked,
                  }))
                }
                rowClassName="px-0 py-0 bg-transparent border-none hover:bg-transparent"
              />
              <div className="flex items-center gap-2">
                <ScrubbableNumberField
                  id={fieldId('sim-seed')}
                  label="Seed Value"
                  className="flex-1"
                  min={0}
                  integer
                  coarseness="coarse"
                  value={mixedSeed?.seed ?? null}
                  placeholder={mixedSeed?.seed === null ? 'Mixed' : undefined}
                  onValueChange={(next) =>
                    onUpdateSelectedFrames((f) => ({ ...f, seed: next }), {
                      rebuildSimulation: true,
                      seedOverride: next,
                    })
                  }
                  disabled={mixedSeed?.randomizeSeed === true}
                  inputClassName={
                    mixedSeed?.randomizeSeed === true ? 'opacity-50' : ''
                  }
                />
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
              <ScrubbableNumberField
                id={fieldId('obs-count')}
                label="Count"
                min={0}
                integer
                coarseness="coarse"
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
              <ScrubbableNumberField
                id={fieldId('obs-margin')}
                label={`Margin (${unit})`}
                min={0}
                step={0.1}
                coarseness="fine"
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
              <ScrubbableNumberField
                id={fieldId('obs-min-vertices')}
                label="Min Vertices"
                min={3}
                integer
                coarseness="coarse"
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
              <ScrubbableNumberField
                id={fieldId('obs-max-vertices')}
                label="Max Vertices"
                min={3}
                integer
                coarseness="coarse"
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
              <ScrubbableNumberField
                id={fieldId('obs-min-radius')}
                label={`Min Radius (${unit})`}
                min={0.1}
                step={0.1}
                coarseness="fine"
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
              <ScrubbableNumberField
                id={fieldId('obs-max-radius')}
                label={`Max Radius (${unit})`}
                min={0.2}
                step={0.1}
                coarseness="fine"
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

          <div className="space-y-4">
            <SectionHeading>Appearance</SectionHeading>

            <div className="grid grid-cols-2 gap-3">
              <ScrubbableNumberField
                id={fieldId('render-stroke-width')}
                label="Stroke Width"
                min={0.5}
                step={0.5}
                coarseness="fine"
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
              <ScrubbableNumberField
                id={fieldId('render-node-radius')}
                label="Node Radius"
                min={0.5}
                step={0.5}
                coarseness="fine"
                value={mixedRenderSettings?.nodeRadius ?? null}
                placeholder={
                  mixedRenderSettings?.nodeRadius === null ? 'Mixed' : undefined
                }
                onValueChange={(next) =>
                  onUpdateSelectedFrames((f) => ({
                    ...f,
                    renderSettings: { ...f.renderSettings, nodeRadius: next },
                  }))
                }
              />
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
              <SwitchControlRow
                id={fieldId('render-show-obstacles')}
                label="Show Obstacles"
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
              <SwitchControlRow
                id={fieldId('render-show-attractors')}
                label="Show Targets"
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
              <SwitchControlRow
                id={fieldId('render-show-nodes')}
                label="Show Nodes"
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
            </div>
          </div>

          <div className="space-y-4">
            <SectionHeading>Export Settings</SectionHeading>

            <div className="grid grid-cols-2 gap-3">
              <ScrubbableNumberField
                id={fieldId('export-fps')}
                label="FPS"
                min={1}
                integer
                coarseness="coarse"
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
              <ScrubbableNumberField
                id={fieldId('export-steps')}
                label="Steps/Frame"
                min={1}
                integer
                coarseness="coarse"
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
              <ScrubbableNumberField
                id={fieldId('export-duration')}
                label="Duration (s)"
                className="col-span-2"
                min={1}
                integer
                coarseness="coarse"
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
                inputClassName={
                  mixedExportSettings?.durationMode === 'auto'
                    ? 'opacity-50'
                    : ''
                }
              />
            </div>

            <SwitchControlRow
              id={fieldId('export-auto')}
              label="Auto duration"
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
          </div>
        </div>
      </ScrollArea>
    </SidebarShell>
  );
}
