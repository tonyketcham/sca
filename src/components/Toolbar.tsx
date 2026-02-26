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

  const isExportingSelectedMp4 = exportFormat === 'mp4' && isExportingMp4;
  const exportAriaLabel = isExportingSelectedMp4
    ? 'Exporting MP4'
    : `Export ${exportFormatLabels[exportFormat]}`;

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2">
      <div className="flex h-12 items-center gap-3 rounded-full border border-border bg-surface/80 pl-1 pr-1 backdrop-blur-md shadow-lg">
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

        <div className="flex h-10 items-center rounded-full border border-border/70 bg-surface/70 p-0.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]">
          <Button
            onClick={handleExport}
            variant="ghost"
            size="compact"
            className="h-8 w-32 rounded-full px-3 whitespace-nowrap text-foreground hover:bg-surfaceHover/80"
            aria-label={exportAriaLabel}
            disabled={isExportingSelectedMp4}
          >
            <Download className="h-4 w-4 text-muted" />
            <span>{isExportingSelectedMp4 ? 'Exporting...' : 'Export'}</span>
            {!isExportingSelectedMp4 && (
              <span className="text-foreground">
                {exportFormatLabels[exportFormat]}
              </span>
            )}
          </Button>
          <Select
            value={exportFormat}
            onValueChange={(value) => setExportFormat(value as ExportFormat)}
          >
            <SelectTrigger
              className="h-8 w-8 rounded-full border-transparent border-l-border/70 bg-transparent px-0 text-muted shadow-none hover:bg-surfaceHover/70 hover:text-foreground focus-visible:ring-primary/50 justify-center"
              aria-label="Select export format"
            >
              <span className="sr-only">Select export format</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="png">PNG</SelectItem>
              <SelectItem value="svg">SVG</SelectItem>
              <SelectItem value="mp4">MP4</SelectItem>
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
