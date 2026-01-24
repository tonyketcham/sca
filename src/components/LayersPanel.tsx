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
  onReorderFrames: (startIndex: number, endIndex: number) => void
}

type DragData = {
  type: 'frame-layer'
  index: number
}

export default function LayersPanel({
  frames,
  templateGrid,
  selectedFrameIndices,
  onSelectProject,
  onSelectFrame,
  onToggleFrame,
  onReorderFrames
}: LayersPanelProps) {
  const isProjectSelected = selectedFrameIndices.length === 0
  const columnCount = Math.max(1, templateGrid.cols)

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
              onClick={onSelectProject}
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
            {frames.map((_, index) => (
              <FrameLayerRow
                key={`frame-layer-${index}`}
                index={index}
                columnCount={columnCount}
                isSelected={selectedFrameIndices.includes(index)}
                onSelectFrame={onSelectFrame}
                onToggleFrame={onToggleFrame}
                onReorderFrames={onReorderFrames}
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
  isSelected: boolean
  onSelectFrame: (index: number) => void
  onToggleFrame: (index: number) => void
  onReorderFrames: (startIndex: number, endIndex: number) => void
}

function FrameLayerRow({
  index,
  columnCount,
  isSelected,
  onSelectFrame,
  onToggleFrame,
  onReorderFrames
}: FrameLayerRowProps) {
  const rowRef = useRef<HTMLDivElement | null>(null)
  const [isDraggedOver, setIsDraggedOver] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

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

  const label = useMemo(() => {
    const row = Math.floor(index / columnCount)
    const col = index % columnCount
    return `Frame ${index + 1} (R${row + 1}, C${col + 1})`
  }, [columnCount, index])

  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.metaKey || event.ctrlKey) {
      onToggleFrame(index)
    } else {
      onSelectFrame(index)
    }
  }

  return (
    <div
      ref={rowRef}
      onClick={handleClick}
      className={cn(
        'flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 text-[11px] transition',
        isSelected
          ? 'border-blue-500/70 bg-blue-500/10 text-blue-200'
          : 'border-transparent text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900',
        isDraggedOver ? 'border-blue-400/80 bg-blue-400/10' : null,
        isDragging ? 'opacity-70' : null
      )}
    >
      <GripVertical className="h-3.5 w-3.5 text-zinc-500" />
      <span className="flex-1">{label}</span>
    </div>
  )
}
