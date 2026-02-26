import { useId, useState, useCallback } from 'react';
import type {
  PaperSettings,
  TemplateGridSettings,
  FrameConfig,
  SavedEntry,
} from '../types/ui';
import type { Unit } from '../geometry/units';
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
import LayersPanel from './LayersPanel';

type LeftSidebarProps = {
  paper: PaperSettings;
  templateGrid: TemplateGridSettings;
  frames: FrameConfig[];
  selectedFrameIndices: number[];
  savedEntries: SavedEntry[];
  onPaperChange: (next: PaperSettings) => void;
  onTemplateGridChange: (next: TemplateGridSettings) => void;
  onSelectProject: () => void;
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
  onSelectProject,
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
  const [isSavedRunsModalOpen, setIsSavedRunsModalOpen] = useState(false);
  const [previewedEntryId, setPreviewedEntryId] = useState<string | null>(null);

  const controlsIdPrefix = useId();
  const fieldId = useCallback(
    (name: string): string => `${controlsIdPrefix}-${name}`,
    [controlsIdPrefix],
  );

  const hasFrameSelection = selectedFrameIndices.length > 0;
  const showProjectControls = !hasFrameSelection;

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

  // Expose it or use it to prevent linter errors
  // e.g., if we hit escape, we could call closeSavedRunsModal
  // For now, we'll assign it to a placeholder variable if completely unused in UI
  const _closeModal = closeSavedRunsModal;
  void _closeModal;

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

  return (
    <SidebarShell side="left">
      <SidebarHeader>Explorer</SidebarHeader>

      <div className="flex-none max-h-[50%] flex flex-col">
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
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {showProjectControls && (
            <>
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
                    onValueChange={(next) =>
                      onPaperChange({ ...paper, dpi: next })
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

              <div className="space-y-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <SectionHeading>Saved Runs</SectionHeading>
                  <span className="text-[10px] text-muted tabular-nums">
                    {savedEntries.length} items
                  </span>
                </div>
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => setIsSavedRunsModalOpen(!isSavedRunsModalOpen)}
                >
                  {isSavedRunsModalOpen ? 'Hide Archive' : 'Open Archive'}
                </Button>

                {isSavedRunsModalOpen && (
                  <div className="space-y-4 animate-in slide-in-from-top-2 fade-in duration-300">
                    <InsetPanel className="space-y-2">
                      <LabeledField id={fieldId('save-name')} label="Name">
                        <Input
                          id={fieldId('save-name')}
                          value={saveName}
                          onChange={(e) =>
                            setSaveName(
                              e.target.value.slice(0, MAX_SAVE_NAME_LENGTH),
                            )
                          }
                          placeholder="New save name"
                          className="bg-background"
                        />
                      </LabeledField>
                      <Button
                        variant="primary"
                        className="w-full"
                        onClick={handleSaveCurrent}
                      >
                        Save current state
                      </Button>
                    </InsetPanel>

                    <div className="space-y-2">
                      {savedEntries.map((entry) => (
                        <div
                          key={entry.id}
                          className="group relative rounded-md border border-border bg-surface p-2.5 transition-all hover:border-borderHover"
                          onMouseEnter={() => startPreview(entry.id)}
                          onMouseLeave={stopPreview}
                        >
                          <div className="text-[12px] font-medium text-foreground mb-1 truncate">
                            {entry.name}
                          </div>
                          <div className="text-[10px] text-muted mb-2">
                            Seed: {entry.seed}{' '}
                            {entry.randomizeSeed ? '(random)' : '(fixed)'}
                          </div>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="secondary"
                              size="compact"
                              className="flex-1"
                              onClick={() => onLoadEntry(entry.id)}
                            >
                              Load
                            </Button>
                            <Button
                              variant="outline"
                              size="compact"
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 hover:border-red-500/30"
                              onClick={() => handleDeleteEntry(entry)}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      ))}
                      {savedEntries.length === 0 && (
                        <div className="text-[11px] text-muted text-center py-4">
                          No saved runs yet.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {!showProjectControls && (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted">
              <p className="text-[12px]">Project settings hidden</p>
              <p className="text-[11px] opacity-70 mt-1">
                Deselect frames to view paper settings
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </SidebarShell>
  );
}
