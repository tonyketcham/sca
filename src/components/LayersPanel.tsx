import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine'
import { GripVertical, Layers } from 'lucide-react'
import type { FrameConfig, TemplateGridSettings } from '../types/ui'
import { cn } from '../lib/utils'
import { ScrollArea } from './ui/scroll-area'

type LayersPanelProps = {
  frames: FrameConfig[]
  templateGrid: TemplateGridSettings
  selectedFrameIndices: number[]
  onSelectProject: () => void
  onSelectFrame: (index: number) => void
  onToggleFrame: (index: number) => void
  onSelectFrameRange: (startIndex: number, endIndex: number) => void
  onReorderFrames: (startIndex: number, endIndex: number) => void
  onRenameFrame: (index: number, name: string) => void
}

type DragData = {
  type: 'frame-layer'
  index: number
}

const MAX_FRAME_NAME_LENGTH = 120

export default function LayersPanel({
  frames,
  templateGrid,
  selectedFrameIndices,
  onSelectProject,
  onSelectFrame,
  onToggleFrame,
  onSelectFrameRange,
  onReorderFrames,
  onRenameFrame
}: LayersPanelProps) {
  const isProjectSelected = selectedFrameIndices.length === 0
  const columnCount = Math.max(1, templateGrid.cols)
  const [anchorIndex, setAnchorIndex] = useState<number | null>(null)

  useEffect(() => {
    if (selectedFrameIndices.length === 0) {
      setAnchorIndex(null)
    }
  }, [selectedFrameIndices.length])

  const handleSelectProject = () => {
    setAnchorIndex(null)
    onSelectProject()
  }

  return (
    <section className="space-y-2 border-b border-zinc-800 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-zinc-200">
          <Layers className="h-3.5 w-3.5" />
          Layers
        </div>
        <div className="text-[10px] text-zinc-500">{frames.length} frames</div>
      </div>
      <div className="max-h-[240px] overflow-hidden rounded-md border border-zinc-800 bg-zinc-950/60">
        <ScrollArea className="h-full">
          <div className="space-y-1 p-1">
            <button
              type="button"
              onClick={handleSelectProject}
              className={cn(
                'flex w-full items-center justify-between rounded-md border px-2 py-1.5 text-left text-[11px] transition',
                isProjectSelected
                  ? 'border-blue-500/70 bg-blue-500/10 text-blue-200'
                  : 'border-transparent text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900'
              )}
            >
              <span className="font-semibold">Project</span>
              <span className="text-[10px] text-zinc-500">Paper + Grid</span>
            </button>
            {frames.map((frame, index) => (
              <FrameLayerRow
                key={`frame-layer-${index}`}
                index={index}
                columnCount={columnCount}
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
  )
}

type FrameLayerRowProps = {
  index: number
  columnCount: number
  frameName: string
  isSelected: boolean
  anchorIndex: number | null
  onSelectFrame: (index: number) => void
  onToggleFrame: (index: number) => void
  onSelectFrameRange: (startIndex: number, endIndex: number) => void
  onUpdateAnchor: (index: number) => void
  onReorderFrames: (startIndex: number, endIndex: number) => void
  onRenameFrame: (index: number, name: string) => void
}

function FrameLayerRow({
  index,
  columnCount,
  frameName,
  isSelected,
  anchorIndex,
  onSelectFrame,
  onToggleFrame,
  onSelectFrameRange,
  onUpdateAnchor,
  onReorderFrames,
  onRenameFrame
}: FrameLayerRowProps) {
  const rowRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [isDraggedOver, setIsDraggedOver] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [draftName, setDraftName] = useState(frameName)

  useEffect(() => {
    const element = rowRef.current
    if (!element) return

    return combine(
      draggable({
        element,
        getInitialData: () => ({ type: 'frame-layer', index } satisfies DragData),
        onDragStart: () => setIsDragging(true),
        onDrop: () => setIsDragging(false)
      }),
      dropTargetForElements({
        element,
        getData: () => ({ index }),
        canDrop: ({ source }) => (source.data as Partial<DragData>).type === 'frame-layer',
        onDragEnter: () => setIsDraggedOver(true),
        onDragLeave: () => setIsDraggedOver(false),
        onDrop: ({ source }) => {
          setIsDraggedOver(false)
          const sourceIndex = Number((source.data as Partial<DragData>).index)
          if (!Number.isFinite(sourceIndex) || sourceIndex === index) return
          onReorderFrames(sourceIndex, index)
        }
      })
    )
  }, [index, onReorderFrames])

  useEffect(() => {
    setDraftName(frameName)
  }, [frameName])

  useEffect(() => {
    if (!isEditing) return
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [isEditing])

  const label = useMemo(() => {
    const row = Math.floor(index / columnCount)
    const col = index % columnCount
    const baseName = frameName.trim() || `Frame ${index + 1}`
    return `${baseName} (R${row + 1}, C${col + 1})`
  }, [columnCount, frameName, index])

  const applySelection = (modifiers: {
    shiftKey: boolean
    metaKey: boolean
    ctrlKey: boolean
  }) => {
    if (isEditing) return
    if (modifiers.shiftKey) {
      onSelectFrameRange(anchorIndex ?? index, index)
      onUpdateAnchor(index)
      return
    }

    if (modifiers.metaKey || modifiers.ctrlKey) {
      onToggleFrame(index)
      onUpdateAnchor(index)
      return
    }

    onSelectFrame(index)
    onUpdateAnchor(index)
  }

  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    applySelection(event)
  }

  const normalizeFrameName = (value: string) => {
    const nextName = value.trim() || frameName.trim() || `Frame ${index + 1}`
    return nextName.slice(0, MAX_FRAME_NAME_LENGTH)
  }

  const commitName = () => {
    const nextName = normalizeFrameName(draftName)
    setDraftName(nextName)
    setIsEditing(false)
    if (nextName !== frameName) {
      onRenameFrame(index, nextName)
    }
  }

  const cancelName = () => {
    setDraftName(frameName)
    setIsEditing(false)
  }

  return (
    <div
      ref={rowRef}
      onClick={handleClick}
      role="button"
      tabIndex={isEditing ? -1 : 0}
      aria-pressed={isSelected}
      aria-label={label}
      onKeyDown={(event) => {
        if (isEditing) return
        if (event.key === 'F2') {
          event.preventDefault()
          setIsEditing(true)
          return
        }
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          applySelection(event)
        }
      }}
      className={cn(
        'flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 text-[11px] transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-500',
        isSelected
          ? 'border-blue-500/70 bg-blue-500/10 text-blue-200'
          : 'border-transparent text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900',
        isDraggedOver ? 'border-blue-400/80 bg-blue-400/10' : null,
        isDragging ? 'opacity-70' : null
      )}
    >
      <GripVertical className="h-3.5 w-3.5 shrink-0 text-zinc-500" aria-hidden="true" />
      {isEditing ? (
        <input
          ref={inputRef}
          className="flex-1 rounded-sm border border-zinc-700 bg-zinc-950 px-1 py-0.5 text-[11px] text-zinc-100 outline-none"
          value={draftName}
          onChange={(event) =>
            setDraftName(event.target.value.slice(0, MAX_FRAME_NAME_LENGTH))
          }
          onBlur={commitName}
          maxLength={MAX_FRAME_NAME_LENGTH}
          aria-label={`Rename ${label}`}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              commitName()
            }
            if (event.key === 'Escape') {
              event.preventDefault()
              cancelName()
            }
          }}
          onPointerDown={(event) => event.stopPropagation()}
        />
      ) : (
        <span
          className="min-w-0 flex-1 truncate"
          title={label}
          onDoubleClick={(event) => {
            event.stopPropagation()
            setIsEditing(true)
          }}
        >
          {label}
        </span>
      )}
    </div>
  )
}
