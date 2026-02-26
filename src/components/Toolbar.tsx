import { useState } from 'react';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger } from './ui/select';
import { Play, Pause, RotateCcw, Download } from 'lucide-react';
import type { StatsSummary } from '../types/ui';

type ToolbarProps = {
  running: boolean;
  onToggleRunning: () => void;
  onResetSimulation: () => void;
  stats: StatsSummary;
  onExportPng: () => void;
  onExportSvg: () => void;
  onExportMp4: () => void;
  exportError: string | null;
  isExportingMp4: boolean;
  onDismissExportError: () => void;
  hasFrameSelection?: boolean;
  selectedFramesCount?: number;
};

type ExportFormat = 'png' | 'svg' | 'mp4';

const exportFormatLabels: Record<ExportFormat, string> = {
  png: 'PNG',
  svg: 'SVG',
  mp4: 'MP4',
};

export default function Toolbar({
  running,
  onToggleRunning,
  onResetSimulation,
  stats,
  onExportPng,
  onExportSvg,
  onExportMp4,
  exportError,
  isExportingMp4,
  onDismissExportError,
}: ToolbarProps) {
  const [exportFormat, setExportFormat] = useState<ExportFormat>('png');

  const handleExport = () => {
    if (exportFormat === 'png') {
      onExportPng();
      return;
    }
    if (exportFormat === 'svg') {
      onExportSvg();
      return;
    }
    onExportMp4();
  };

  const exportLabel =
    exportFormat === 'mp4' && isExportingMp4
      ? 'Exporting MP4...'
      : `Export ${exportFormatLabels[exportFormat]}`;

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2">
      <div className="flex h-12 items-center gap-3 rounded-full border border-border bg-surface/80 pl-1 pr-4 backdrop-blur-md shadow-lg">
        <div className="flex items-center gap-1.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-surface/70 shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]">
            <Button
              onClick={onToggleRunning}
              variant={running ? 'secondary' : 'primary'}
              size="icon"
              className="rounded-full h-8 w-8"
              aria-label={running ? 'Pause' : 'Run'}
            >
              {running ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4 ml-0.5" />
              )}
            </Button>
          </div>
          <Button
            onClick={onResetSimulation}
            variant="ghost"
            size="icon"
            className="rounded-full h-8 w-8"
            aria-label="Reset"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        <div className="h-4 w-px bg-border"></div>

        <div className="flex items-center gap-4 text-[11px] font-mono tracking-widest text-muted uppercase">
          <div className="flex flex-col items-center">
            <span className="text-[9px] opacity-70">Nodes</span>
            <span className="text-foreground">{stats.nodes}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[9px] opacity-70">Targets</span>
            <span className="text-foreground">{stats.attractors}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[9px] opacity-70">Status</span>
            <span
              className={stats.completed ? 'text-primary' : 'text-foreground'}
            >
              {stats.completed ? 'Done' : 'Grow'}
            </span>
          </div>
        </div>

        <div className="h-4 w-px bg-border"></div>

        <div className="flex items-center gap-1">
          <Button
            onClick={handleExport}
            variant="secondary"
            size="compact"
            className="h-8 rounded-l-full rounded-r-[10px] border-r-0 px-3.5"
            aria-label={exportLabel}
            disabled={exportFormat === 'mp4' && isExportingMp4}
          >
            <Download className="h-4 w-4" />
            <span>{exportLabel}</span>
          </Button>
          <Select
            value={exportFormat}
            onValueChange={(value) => setExportFormat(value as ExportFormat)}
          >
            <SelectTrigger
              className="h-8 w-8 rounded-l-[10px] rounded-r-full border-l border-l-border/70 bg-surface/50 px-0 text-muted hover:text-foreground justify-center"
              aria-label="Select export format"
            >
              <span className="sr-only">Select export format</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="png">PNG - Raster image</SelectItem>
              <SelectItem value="svg">SVG - Vector graphic</SelectItem>
              <SelectItem value="mp4">MP4 - Animated video</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {exportError && (
        <div className="flex items-center gap-2 rounded-full border border-red-500/40 bg-red-500/10 px-4 py-1.5 text-xs text-red-200 backdrop-blur-md shadow-md">
          <span>{exportError}</span>
          <Button
            variant="ghost"
            size="compact"
            onClick={onDismissExportError}
            className="h-5 px-1.5 rounded-full text-[10px] hover:bg-red-500/20"
          >
            Dismiss
          </Button>
        </div>
      )}
    </div>
  );
}
