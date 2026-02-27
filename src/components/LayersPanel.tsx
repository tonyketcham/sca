import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from 'react';
import {
  draggable,
  dropTargetForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { GripVertical } from 'lucide-react';
import type { FrameConfig, TemplateGridSettings } from '../types/ui';
import { cn } from '../lib/utils';
import { ScrollArea } from './ui/scroll-area';
import { SectionHeading } from './ui/section-heading';

type LayersPanelProps = {
  frames: FrameConfig[];
  templateGrid: TemplateGridSettings;
  selectedFrameIndices: number[];
  headerAction?: ReactNode;
  onSelectFrame: (index: number) => void;
  onToggleFrame: (index: number) => void;
  onSelectFrameRange: (startIndex: number, endIndex: number) => void;
  onReorderFrames: (startIndex: number, endIndex: number) => void;
  onRenameFrame: (index: number, name: string) => void;
};

type DragData = {
  type: 'frame-layer';
  index: number;
};

const MAX_FRAME_NAME_LENGTH = 120;

export default function LayersPanel({
  frames,
  templateGrid,
  selectedFrameIndices,
  headerAction,
  onSelectFrame,
  onToggleFrame,
  onSelectFrameRange,
  onReorderFrames,
  onRenameFrame,
}: LayersPanelProps) {
  const rowCount = Math.max(1, Math.floor(templateGrid.rows));
  const columnCount = Math.max(1, Math.floor(templateGrid.cols));
  const totalCells = rowCount * columnCount;
  const [anchorIndex, setAnchorIndex] = useState<number | null>(null);

  useEffect(() => {
    if (selectedFrameIndices.length === 0) {
      setAnchorIndex(null);
    }
  }, [selectedFrameIndices.length]);

  return (
    <section className="group space-y-2.5 border-b border-border px-3.5 py-3">
      <div className="flex items-center justify-between">
        <SectionHeading>Layers</SectionHeading>
        <div className="flex items-center gap-2">
          <div className="text-[10px] tabular-nums text-muted opacity-65 transition-opacity duration-300 ease-out-expo group-hover:opacity-90">
            {frames.length}/{totalCells} cells, {rowCount}x{columnCount}
          </div>
          {headerAction}
        </div>
      </div>

      <div className="h-[clamp(12rem,30vh,17.5rem)] overflow-hidden rounded-[10px] border border-border/70 bg-surface shadow-[inset_0_1px_2px_rgba(0,0,0,0.22)]">
        <ScrollArea className="h-full">
          <div className="space-y-1 p-1.5">
            {frames.map((frame, index) => (
              <FrameLayerRow
                key={`frame-layer-${index}`}
                index={index}
                layerNumber={index + 1}
                frameName={frame.name}
                isSelected={selectedFrameIndices.includes(index)}
                anchorIndex={anchorIndex}
                onSelectFrame={onSelectFrame}
                onToggleFrame={onToggleFrame}
                onSelectFrameRange={onSelectFrameRange}
                onUpdateAnchor={setAnchorIndex}
                onReorderFrames={onReorderFrames}
                onRenameFrame={onRenameFrame}
              />
            ))}
          </div>
        </ScrollArea>
      </div>
    </section>
  );
}

type FrameLayerRowProps = {
  index: number;
  layerNumber: number;
  frameName: string;
  isSelected: boolean;
  anchorIndex: number | null;
  onSelectFrame: (index: number) => void;
  onToggleFrame: (index: number) => void;
  onSelectFrameRange: (startIndex: number, endIndex: number) => void;
  onUpdateAnchor: (index: number) => void;
  onReorderFrames: (startIndex: number, endIndex: number) => void;
  onRenameFrame: (index: number, name: string) => void;
};

function FrameLayerRow({
  index,
  layerNumber,
  frameName,
  isSelected,
  anchorIndex,
  onSelectFrame,
  onToggleFrame,
  onSelectFrameRange,
  onUpdateAnchor,
  onReorderFrames,
  onRenameFrame,
}: FrameLayerRowProps) {
  const rowRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDraggedOver, setIsDraggedOver] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(frameName);

  useEffect(() => {
    const element = rowRef.current;
    if (!element) return;

    return combine(
      draggable({
        element,
        getInitialData: () =>
          ({ type: 'frame-layer', index }) satisfies DragData,
        onDragStart: () => setIsDragging(true),
        onDrop: () => setIsDragging(false),
      }),
      dropTargetForElements({
        element,
        getData: () => ({ index }),
        canDrop: ({ source }) =>
          (source.data as Partial<DragData>).type === 'frame-layer',
        onDragEnter: () => setIsDraggedOver(true),
        onDragLeave: () => setIsDraggedOver(false),
        onDrop: ({ source }) => {
          setIsDraggedOver(false);
          const sourceIndex = Number((source.data as Partial<DragData>).index);
          if (!Number.isFinite(sourceIndex) || sourceIndex === index) return;
          onReorderFrames(sourceIndex, index);
        },
      }),
    );
  }, [index, onReorderFrames]);

  useEffect(() => {
    setDraftName(frameName);
  }, [frameName]);

  useEffect(() => {
    if (!isEditing) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [isEditing]);

  const baseName = frameName.trim() || `Frame ${layerNumber}`;
  const label = `${baseName} (Layer ${layerNumber})`;

  const applySelection = (modifiers: {
    shiftKey: boolean;
    metaKey: boolean;
    ctrlKey: boolean;
  }) => {
    if (isEditing) return;
    if (modifiers.shiftKey) {
      onSelectFrameRange(anchorIndex ?? index, index);
      onUpdateAnchor(index);
      return;
    }

    if (modifiers.metaKey || modifiers.ctrlKey) {
      onToggleFrame(index);
      onUpdateAnchor(index);
      return;
    }

    onSelectFrame(index);
    onUpdateAnchor(index);
  };

  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    applySelection(event);
  };

  const normalizeFrameName = (value: string) => {
    const nextName = value.trim() || frameName.trim() || `Frame ${layerNumber}`;
    return nextName.slice(0, MAX_FRAME_NAME_LENGTH);
  };

  const commitName = () => {
    const nextName = normalizeFrameName(draftName);
    setDraftName(nextName);
    setIsEditing(false);
    if (nextName !== frameName) {
      onRenameFrame(index, nextName);
    }
  };

  const cancelName = () => {
    setDraftName(frameName);
    setIsEditing(false);
  };

  return (
    <div
      ref={rowRef}
      onClick={handleClick}
      role="button"
      tabIndex={isEditing ? -1 : 0}
      aria-pressed={isSelected}
      aria-label={label}
      onKeyDown={(event) => {
        if (isEditing) return;
        if (event.key === 'F2') {
          event.preventDefault();
          setIsEditing(true);
          return;
        }
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          applySelection(event);
        }
      }}
      className={cn(
        'group flex items-center gap-2 rounded-[6px] border px-2 py-1.5 text-xs transition-all duration-200 ease-out-expo focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50',
        isEditing ? 'cursor-default' : 'cursor-grab active:cursor-grabbing',
        isSelected
          ? 'border-primary/50 bg-primary/20 text-primary shadow-[inset_0_1px_1px_rgba(255,255,255,0.04)]'
          : 'border-transparent text-foreground hover:border-borderHover/70 hover:bg-surfaceHover',
        isDraggedOver ? 'border-primary/65 bg-primary/18' : null,
        isDragging ? 'opacity-75 scale-[0.99]' : null,
      )}
    >
      <GripVertical
        className={cn(
          'h-3.5 w-3.5 shrink-0 transition-colors duration-200 ease-out-expo',
          isSelected
            ? 'text-primary/70'
            : 'text-muted/60 group-hover:text-muted',
        )}
        aria-hidden="true"
      />
      {isEditing ? (
        <input
          ref={inputRef}
          className="flex-1 rounded-[4px] border border-border bg-surface px-1.5 py-0.5 text-xs text-foreground outline-none shadow-[inset_0_1px_2px_rgba(0,0,0,0.18)]"
          value={draftName}
          onChange={(event) =>
            setDraftName(event.target.value.slice(0, MAX_FRAME_NAME_LENGTH))
          }
          onBlur={commitName}
          maxLength={MAX_FRAME_NAME_LENGTH}
          aria-label={`Rename ${label}`}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              commitName();
            }
            if (event.key === 'Escape') {
              event.preventDefault();
              cancelName();
            }
          }}
          onPointerDown={(event) => event.stopPropagation()}
        />
      ) : (
        <span
          className="min-w-0 flex-1 truncate text-[12px]"
          title={label}
          onDoubleClick={(event) => {
            event.stopPropagation();
            setIsEditing(true);
          }}
        >
          {baseName}
        </span>
      )}
      <span
        className={cn(
          'shrink-0 rounded-[4px] border px-1.5 py-0.5 text-[10px] tabular-nums transition-all duration-200 ease-out-expo',
          isSelected
            ? 'border-primary/30 bg-primary/10 text-primary opacity-100'
            : 'border-border/70 bg-surface text-muted opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100',
        )}
      >
        #{layerNumber}
      </span>
    </div>
  );
}
