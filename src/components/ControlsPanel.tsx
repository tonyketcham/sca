import type { SimulationParams } from '../engine/simulationState';
import type { Unit } from '../geometry/units';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type {
  PaperSettings,
  StatsSummary,
  SavedEntry,
  TemplateGridSettings,
  FrameConfig,
} from '../types/ui';
import { Button } from './ui/button';
import { Input } from './ui/input';
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
import { useUiContextState } from '../hooks/useUiContext';
import { ScrollArea } from './ui/scroll-area';
import { controlRowVariants } from './ui/control-row';
import LayersPanel from './LayersPanel';

type ControlsPanelProps = {
  paper: PaperSettings;
  templateGrid: TemplateGridSettings;
  frames: FrameConfig[];
  selectedFrameIndices: number[];
  savedEntries: SavedEntry[];
  stats: StatsSummary;
  running: boolean;
  onPaperChange: (next: PaperSettings) => void;
  onTemplateGridChange: (next: TemplateGridSettings) => void;
  onSelectProject: () => void;
  onSelectFrame: (index: number) => void;
  onToggleFrame: (index: number) => void;
  onSelectFrameRange: (startIndex: number, endIndex: number) => void;
  onReorderFrames: (startIndex: number, endIndex: number) => void;
  onRenameFrame: (index: number, name: string) => void;
  onUpdateSelectedFrames: (
    updater: (frame: FrameConfig) => FrameConfig,
    options?: { rebuildSimulation?: boolean; seedOverride?: number },
  ) => void;
  onToggleRunning: () => void;
  onResetSimulation: () => void;
  onRegenerateObstacles: () => void;
  onExportPng: () => void;
  onExportSvg: () => void;
  onExportMp4: () => void;
  exportError: string | null;
  isExportingMp4: boolean;
  onDismissExportError: () => void;
  onSaveEntry: (name?: string) => void;
  onLoadEntry: (id: string) => void;
  onDeleteEntry: (id: string) => void;
  onPreviewEntry: (id: string) => void;
  onPreviewEnd: () => void;
};

type SectionKey =
  | 'simulation'
  | 'template'
  | 'paper'
  | 'obstacles'
  | 'rendering'
  | 'export'
  | 'saved';

const MAX_SAVE_NAME_LENGTH = 120;
const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

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
  onSelectFrameRange,
  onReorderFrames,
  onRenameFrame,
  onUpdateSelectedFrames,
  onToggleRunning,
  onResetSimulation,
  onRegenerateObstacles,
  onExportPng,
  onExportSvg,
  onExportMp4,
  exportError,
  isExportingMp4,
  onDismissExportError,
  onSaveEntry,
  onLoadEntry,
  onDeleteEntry,
  onPreviewEntry,
  onPreviewEnd,
}: ControlsPanelProps) {
  const [saveName, setSaveName] = useState('');
  const [isSavedRunsModalOpen, setIsSavedRunsModalOpen] = useState(false);
  const [previewedEntryId, setPreviewedEntryId] = useState<string | null>(null);
  const savedRunsTitleId = useId();
  const savedRunsDescriptionId = useId();
  const saveNameInputId = useId();
  const modalRef = useRef<HTMLDivElement | null>(null);
  const defaultSections: Record<SectionKey, boolean> = {
    simulation: true,
    template: false,
    paper: true,
    obstacles: false,
    rendering: false,
    export: false,
    saved: false,
  };
  const [openSections, setOpenSections] = useUiContextState<
    Record<SectionKey, boolean>
  >('controlsPanel.sections.v2', defaultSections, {
    merge: (stored) => ({ ...defaultSections, ...(stored ?? {}) }),
  });

  const selectedFrames = useMemo(
    () => selectedFrameIndices.map((index) => frames[index]).filter(Boolean),
    [frames, selectedFrameIndices],
  );
  const formattedSavedEntryCount = useMemo(
    () => new Intl.NumberFormat().format(savedEntries.length),
    [savedEntries.length],
  );
  const hasFrameSelection = selectedFrames.length > 0;
  const showProjectControls = !hasFrameSelection;
  const inspectorTitle = showProjectControls
    ? 'Project Inspector'
    : 'Layer Inspector';
  const inspectorDescription = showProjectControls
    ? 'Paper is prioritized. Layout, export, and archive tools are secondary.'
    : 'Tune simulation live on canvas. Advanced controls stay collapsed.';
  const controlsIdPrefix = useId();
  const fieldId = useCallback(
    (name: string): string => `${controlsIdPrefix}-${name}`,
    [controlsIdPrefix],
  );

  const getMixedValue = <T,>(values: T[]): T | null => {
    if (values.length === 0) return null;
    const first = values[0];
    return values.every((value) => value === first) ? first : null;
  };

  const mixedParams = useMemo(() => {
    if (!hasFrameSelection) return null;
    return {
      influenceRadius: getMixedValue(
        selectedFrames.map((frame) => frame.params.influenceRadius),
      ),
      killRadius: getMixedValue(
        selectedFrames.map((frame) => frame.params.killRadius),
      ),
      stepSize: getMixedValue(
        selectedFrames.map((frame) => frame.params.stepSize),
      ),
      maxNodes: getMixedValue(
        selectedFrames.map((frame) => frame.params.maxNodes),
      ),
      attractorCount: getMixedValue(
        selectedFrames.map((frame) => frame.params.attractorCount),
      ),
      stepsPerFrame: getMixedValue(
        selectedFrames.map((frame) => frame.params.stepsPerFrame),
      ),
      seedCount: getMixedValue(
        selectedFrames.map((frame) => frame.params.seedCount),
      ),
      seedSpread: getMixedValue(
        selectedFrames.map((frame) => frame.params.seedSpread),
      ),
      seedPlacement: getMixedValue(
        selectedFrames.map((frame) => frame.params.seedPlacement),
      ),
      seedEdge: getMixedValue(
        selectedFrames.map((frame) => frame.params.seedEdge),
      ),
      seedAngle: getMixedValue(
        selectedFrames.map((frame) => frame.params.seedAngle),
      ),
      avoidObstacles: getMixedValue(
        selectedFrames.map((frame) => frame.params.avoidObstacles),
      ),
    };
  }, [hasFrameSelection, selectedFrames]);

  const mixedObstacles = useMemo(() => {
    if (!hasFrameSelection) return null;
    return {
      count: getMixedValue(
        selectedFrames.map((frame) => frame.obstacles.count),
      ),
      minVertices: getMixedValue(
        selectedFrames.map((frame) => frame.obstacles.minVertices),
      ),
      maxVertices: getMixedValue(
        selectedFrames.map((frame) => frame.obstacles.maxVertices),
      ),
      minRadius: getMixedValue(
        selectedFrames.map((frame) => frame.obstacles.minRadius),
      ),
      maxRadius: getMixedValue(
        selectedFrames.map((frame) => frame.obstacles.maxRadius),
      ),
      margin: getMixedValue(
        selectedFrames.map((frame) => frame.obstacles.margin),
      ),
    };
  }, [hasFrameSelection, selectedFrames]);

  const mixedRenderSettings = useMemo(() => {
    if (!hasFrameSelection) return null;
    return {
      showAttractors: getMixedValue(
        selectedFrames.map((frame) => frame.renderSettings.showAttractors),
      ),
      showNodes: getMixedValue(
        selectedFrames.map((frame) => frame.renderSettings.showNodes),
      ),
      showObstacles: getMixedValue(
        selectedFrames.map((frame) => frame.renderSettings.showObstacles),
      ),
      strokeWidth: getMixedValue(
        selectedFrames.map((frame) => frame.renderSettings.strokeWidth),
      ),
      nodeRadius: getMixedValue(
        selectedFrames.map((frame) => frame.renderSettings.nodeRadius),
      ),
      rootColor: getMixedValue(
        selectedFrames.map((frame) => frame.renderSettings.rootColor),
      ),
      obstacleFill: getMixedValue(
        selectedFrames.map((frame) => frame.renderSettings.obstacleFill),
      ),
      attractorColor: getMixedValue(
        selectedFrames.map((frame) => frame.renderSettings.attractorColor),
      ),
    };
  }, [hasFrameSelection, selectedFrames]);

  const mixedExportSettings = useMemo(() => {
    if (!hasFrameSelection) return null;
    return {
      fps: getMixedValue(
        selectedFrames.map((frame) => frame.exportSettings.fps),
      ),
      durationSeconds: getMixedValue(
        selectedFrames.map((frame) => frame.exportSettings.durationSeconds),
      ),
      stepsPerFrame: getMixedValue(
        selectedFrames.map((frame) => frame.exportSettings.stepsPerFrame),
      ),
      durationMode: getMixedValue(
        selectedFrames.map((frame) => frame.exportSettings.durationMode),
      ),
    };
  }, [hasFrameSelection, selectedFrames]);

  const mixedSeed = useMemo(() => {
    if (!hasFrameSelection) return null;
    return {
      seed: getMixedValue(selectedFrames.map((frame) => frame.seed)),
      randomizeSeed: getMixedValue(
        selectedFrames.map((frame) => frame.randomizeSeed),
      ),
    };
  }, [hasFrameSelection, selectedFrames]);

  const toggleSection = (key: SectionKey) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const normalizeSaveName = useCallback((raw: string): string | undefined => {
    const next = raw.replace(/\s+/g, ' ').trim();
    if (next.length === 0) return undefined;
    return next.slice(0, MAX_SAVE_NAME_LENGTH);
  }, []);

  const startPreview = useCallback(
    (entryId: string) => {
      setPreviewedEntryId(entryId);
      onPreviewEntry(entryId);
    },
    [onPreviewEntry],
  );

  const stopPreview = useCallback(() => {
    setPreviewedEntryId(null);
    onPreviewEnd();
  }, [onPreviewEnd]);

  const closeSavedRunsModal = useCallback(() => {
    setIsSavedRunsModalOpen(false);
    stopPreview();
  }, [stopPreview]);

  const handleSaveCurrent = useCallback(() => {
    onSaveEntry(normalizeSaveName(saveName));
    setSaveName('');
  }, [normalizeSaveName, onSaveEntry, saveName]);

  const handleDeleteEntry = useCallback(
    (entry: SavedEntry) => {
      const confirmed = window.confirm(`Delete saved run "${entry.name}"?`);
      if (!confirmed) return;
      if (previewedEntryId === entry.id) {
        stopPreview();
      }
      onDeleteEntry(entry.id);
    },
    [onDeleteEntry, previewedEntryId, stopPreview],
  );

  useEffect(() => {
    if (!isSavedRunsModalOpen) return;
    const previousFocusedElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = modalRef.current;
    const initialFocusTarget =
      dialog?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR) ?? dialog;
    initialFocusTarget?.focus();

    const handleModalKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeSavedRunsModal();
        return;
      }
      if (event.key !== 'Tab') return;
      const activeDialog = modalRef.current;
      if (!activeDialog) return;
      const focusableElements = Array.from(
        activeDialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      if (focusableElements.length === 0) {
        event.preventDefault();
        activeDialog.focus();
        return;
      }
      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      const active = document.activeElement;
      if (event.shiftKey) {
        if (active === first || active === activeDialog) {
          event.preventDefault();
          last.focus();
        }
        return;
      }
      if (active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleModalKeyDown);
    return () => {
      document.removeEventListener('keydown', handleModalKeyDown);
      previousFocusedElement?.focus();
    };
  }, [closeSavedRunsModal, isSavedRunsModalOpen]);

  const renderSectionHeader = (
    title: string,
    key: SectionKey,
    description?: string,
  ) => {
    const isOpen = openSections[key] ?? defaultSections[key];
    const sectionId = `section-${key}`;
    return (
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={sectionId}
        onClick={() => toggleSection(key)}
        className="group flex w-full items-center justify-between gap-2 rounded-sm border border-transparent px-2 py-2 text-left transition-colors duration-150 ease-out hover:border-slate-500/20 hover:bg-slate-900/45 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-300/60 motion-reduce:transition-none"
      >
        <div className="space-y-0.5">
          <h2 className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-300">
            {title}
          </h2>
          {description ? (
            <div className="text-[11px] text-slate-400">{description}</div>
          ) : null}
        </div>
        <span className="flex h-6 w-6 items-center justify-center rounded-sm border border-slate-500/25 bg-slate-900/70 text-[10px] text-slate-400 transition-colors duration-150 ease-out group-hover:border-slate-400/40 group-hover:text-slate-200 motion-reduce:transition-none">
          <span
            className={`transition-transform duration-200 ease-out motion-reduce:transition-none motion-reduce:transform-none ${
              isOpen ? 'rotate-90' : ''
            }`}
          >
            {'>'}
          </span>
        </span>
      </button>
    );
  };

  return (
    <div className="relative flex h-full flex-col bg-transparent text-sm text-slate-200">
      <LayersPanel
        frames={frames}
        templateGrid={templateGrid}
        selectedFrameIndices={selectedFrameIndices}
        onSelectProject={onSelectProject}
        onSelectFrame={onSelectFrame}
        onToggleFrame={onToggleFrame}
        onSelectFrameRange={onSelectFrameRange}
        onReorderFrames={onReorderFrames}
        onRenameFrame={onRenameFrame}
      />
      <ScrollArea className="flex-1">
        <div className="space-y-4 p-4">
          <header className="space-y-1 rounded-sm border border-slate-500/25 bg-slate-950/55 px-3 py-2.5">
            <div className="space-y-1">
              <h1 className="text-sm font-semibold tracking-[0.02em] text-slate-100">
                {inspectorTitle}
              </h1>
              <p className="text-[11px] text-slate-400">{inspectorDescription}</p>
            </div>
          </header>
          <div className="-mx-4 flex flex-col divide-y divide-slate-500/20 border-y border-slate-500/20">
            {hasFrameSelection ? (
              <section className="order-10 space-y-3 px-4 py-3">
                {renderSectionHeader('Simulation', 'simulation', 'Primary controls')}
                {openSections.simulation ? (
                  <div id="section-simulation" className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2 rounded-sm border border-blue-300/30 bg-blue-300/8 px-2 py-2">
                      <Button
                        onClick={onToggleRunning}
                        variant="default"
                        size="compact"
                      >
                        {running ? 'Pause' : 'Run'}
                      </Button>
                      <Button
                        onClick={onResetSimulation}
                        variant="secondary"
                        size="compact"
                      >
                        Reset
                      </Button>
                      <div className="ml-auto grid min-w-[180px] grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] uppercase tracking-[0.08em] text-slate-300">
                        <span>Nodes {stats.nodes}</span>
                        <span>Attractors {stats.attractors}</span>
                        <span>Iterations {stats.iterations}</span>
                        <span>{stats.completed ? 'Complete' : 'Growing'}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-2 min-[340px]:grid-cols-2">
                      <div className="space-y-1">
                        <Label htmlFor={fieldId('sim-influence-radius')}>
                          Influence radius
                        </Label>
                        <ScrubbableNumberInput
                          id={fieldId('sim-influence-radius')}
                          min={5}
                          integer
                          value={mixedParams?.influenceRadius ?? null}
                          placeholder={
                            mixedParams?.influenceRadius === null
                              ? 'Mixed'
                              : undefined
                          }
                          onValueChange={(next) =>
                            onUpdateSelectedFrames((frame) => ({
                              ...frame,
                              params: {
                                ...frame.params,
                                influenceRadius: next,
                              },
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={fieldId('sim-kill-radius')}>Kill radius</Label>
                        <ScrubbableNumberInput
                          id={fieldId('sim-kill-radius')}
                          min={1}
                          integer
                          value={mixedParams?.killRadius ?? null}
                          placeholder={
                            mixedParams?.killRadius === null
                              ? 'Mixed'
                              : undefined
                          }
                          onValueChange={(next) =>
                            onUpdateSelectedFrames((frame) => ({
                              ...frame,
                              params: { ...frame.params, killRadius: next },
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={fieldId('sim-step-size')}>Step size</Label>
                        <ScrubbableNumberInput
                          id={fieldId('sim-step-size')}
                          min={0.5}
                          step={0.5}
                          value={mixedParams?.stepSize ?? null}
                          placeholder={
                            mixedParams?.stepSize === null ? 'Mixed' : undefined
                          }
                          onValueChange={(next) =>
                            onUpdateSelectedFrames((frame) => ({
                              ...frame,
                              params: { ...frame.params, stepSize: next },
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={fieldId('sim-max-nodes')}>Max nodes</Label>
                        <ScrubbableNumberInput
                          id={fieldId('sim-max-nodes')}
                          min={100}
                          integer
                          value={mixedParams?.maxNodes ?? null}
                          placeholder={
                            mixedParams?.maxNodes === null ? 'Mixed' : undefined
                          }
                          onValueChange={(next) =>
                            onUpdateSelectedFrames((frame) => ({
                              ...frame,
                              params: { ...frame.params, maxNodes: next },
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={fieldId('sim-attractor-count')}>
                          Attractor count
                        </Label>
                        <ScrubbableNumberInput
                          id={fieldId('sim-attractor-count')}
                          min={50}
                          integer
                          value={mixedParams?.attractorCount ?? null}
                          placeholder={
                            mixedParams?.attractorCount === null
                              ? 'Mixed'
                              : undefined
                          }
                          onValueChange={(next) =>
                            onUpdateSelectedFrames((frame) => ({
                              ...frame,
                              params: { ...frame.params, attractorCount: next },
                            }))
                          }
                        />
                      </div>
                    </div>
                    <div className={controlRowVariants()}>
                      <div>
                        <Label
                          htmlFor={fieldId('sim-avoid-obstacles')}
                          className="text-xs text-slate-100"
                        >
                          Avoid obstacles
                        </Label>
                        <div className="text-xs text-slate-400">
                          {mixedParams?.avoidObstacles === null
                            ? 'Mixed'
                            : 'Block growth inside polygons.'}
                        </div>
                      </div>
                      <Switch
                        id={fieldId('sim-avoid-obstacles')}
                        checked={mixedParams?.avoidObstacles ?? false}
                        onCheckedChange={(checked) =>
                          onUpdateSelectedFrames((frame) => ({
                            ...frame,
                            params: {
                              ...frame.params,
                              avoidObstacles: checked,
                            },
                          }))
                        }
                      />
                    </div>
                    <details className="group rounded-sm border border-slate-500/25 bg-slate-900/35 px-2 py-1.5">
                      <summary className="cursor-pointer list-none text-[11px] font-medium text-slate-300">
                        Distribution + stepping
                      </summary>
                      <div className="mt-2 grid grid-cols-1 gap-2 min-[340px]:grid-cols-2">
                        <div className="space-y-1">
                          <Label htmlFor={fieldId('sim-steps-per-frame')}>
                            Steps per frame
                          </Label>
                          <ScrubbableNumberInput
                            id={fieldId('sim-steps-per-frame')}
                            min={1}
                            integer
                            value={mixedParams?.stepsPerFrame ?? null}
                            placeholder={
                              mixedParams?.stepsPerFrame === null
                                ? 'Mixed'
                                : undefined
                            }
                            onValueChange={(next) =>
                              onUpdateSelectedFrames((frame) => ({
                                ...frame,
                                params: { ...frame.params, stepsPerFrame: next },
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={fieldId('sim-seed-count')}>
                            Seed count
                          </Label>
                          <ScrubbableNumberInput
                            id={fieldId('sim-seed-count')}
                            min={1}
                            integer
                            value={mixedParams?.seedCount ?? null}
                            placeholder={
                              mixedParams?.seedCount === null
                                ? 'Mixed'
                                : undefined
                            }
                            onValueChange={(next) =>
                              onUpdateSelectedFrames((frame) => ({
                                ...frame,
                                params: { ...frame.params, seedCount: next },
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={fieldId('sim-seed-spread')}>
                            Seed spread (%)
                          </Label>
                          <ScrubbableNumberInput
                            id={fieldId('sim-seed-spread')}
                            min={0}
                            max={100}
                            integer
                            value={mixedParams?.seedSpread ?? null}
                            placeholder={
                              mixedParams?.seedSpread === null
                                ? 'Mixed'
                                : undefined
                            }
                            onValueChange={(next) =>
                              onUpdateSelectedFrames((frame) => ({
                                ...frame,
                                params: { ...frame.params, seedSpread: next },
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={fieldId('sim-seed-placement')}>
                            Seed placement
                          </Label>
                          <Select
                            value={mixedParams?.seedPlacement ?? undefined}
                            onValueChange={(value) =>
                              onUpdateSelectedFrames((frame) => ({
                                ...frame,
                                params: {
                                  ...frame.params,
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
                        {mixedParams?.seedPlacement === 'edge' ? (
                          <>
                            <div className="space-y-1">
                              <Label htmlFor={fieldId('sim-seed-edge')}>
                                Seed edge
                              </Label>
                              <Select
                                value={mixedParams?.seedEdge ?? undefined}
                                onValueChange={(value) =>
                                  onUpdateSelectedFrames((frame) => ({
                                    ...frame,
                                    params: {
                                      ...frame.params,
                                      seedEdge:
                                        value as SimulationParams['seedEdge'],
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
                            <div className="space-y-1">
                              <Label htmlFor={fieldId('sim-seed-angle')}>
                                Seed angle (deg)
                              </Label>
                              <ScrubbableNumberInput
                                id={fieldId('sim-seed-angle')}
                                min={-180}
                                max={180}
                                step={1}
                                integer
                                value={mixedParams?.seedAngle ?? null}
                                placeholder={
                                  mixedParams?.seedAngle === null
                                    ? 'Mixed'
                                    : undefined
                                }
                                onValueChange={(next) =>
                                  onUpdateSelectedFrames((frame) => ({
                                    ...frame,
                                    params: { ...frame.params, seedAngle: next },
                                  }))
                                }
                              />
                            </div>
                          </>
                        ) : null}
                      </div>
                    </details>
                    <details className="group rounded-sm border border-slate-500/25 bg-slate-900/35 px-2 py-1.5">
                      <summary className="cursor-pointer list-none text-[11px] font-medium text-slate-300">
                        Seed + reset behavior
                      </summary>
                      <div className="mt-2 grid gap-2">
                        <div className={controlRowVariants()}>
                          <div>
                            <Label
                              htmlFor={fieldId('sim-randomize-seed')}
                              className="text-xs text-slate-100"
                            >
                              Randomize seed
                            </Label>
                            <div className="text-xs text-slate-400">
                              {mixedSeed?.randomizeSeed === null
                                ? 'Mixed'
                                : 'Generate a new seed on reset.'}
                            </div>
                          </div>
                          <Switch
                            id={fieldId('sim-randomize-seed')}
                            checked={mixedSeed?.randomizeSeed ?? false}
                            onCheckedChange={(checked) =>
                              onUpdateSelectedFrames((frame) => ({
                                ...frame,
                                randomizeSeed: checked,
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={fieldId('sim-seed')}>Seed</Label>
                          <ScrubbableNumberInput
                            id={fieldId('sim-seed')}
                            min={0}
                            integer
                            value={mixedSeed?.seed ?? null}
                            placeholder={
                              mixedSeed?.seed === null ? 'Mixed' : undefined
                            }
                            onValueChange={(next) =>
                              onUpdateSelectedFrames(
                                (frame) => ({
                                  ...frame,
                                  seed: next,
                                }),
                                { rebuildSimulation: true, seedOverride: next },
                              )
                            }
                            disabled={mixedSeed?.randomizeSeed === true}
                            className={
                              mixedSeed?.randomizeSeed === true
                                ? 'opacity-60'
                                : undefined
                            }
                          />
                        </div>
                      </div>
                    </details>
                  </div>
                ) : null}
              </section>
            ) : null}

            {showProjectControls ? (
              <section className="order-30 space-y-3 px-4 py-3">
                {renderSectionHeader('Template Grid', 'template', 'Advanced layout')}
                {openSections.template ? (
                  <div id="section-template" className="space-y-3">
                    <div className="grid grid-cols-1 gap-2 min-[340px]:grid-cols-2">
                      <div className="space-y-1">
                        <Label htmlFor={fieldId('template-rows')}>Rows</Label>
                        <ScrubbableNumberInput
                          id={fieldId('template-rows')}
                          min={1}
                          integer
                          value={templateGrid.rows}
                          onValueChange={(next) =>
                            onTemplateGridChange({
                              ...templateGrid,
                              rows: next,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={fieldId('template-cols')}>Columns</Label>
                        <ScrubbableNumberInput
                          id={fieldId('template-cols')}
                          min={1}
                          integer
                          value={templateGrid.cols}
                          onValueChange={(next) =>
                            onTemplateGridChange({
                              ...templateGrid,
                              cols: next,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={fieldId('template-gutter')}>
                          Gutter ({paper.unit})
                        </Label>
                        <ScrubbableNumberInput
                          id={fieldId('template-gutter')}
                          min={0}
                          step={0.1}
                          value={templateGrid.gutter}
                          onValueChange={(next) =>
                            onTemplateGridChange({
                              ...templateGrid,
                              gutter: next,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <div className={controlRowVariants()}>
                        <div>
                          <Label
                            htmlFor={fieldId('template-show-gutter')}
                            className="text-xs text-slate-100"
                          >
                            Show gutter
                          </Label>
                          <div className="text-xs text-slate-400">
                            Display grid margins in the editor.
                          </div>
                        </div>
                        <Switch
                          id={fieldId('template-show-gutter')}
                          checked={templateGrid.showGutter}
                          onCheckedChange={(checked) =>
                            onTemplateGridChange({
                              ...templateGrid,
                              showGutter: checked,
                            })
                          }
                        />
                      </div>
                      <div className={controlRowVariants()}>
                        <div>
                          <Label
                            htmlFor={fieldId('template-gutter-obstacles')}
                            className="text-xs text-slate-100"
                          >
                            Gutter as obstacles
                          </Label>
                          <div className="text-xs text-slate-400">
                            Prevent growth inside the gutter margins.
                          </div>
                        </div>
                        <Switch
                          id={fieldId('template-gutter-obstacles')}
                          checked={templateGrid.gutterAsObstacles}
                          onCheckedChange={(checked) =>
                            onTemplateGridChange({
                              ...templateGrid,
                              gutterAsObstacles: checked,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                ) : null}
              </section>
            ) : null}

            {showProjectControls ? (
              <section className="order-20 space-y-3 px-4 py-3">
                {renderSectionHeader('Paper', 'paper', 'Project baseline')}
                {openSections.paper ? (
                  <div id="section-paper" className="space-y-3">
                    <div className="grid grid-cols-1 gap-2 min-[340px]:grid-cols-2">
                      <div className="space-y-1">
                        <Label htmlFor={fieldId('paper-width')}>
                          Width ({paper.unit})
                        </Label>
                        <ScrubbableNumberInput
                          id={fieldId('paper-width')}
                          min={1}
                          value={paper.width}
                          onValueChange={(next) =>
                            onPaperChange({ ...paper, width: next })
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={fieldId('paper-height')}>
                          Height ({paper.unit})
                        </Label>
                        <ScrubbableNumberInput
                          id={fieldId('paper-height')}
                          min={1}
                          value={paper.height}
                          onValueChange={(next) =>
                            onPaperChange({ ...paper, height: next })
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={fieldId('paper-unit')}>Units</Label>
                        <Select
                          value={paper.unit}
                          onValueChange={(value) =>
                            onPaperChange({ ...paper, unit: value as Unit })
                          }
                        >
                          <SelectTrigger id={fieldId('paper-unit')}>
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
                        <Label htmlFor={fieldId('paper-dpi')}>DPI</Label>
                        <ScrubbableNumberInput
                          id={fieldId('paper-dpi')}
                          min={36}
                          integer
                          value={paper.dpi}
                          onValueChange={(next) =>
                            onPaperChange({ ...paper, dpi: next })
                          }
                        />
                      </div>
                    </div>
                    <p className="text-xs text-slate-400">
                      Changing paper size resets the simulation and obstacles.
                    </p>
                  </div>
                ) : null}
              </section>
            ) : null}

            {hasFrameSelection ? (
              <section className="order-20 space-y-3 px-4 py-3">
                {renderSectionHeader('Obstacles', 'obstacles', 'Advanced')}
                {openSections.obstacles ? (
                  <div id="section-obstacles" className="space-y-3">
                    <div className="grid grid-cols-1 gap-2 min-[340px]:grid-cols-2">
                      <div className="space-y-1">
                        <Label htmlFor={fieldId('obs-count')}>
                          Polygon count
                        </Label>
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
                              (frame) => ({
                                ...frame,
                                obstacles: { ...frame.obstacles, count: next },
                              }),
                              { rebuildSimulation: true },
                            )
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={fieldId('obs-min-vertices')}>
                          Vertices (min)
                        </Label>
                        <ScrubbableNumberInput
                          id={fieldId('obs-min-vertices')}
                          min={3}
                          integer
                          value={mixedObstacles?.minVertices ?? null}
                          placeholder={
                            mixedObstacles?.minVertices === null
                              ? 'Mixed'
                              : undefined
                          }
                          onValueChange={(next) =>
                            onUpdateSelectedFrames(
                              (frame) => ({
                                ...frame,
                                obstacles: {
                                  ...frame.obstacles,
                                  minVertices: next,
                                },
                              }),
                              { rebuildSimulation: true },
                            )
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={fieldId('obs-max-vertices')}>
                          Vertices (max)
                        </Label>
                        <ScrubbableNumberInput
                          id={fieldId('obs-max-vertices')}
                          min={3}
                          integer
                          value={mixedObstacles?.maxVertices ?? null}
                          placeholder={
                            mixedObstacles?.maxVertices === null
                              ? 'Mixed'
                              : undefined
                          }
                          onValueChange={(next) =>
                            onUpdateSelectedFrames(
                              (frame) => ({
                                ...frame,
                                obstacles: {
                                  ...frame.obstacles,
                                  maxVertices: next,
                                },
                              }),
                              { rebuildSimulation: true },
                            )
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={fieldId('obs-min-radius')}>
                          Min radius ({paper.unit})
                        </Label>
                        <ScrubbableNumberInput
                          id={fieldId('obs-min-radius')}
                          min={0.1}
                          step={0.1}
                          value={mixedObstacles?.minRadius ?? null}
                          placeholder={
                            mixedObstacles?.minRadius === null
                              ? 'Mixed'
                              : undefined
                          }
                          onValueChange={(next) =>
                            onUpdateSelectedFrames(
                              (frame) => ({
                                ...frame,
                                obstacles: {
                                  ...frame.obstacles,
                                  minRadius: next,
                                },
                              }),
                              { rebuildSimulation: true },
                            )
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={fieldId('obs-max-radius')}>
                          Max radius ({paper.unit})
                        </Label>
                        <ScrubbableNumberInput
                          id={fieldId('obs-max-radius')}
                          min={0.2}
                          step={0.1}
                          value={mixedObstacles?.maxRadius ?? null}
                          placeholder={
                            mixedObstacles?.maxRadius === null
                              ? 'Mixed'
                              : undefined
                          }
                          onValueChange={(next) =>
                            onUpdateSelectedFrames(
                              (frame) => ({
                                ...frame,
                                obstacles: {
                                  ...frame.obstacles,
                                  maxRadius: next,
                                },
                              }),
                              { rebuildSimulation: true },
                            )
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={fieldId('obs-margin')}>
                          Margin ({paper.unit})
                        </Label>
                        <ScrubbableNumberInput
                          id={fieldId('obs-margin')}
                          min={0}
                          step={0.1}
                          value={mixedObstacles?.margin ?? null}
                          placeholder={
                            mixedObstacles?.margin === null
                              ? 'Mixed'
                              : undefined
                          }
                          onValueChange={(next) =>
                            onUpdateSelectedFrames(
                              (frame) => ({
                                ...frame,
                                obstacles: { ...frame.obstacles, margin: next },
                              }),
                              { rebuildSimulation: true },
                            )
                          }
                        />
                      </div>
                    </div>
                    <Button
                      onClick={onRegenerateObstacles}
                      variant="secondary"
                      size="compact"
                    >
                      Regenerate obstacles
                    </Button>
                  </div>
                ) : null}
              </section>
            ) : null}

            {hasFrameSelection ? (
              <section className="order-30 space-y-3 px-4 py-3">
                {renderSectionHeader('Rendering', 'rendering', 'Advanced')}
                {openSections.rendering ? (
                  <div id="section-rendering" className="space-y-3">
                    <div className="grid grid-cols-1 gap-2 min-[340px]:grid-cols-2">
                      <div className="space-y-1">
                        <Label htmlFor={fieldId('render-stroke-width')}>
                          Stroke width
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
                            onUpdateSelectedFrames((frame) => ({
                              ...frame,
                              renderSettings: {
                                ...frame.renderSettings,
                                strokeWidth: next,
                              },
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={fieldId('render-node-radius')}>
                          Node radius
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
                            onUpdateSelectedFrames((frame) => ({
                              ...frame,
                              renderSettings: {
                                ...frame.renderSettings,
                                nodeRadius: next,
                              },
                            }))
                          }
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-2 min-[340px]:grid-cols-2">
                      <div className="space-y-1">
                        <Label htmlFor={fieldId('render-root-color')}>
                          Root color
                        </Label>
                        {mixedRenderSettings?.rootColor === null ? (
                          <div className="text-xs text-slate-400">Mixed</div>
                        ) : null}
                        <Input
                          id={fieldId('render-root-color')}
                          type="color"
                          value={mixedRenderSettings?.rootColor ?? '#000000'}
                          aria-label="Root color"
                          onChange={(event) =>
                            onUpdateSelectedFrames((frame) => ({
                              ...frame,
                              renderSettings: {
                                ...frame.renderSettings,
                                rootColor: event.target.value,
                              },
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={fieldId('render-obstacle-color')}>
                          Obstacle color
                        </Label>
                        {mixedRenderSettings?.obstacleFill === null ? (
                          <div className="text-xs text-slate-400">Mixed</div>
                        ) : null}
                        <Input
                          id={fieldId('render-obstacle-color')}
                          type="color"
                          value={mixedRenderSettings?.obstacleFill ?? '#000000'}
                          aria-label="Obstacle color"
                          onChange={(event) =>
                            onUpdateSelectedFrames((frame) => ({
                              ...frame,
                              renderSettings: {
                                ...frame.renderSettings,
                                obstacleFill: event.target.value,
                              },
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor={fieldId('render-attractor-color')}>
                          Attractor color
                        </Label>
                        {mixedRenderSettings?.attractorColor === null ? (
                          <div className="text-xs text-slate-400">Mixed</div>
                        ) : null}
                        <Input
                          id={fieldId('render-attractor-color')}
                          type="color"
                          value={
                            mixedRenderSettings?.attractorColor ?? '#000000'
                          }
                          aria-label="Attractor color"
                          onChange={(event) =>
                            onUpdateSelectedFrames((frame) => ({
                              ...frame,
                              renderSettings: {
                                ...frame.renderSettings,
                                attractorColor: event.target.value,
                              },
                            }))
                          }
                        />
                      </div>
                    </div>
                    <div className={controlRowVariants()}>
                      <div>
                        <Label
                          htmlFor={fieldId('render-show-obstacles')}
                          className="text-xs text-slate-100"
                        >
                          Show obstacles
                        </Label>
                        <div className="text-xs text-slate-400">
                          {mixedRenderSettings?.showObstacles === null
                            ? 'Mixed'
                            : 'Hide polygons in view + exports.'}
                        </div>
                      </div>
                      <Switch
                        id={fieldId('render-show-obstacles')}
                        checked={mixedRenderSettings?.showObstacles ?? false}
                        onCheckedChange={(checked) =>
                          onUpdateSelectedFrames((frame) => ({
                            ...frame,
                            renderSettings: {
                              ...frame.renderSettings,
                              showObstacles: checked,
                            },
                          }))
                        }
                      />
                    </div>
                    <div className={controlRowVariants()}>
                      <div>
                        <Label
                          htmlFor={fieldId('render-show-attractors')}
                          className="text-xs text-slate-100"
                        >
                          Show attractors
                        </Label>
                        <div className="text-xs text-slate-400">
                          {mixedRenderSettings?.showAttractors === null
                            ? 'Mixed'
                            : 'Reveal growth targets.'}
                        </div>
                      </div>
                      <Switch
                        id={fieldId('render-show-attractors')}
                        checked={mixedRenderSettings?.showAttractors ?? false}
                        onCheckedChange={(checked) =>
                          onUpdateSelectedFrames((frame) => ({
                            ...frame,
                            renderSettings: {
                              ...frame.renderSettings,
                              showAttractors: checked,
                            },
                          }))
                        }
                      />
                    </div>
                    <div className={controlRowVariants()}>
                      <div>
                        <Label
                          htmlFor={fieldId('render-show-nodes')}
                          className="text-xs text-slate-100"
                        >
                          Show nodes
                        </Label>
                        <div className="text-xs text-slate-400">
                          {mixedRenderSettings?.showNodes === null
                            ? 'Mixed'
                            : 'Draw node points along roots.'}
                        </div>
                      </div>
                      <Switch
                        id={fieldId('render-show-nodes')}
                        checked={mixedRenderSettings?.showNodes ?? false}
                        onCheckedChange={(checked) =>
                          onUpdateSelectedFrames((frame) => ({
                            ...frame,
                            renderSettings: {
                              ...frame.renderSettings,
                              showNodes: checked,
                            },
                          }))
                        }
                      />
                    </div>
                  </div>
                ) : null}
              </section>
            ) : null}

            <section className="order-40 space-y-3 px-4 py-3">
              {renderSectionHeader('Export', 'export', 'Output')}
              {openSections.export ? (
                <div id="section-export" className="space-y-3">
                  {hasFrameSelection ? (
                    <>
                      <div className="grid grid-cols-1 gap-2 min-[340px]:grid-cols-2">
                        <div className="space-y-1">
                          <Label htmlFor={fieldId('export-fps')}>MP4 FPS</Label>
                          <ScrubbableNumberInput
                            id={fieldId('export-fps')}
                            min={1}
                            integer
                            value={mixedExportSettings?.fps ?? null}
                            placeholder={
                              mixedExportSettings?.fps === null
                                ? 'Mixed'
                                : undefined
                            }
                            onValueChange={(next) =>
                              onUpdateSelectedFrames((frame) => ({
                                ...frame,
                                exportSettings: {
                                  ...frame.exportSettings,
                                  fps: next,
                                },
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={fieldId('export-duration')}>
                            MP4 Duration (s)
                          </Label>
                          <ScrubbableNumberInput
                            id={fieldId('export-duration')}
                            min={1}
                            integer
                            value={
                              mixedExportSettings?.durationSeconds ?? null
                            }
                            placeholder={
                              mixedExportSettings?.durationSeconds === null
                                ? 'Mixed'
                                : undefined
                            }
                            onValueChange={(next) =>
                              onUpdateSelectedFrames((frame) => ({
                                ...frame,
                                exportSettings: {
                                  ...frame.exportSettings,
                                  durationSeconds: next,
                                },
                              }))
                            }
                            className={
                              mixedExportSettings?.durationMode === 'auto'
                                ? 'opacity-60'
                                : undefined
                            }
                            disabled={
                              mixedExportSettings?.durationMode === 'auto'
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor={fieldId('export-steps-per-frame')}>
                            MP4 Steps/frame
                          </Label>
                          <ScrubbableNumberInput
                            id={fieldId('export-steps-per-frame')}
                            min={1}
                            integer
                            value={
                              mixedExportSettings?.stepsPerFrame ?? null
                            }
                            placeholder={
                              mixedExportSettings?.stepsPerFrame === null
                                ? 'Mixed'
                                : undefined
                            }
                            onValueChange={(next) =>
                              onUpdateSelectedFrames((frame) => ({
                                ...frame,
                                exportSettings: {
                                  ...frame.exportSettings,
                                  stepsPerFrame: next,
                                },
                              }))
                            }
                          />
                        </div>
                      </div>
                      <div className={controlRowVariants()}>
                        <div>
                          <Label
                            htmlFor={fieldId('export-auto-duration')}
                            className="text-xs text-slate-100"
                          >
                            Auto duration
                          </Label>
                          <div className="text-xs text-slate-400">
                            {mixedExportSettings?.durationMode === null
                              ? 'Mixed'
                              : 'Stop when growth completes.'}
                          </div>
                        </div>
                        <Switch
                          id={fieldId('export-auto-duration')}
                          checked={
                            mixedExportSettings?.durationMode === 'auto'
                          }
                          onCheckedChange={(checked) =>
                            onUpdateSelectedFrames((frame) => ({
                              ...frame,
                              exportSettings: {
                                ...frame.exportSettings,
                                durationMode: checked ? 'auto' : 'fixed',
                              },
                            }))
                          }
                        />
                      </div>
                    </>
                  ) : null}
                  <div className="text-xs text-slate-400">
                    {hasFrameSelection
                      ? `Exports ${selectedFrames.length === 1 ? 'selected frame' : `${selectedFrames.length} selected frames`}`
                      : 'Exports entire project'}
                  </div>
                  {exportError ? (
                    <div
                      role="alert"
                      className="flex items-start justify-between gap-2 rounded-md border border-red-500/40 bg-red-500/10 px-2 py-1.5 text-xs text-red-100"
                    >
                      <div className="min-w-0 flex-1 break-words">{exportError}</div>
                      <Button
                        variant="outline"
                        size="compact"
                        onClick={onDismissExportError}
                      >
                        Dismiss
                      </Button>
                    </div>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={onExportPng}
                      variant="secondary"
                      size="compact"
                    >
                      Export PNG
                    </Button>
                    <Button
                      onClick={onExportSvg}
                      variant="secondary"
                      size="compact"
                    >
                      Export SVG
                    </Button>
                    <Button
                      onClick={onExportMp4}
                      variant="secondary"
                      size="compact"
                      disabled={isExportingMp4}
                      aria-busy={isExportingMp4}
                    >
                      {isExportingMp4 ? 'Exporting MP4...' : 'Export MP4'}
                    </Button>
                  </div>
                </div>
              ) : null}
            </section>

            {showProjectControls ? (
              <section className="order-50 space-y-3 px-4 py-3">
                {renderSectionHeader('Saved Runs', 'saved', 'Archive')}
                {openSections.saved ? (
                  <div id="section-saved" className="space-y-2">
                    <div className="text-xs text-slate-400">
                      Browse, preview, and restore saved runs.
                    </div>
                    <Button
                      variant="secondary"
                      size="compact"
                      onClick={() => setIsSavedRunsModalOpen(true)}
                    >
                      Open saved runs ({formattedSavedEntryCount})
                    </Button>
                  </div>
                ) : null}
              </section>
            ) : null}
          </div>
        </div>
      </ScrollArea>

      {isSavedRunsModalOpen ? (
        <div
          className="absolute inset-0 z-50 bg-[#070b12]/85 p-3 backdrop-blur-[1px]"
          onMouseDown={(event) => {
            if (event.target !== event.currentTarget) return;
            closeSavedRunsModal();
          }}
        >
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={savedRunsTitleId}
            aria-describedby={savedRunsDescriptionId}
            tabIndex={-1}
            className="flex h-full flex-col overflow-hidden rounded-sm border border-slate-500/35 bg-slate-950 shadow-2xl outline-none"
          >
            <div className="flex items-center justify-between border-b border-slate-500/25 px-3 py-2">
              <div className="min-w-0">
                <h2
                  id={savedRunsTitleId}
                  className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-300"
                >
                  Saved Runs
                </h2>
                <p id={savedRunsDescriptionId} className="text-xs text-slate-400">
                  Preview entries with hover or keyboard focus. Press Escape to
                  close.
                </p>
              </div>
              <Button
                variant="secondary"
                size="compact"
                onClick={closeSavedRunsModal}
              >
                Close
              </Button>
            </div>

            <div className="flex-1 overflow-hidden p-3">
              <ScrollArea className="h-full pr-2">
                <div
                  className="space-y-3"
                  onMouseLeave={stopPreview}
                  onBlurCapture={(event) => {
                    if (
                      !event.currentTarget.contains(
                        event.relatedTarget as Node | null,
                      )
                    ) {
                      stopPreview();
                    }
                  }}
                >
                  <div className="space-y-2">
                    <Label htmlFor={saveNameInputId}>Name</Label>
                    <Input
                      id={saveNameInputId}
                      value={saveName}
                      onChange={(event) =>
                        setSaveName(
                          event.target.value.slice(0, MAX_SAVE_NAME_LENGTH),
                        )
                      }
                      placeholder="New save name"
                      maxLength={MAX_SAVE_NAME_LENGTH}
                    />
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Optional. Supports emoji and non-Latin text.</span>
                      <span>{saveName.length}/{MAX_SAVE_NAME_LENGTH}</span>
                    </div>
                    <Button
                      variant="secondary"
                      size="compact"
                      onClick={handleSaveCurrent}
                    >
                      Save current
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {savedEntries.length === 0 ? (
                      <div className="rounded-sm border border-slate-500/25 bg-slate-900/45 p-2 text-xs text-slate-400">
                        No saved runs yet. Save the current project state to
                        create one.
                      </div>
                    ) : (
                      savedEntries.map((entry) => (
                        <div
                          key={entry.id}
                          className="rounded-sm border border-slate-500/25 bg-slate-900/45 p-2 text-xs text-slate-200 transition-colors duration-150 ease-out hover:border-slate-400/35 hover:bg-slate-900/70 focus-within:border-blue-300/40 focus-within:bg-slate-900/55 motion-reduce:transition-none"
                          onMouseEnter={() => startPreview(entry.id)}
                          onFocusCapture={() => startPreview(entry.id)}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div
                                className="truncate text-sm text-slate-100"
                                title={entry.name}
                              >
                                {entry.name}
                              </div>
                              <div className="truncate text-xs text-slate-400">
                                Seed: {entry.seed}{' '}
                                {entry.randomizeSeed ? '(random)' : '(fixed)'}
                              </div>
                            </div>
                            <div className="flex shrink-0 flex-wrap gap-2">
                              <Button
                                variant={
                                  previewedEntryId === entry.id
                                    ? 'default'
                                    : 'outline'
                                }
                                size="compact"
                                onClick={() => {
                                  if (previewedEntryId === entry.id) {
                                    stopPreview();
                                    return;
                                  }
                                  startPreview(entry.id);
                                }}
                              >
                                {previewedEntryId === entry.id
                                  ? 'Stop preview'
                                  : 'Preview'}
                              </Button>
                              <Button
                                variant="outline"
                                size="compact"
                                onClick={() => onLoadEntry(entry.id)}
                              >
                                Load
                              </Button>
                              <Button
                                variant="secondary"
                                size="compact"
                                onClick={() => handleDeleteEntry(entry)}
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
              </ScrollArea>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
