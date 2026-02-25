import { Button } from './ui/button';
import {
  Play,
  Pause,
  RotateCcw,
  Image as ImageIcon,
  Video,
  Download,
} from 'lucide-react';
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
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2">
      <div className="flex h-12 items-center gap-4 rounded-full border border-border bg-surface/80 px-4 backdrop-blur-md shadow-lg">
        <div className="flex items-center gap-2">
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

        <div className="flex items-center gap-2">
          <Button
            onClick={onExportPng}
            variant="ghost"
            size="icon"
            className="rounded-full h-8 w-8"
            title="Export PNG"
          >
            <ImageIcon className="h-4 w-4" />
          </Button>
          <Button
            onClick={onExportSvg}
            variant="ghost"
            size="icon"
            className="rounded-full h-8 w-8"
            title="Export SVG"
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            onClick={onExportMp4}
            variant="secondary"
            size="compact"
            className="rounded-full h-8 px-3 gap-1.5"
            disabled={isExportingMp4}
          >
            <Video className="h-4 w-4" />
            <span className="hidden sm:inline">
              {isExportingMp4 ? 'Exporting...' : 'MP4'}
            </span>
          </Button>
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
