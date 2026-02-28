import { useId, useState, useCallback } from 'react';
import { Archive } from 'lucide-react';
import type {
  PaperSettings,
  TemplateGridSettings,
  FrameConfig,
  SavedEntry,
} from '../types/ui';
import type { Unit } from '../geometry/units';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { Input } from './ui/input';
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
import { SwitchControlRow } from './ui/switch-control-row';
import { LabeledField } from './ui/labeled-field';
import {
  Popover,
  PopoverArrow,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';
import LayersPanel from './LayersPanel';

type LeftSidebarProps = {
  paper: PaperSettings;
  templateGrid: TemplateGridSettings;
  frames: FrameConfig[];
  selectedFrameIndices: number[];
  savedEntries: SavedEntry[];
  onPaperChange: (next: PaperSettings) => void;
  onTemplateGridChange: (next: TemplateGridSettings) => void;
  onSelectFrame: (index: number) => void;
  onToggleFrame: (index: number) => void;
  onSelectFrameRange: (startIndex: number, endIndex: number) => void;
  onReorderFrames: (startIndex: number, endIndex: number) => void;
  onRenameFrame: (index: number, name: string) => void;
  onSaveEntry: (name?: string) => void;
  onLoadEntry: (id: string) => void;
  onDeleteEntry: (id: string) => void;
  onPreviewEntry: (id: string) => void;
  onPreviewEnd: () => void;
};

const MAX_SAVE_NAME_LENGTH = 120;

export default function LeftSidebar({
  paper,
  templateGrid,
  frames,
  selectedFrameIndices,
  savedEntries,
  onPaperChange,
  onTemplateGridChange,
  onSelectFrame,
  onToggleFrame,
  onSelectFrameRange,
  onReorderFrames,
  onRenameFrame,
  onSaveEntry,
  onLoadEntry,
  onDeleteEntry,
  onPreviewEntry,
  onPreviewEnd,
}: LeftSidebarProps) {
  const [saveName, setSaveName] = useState('');
  const [isSavedRunsPopoverOpen, setIsSavedRunsPopoverOpen] = useState(false);
  const [previewedEntryId, setPreviewedEntryId] = useState<string | null>(null);

  const controlsIdPrefix = useId();
  const fieldId = useCallback(
    (name: string): string => `${controlsIdPrefix}-${name}`,
    [controlsIdPrefix],
  );

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

  const handleArchiveOpenChange = useCallback(
    (open: boolean) => {
      setIsSavedRunsPopoverOpen(open);
      if (!open) {
        stopPreview();
      }
    },
    [stopPreview],
  );

  const handleSaveCurrent = useCallback(() => {
    const next = saveName.replace(/\s+/g, ' ').trim();
    const name =
      next.length > 0 ? next.slice(0, MAX_SAVE_NAME_LENGTH) : undefined;
    onSaveEntry(name);
    setSaveName('');
  }, [onSaveEntry, saveName]);

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

  const savedEntriesCountLabel =
    savedEntries.length === 1 ? '1 item' : `${savedEntries.length} items`;
  const archiveHintText =
    savedEntries.length > 0
      ? 'Hover or focus to preview'
      : 'Create your first saved run';

  return (
    <SidebarShell side="left">
      <SidebarHeader>Project</SidebarHeader>

      <div className="flex-none max-h-[50%] flex flex-col">
        <LayersPanel
          frames={frames}
          templateGrid={templateGrid}
          selectedFrameIndices={selectedFrameIndices}
          headerAction={
            <Popover
              open={isSavedRunsPopoverOpen}
              onOpenChange={handleArchiveOpenChange}
            >
              <PopoverTrigger asChild>
                <Button
                  variant={isSavedRunsPopoverOpen ? 'primary' : 'ghost'}
                  size="icon"
                  className="h-6 w-6"
                  aria-label={
                    isSavedRunsPopoverOpen
                      ? 'Hide saved runs archive'
                      : 'Open saved runs archive'
                  }
                  title={
                    isSavedRunsPopoverOpen
                      ? 'Hide saved runs archive'
                      : 'Open saved runs archive'
                  }
                >
                  <Archive className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                side="bottom"
                align="end"
                sideOffset={8}
                collisionPadding={12}
                avoidCollisions
                sticky="always"
                className="w-[min(25rem,calc(100vw-2rem))] overflow-hidden p-0"
              >
                <PopoverArrow width={12} height={8} />
                <div className="space-y-3 p-3">
                  <div className="flex items-start justify-between rounded-[8px] border border-border/60 bg-surface/35 px-2.5 py-2 shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)]">
                    <div className="space-y-1">
                      <SectionHeading>Saved Runs</SectionHeading>
                      <p className="text-[10px] text-muted">
                        Store reusable seeds and frame settings.
                      </p>
                    </div>
                    <span className="rounded-full border border-border/70 bg-background/40 px-2 py-0.5 text-[10px] text-foreground/85 tabular-nums">
                      {savedEntriesCountLabel}
                    </span>
                  </div>

                  <InsetPanel
                    padding="sm"
                    tone="subtle"
                    className="space-y-2.5"
                  >
                    <LabeledField id={fieldId('save-name')} label="Name">
                      <Input
                        id={fieldId('save-name')}
                        value={saveName}
                        onChange={(e) =>
                          setSaveName(
                            e.target.value.slice(0, MAX_SAVE_NAME_LENGTH),
                          )
                        }
                        onKeyDown={(event) => {
                          if (event.key !== 'Enter') return;
                          event.preventDefault();
                          handleSaveCurrent();
                        }}
                        placeholder="e.g. Coral Canopy"
                        className="bg-background/70"
                      />
                    </LabeledField>
                    <Button
                      variant="primary"
                      className="h-7 w-full"
                      onClick={handleSaveCurrent}
                    >
                      Save Current State
                    </Button>
                  </InsetPanel>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-0.5">
                      <SectionHeading className="text-[9px]">
                        Archive
                      </SectionHeading>
                      <span className="text-[10px] text-muted">
                        {archiveHintText}
                      </span>
                    </div>

                    <ScrollArea className="max-h-[50vh]">
                      <div className="space-y-1.5 pb-0.5 pr-1">
                        {savedEntries.map((entry) => {
                          const isPreviewed = previewedEntryId === entry.id;
                          return (
                            <div
                              key={entry.id}
                              className={cn(
                                'group relative rounded-[8px] border p-2.5 transition-all duration-300 ease-out-expo',
                                isPreviewed
                                  ? 'border-primary/45 bg-primary/10 shadow-[inset_0_1px_2px_rgba(0,0,0,0.22)]'
                                  : 'border-border bg-surface hover:border-borderHover/90 hover:bg-surfaceHover/40',
                              )}
                              onMouseEnter={() => startPreview(entry.id)}
                              onMouseLeave={(event) => {
                                const activeElement = document.activeElement;
                                if (
                                  activeElement instanceof Node &&
                                  event.currentTarget.contains(activeElement)
                                ) {
                                  return;
                                }
                                stopPreview();
                              }}
                              onFocusCapture={() => startPreview(entry.id)}
                              onBlurCapture={(event) => {
                                const nextFocusTarget = event.relatedTarget;
                                if (
                                  nextFocusTarget instanceof Node &&
                                  event.currentTarget.contains(nextFocusTarget)
                                ) {
                                  return;
                                }
                                stopPreview();
                              }}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-[12px] font-medium text-foreground">
                                    {entry.name}
                                  </p>
                                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px]">
                                    <span className="rounded-[4px] border border-border/70 bg-background/50 px-1.5 py-0.5 text-foreground/90 tabular-nums">
                                      Seed {entry.seed}
                                    </span>
                                    <span className="rounded-[4px] border border-border/60 bg-surface/70 px-1.5 py-0.5 text-muted">
                                      {entry.randomizeSeed
                                        ? 'Randomized'
                                        : 'Fixed Seed'}
                                    </span>
                                  </div>
                                </div>
                                {isPreviewed && (
                                  <span className="shrink-0 rounded-full border border-primary/40 bg-primary/16 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-primary">
                                    Preview
                                  </span>
                                )}
                              </div>

                              <div
                                className={cn(
                                  'mt-2 flex items-center gap-1.5 transition-all duration-300 ease-out-expo',
                                  isPreviewed
                                    ? 'translate-y-0 opacity-100 pointer-events-auto'
                                    : 'translate-y-0.5 opacity-0 pointer-events-none group-hover:translate-y-0 group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100 group-focus-within:pointer-events-auto',
                                )}
                              >
                                <Button
                                  variant="secondary"
                                  size="compact"
                                  className="h-6 flex-1"
                                  onClick={() => onLoadEntry(entry.id)}
                                  aria-label={`Load ${entry.name}`}
                                  title={`Load ${entry.name}`}
                                >
                                  Load
                                </Button>
                                <Button
                                  variant="outline"
                                  size="compact"
                                  className="h-6 border-border/70 text-muted hover:border-borderHover hover:bg-surfaceHover/70 hover:text-foreground"
                                  onClick={() => handleDeleteEntry(entry)}
                                  aria-label={`Delete ${entry.name}`}
                                  title={`Delete ${entry.name}`}
                                >
                                  Delete
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>

                    {savedEntries.length === 0 && (
                      <InsetPanel
                        padding="sm"
                        tone="subtle"
                        className="space-y-1 text-center"
                      >
                        <p className="text-[11px] text-foreground/90">
                          No saved runs yet
                        </p>
                        <p className="text-[10px] text-muted">
                          Save the current state to build your archive.
                        </p>
                      </InsetPanel>
                    )}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          }
          onSelectFrame={onSelectFrame}
          onToggleFrame={onToggleFrame}
          onSelectFrameRange={onSelectFrameRange}
          onReorderFrames={onReorderFrames}
          onRenameFrame={onRenameFrame}
        />
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          <div className="space-y-4">
            <SectionHeading>Paper Setup</SectionHeading>
            <div className="grid grid-cols-2 gap-3">
              <ScrubbableNumberField
                id={fieldId('paper-width')}
                label={`Width (${paper.unit})`}
                min={1}
                coarseness="coarse"
                value={paper.width}
                onValueChange={(next) =>
                  onPaperChange({ ...paper, width: next })
                }
              />
              <ScrubbableNumberField
                id={fieldId('paper-height')}
                label={`Height (${paper.unit})`}
                min={1}
                coarseness="coarse"
                value={paper.height}
                onValueChange={(next) =>
                  onPaperChange({ ...paper, height: next })
                }
              />
              <LabeledField id={fieldId('paper-unit')} label="Units">
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
              </LabeledField>
              <ScrubbableNumberField
                id={fieldId('paper-dpi')}
                label="DPI"
                min={36}
                integer
                coarseness="coarse"
                value={paper.dpi}
                onValueChange={(next) => onPaperChange({ ...paper, dpi: next })}
              />
            </div>
            <div className="space-y-2">
              <SwitchControlRow
                id={fieldId('paper-export-canvas-ui')}
                label="Include canvas UI in export"
                checked={paper.includeCanvasUiInExport}
                onCheckedChange={(checked) =>
                  onPaperChange({ ...paper, includeCanvasUiInExport: checked })
                }
              />
            </div>
          </div>

          <div className="space-y-4">
            <SectionHeading>Template Grid</SectionHeading>
            <div className="grid grid-cols-2 gap-3">
              <ScrubbableNumberField
                id={fieldId('template-rows')}
                label="Rows"
                min={1}
                integer
                coarseness="coarse"
                value={templateGrid.rows}
                onValueChange={(next) =>
                  onTemplateGridChange({ ...templateGrid, rows: next })
                }
              />
              <ScrubbableNumberField
                id={fieldId('template-cols')}
                label="Columns"
                min={1}
                integer
                coarseness="coarse"
                value={templateGrid.cols}
                onValueChange={(next) =>
                  onTemplateGridChange({ ...templateGrid, cols: next })
                }
              />
              <ScrubbableNumberField
                id={fieldId('template-gutter')}
                label={`Gutter (${paper.unit})`}
                className="col-span-2"
                min={0}
                step={0.1}
                coarseness="fine"
                value={templateGrid.gutter}
                onValueChange={(next) =>
                  onTemplateGridChange({ ...templateGrid, gutter: next })
                }
              />
            </div>
            <div className="space-y-2">
              <SwitchControlRow
                id={fieldId('template-show-gutter')}
                label="Show gutter"
                checked={templateGrid.showGutter}
                onCheckedChange={(checked) =>
                  onTemplateGridChange({
                    ...templateGrid,
                    showGutter: checked,
                  })
                }
              />
              <SwitchControlRow
                id={fieldId('template-gutter-obstacles')}
                label="Gutter as obstacles"
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
      </ScrollArea>
    </SidebarShell>
  );
}
