import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger } from './ui/select';
import { Play, Pause, RotateCcw, Download } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { cn } from '../lib/utils';
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

const statTransitionDurationMs = 220;
const easeOutExpo = [0.16, 1, 0.3, 1] as const;

const toolbarEntryVariants = {
  hidden: { opacity: 0, y: -14, filter: 'blur(4px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      duration: 0.56,
      ease: easeOutExpo,
      when: 'beforeChildren',
      delayChildren: 0.06,
      staggerChildren: 0.07,
    },
  },
};

const toolbarGroupVariants = {
  hidden: { opacity: 0, y: 6, scale: 0.985 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.36, ease: easeOutExpo },
  },
};

const statsContainerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.05,
    },
  },
};

const statItemVariants = {
  hidden: { opacity: 0, y: 4 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, ease: easeOutExpo },
  },
};

type AnimatedStatValueProps = {
  value: number;
  prefersReducedMotion: boolean;
};

function AnimatedStatValue({
  value,
  prefersReducedMotion,
}: AnimatedStatValueProps) {
  const [currentValue, setCurrentValue] = useState(value);
  const [outgoingValue, setOutgoingValue] = useState<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (value === currentValue) {
      return undefined;
    }

    if (prefersReducedMotion) {
      setCurrentValue(value);
      setOutgoingValue(null);
      setIsAnimating(false);
      return undefined;
    }

    setOutgoingValue(currentValue);
    setCurrentValue(value);
    setIsAnimating(true);

    const timeoutId = window.setTimeout(() => {
      setIsAnimating(false);
      setOutgoingValue(null);
    }, statTransitionDurationMs);

    return () => window.clearTimeout(timeoutId);
  }, [currentValue, prefersReducedMotion, value]);

  return (
    <span className="relative inline-grid h-[1.1em] min-w-[4ch] place-items-center tabular-nums">
      {outgoingValue !== null && (
        <span
          className={cn(
            'col-start-1 row-start-1 transition-all duration-200 ease-out-expo',
            isAnimating
              ? '-translate-y-1 opacity-0'
              : 'translate-y-0 opacity-100',
          )}
        >
          {outgoingValue}
        </span>
      )}
      <span
        className={cn(
          'col-start-1 row-start-1 text-foreground transition-all duration-200 ease-out-expo',
          isAnimating && 'translate-y-[1px] text-primary',
        )}
      >
        {currentValue}
      </span>
    </span>
  );
}

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
  const prefersReducedMotion = useReducedMotion() ?? false;
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
      <motion.div
        className="flex flex-col items-center gap-2"
        initial={prefersReducedMotion ? false : 'hidden'}
        animate="visible"
        variants={toolbarEntryVariants}
      >
        <motion.div
          className="flex h-12 items-center gap-3 rounded-full border border-border bg-surface pl-1 pr-1 shadow-lg"
          variants={toolbarGroupVariants}
        >
          <motion.div
            className="flex items-center gap-1.5"
            variants={toolbarGroupVariants}
          >
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
          </motion.div>

          <motion.div
            className="h-4 w-px bg-border"
            variants={toolbarGroupVariants}
          ></motion.div>

          <motion.div
            className="flex items-center gap-4 text-[11px] font-mono tracking-widest text-muted uppercase"
            variants={statsContainerVariants}
          >
            <motion.div
              className="flex flex-col items-center"
              variants={statItemVariants}
            >
              <span className="text-[9px] opacity-70">Nodes</span>
              <AnimatedStatValue
                value={stats.nodes}
                prefersReducedMotion={prefersReducedMotion}
              />
            </motion.div>
            <motion.div
              className="flex flex-col items-center"
              variants={statItemVariants}
            >
              <span className="text-[9px] opacity-70">Targets</span>
              <AnimatedStatValue
                value={stats.attractors}
                prefersReducedMotion={prefersReducedMotion}
              />
            </motion.div>
            <motion.div
              className="flex flex-col items-center"
              variants={statItemVariants}
            >
              <span className="text-[9px] opacity-70">Status</span>
              <span
                className={cn(
                  'transition-colors duration-300 ease-out-expo',
                  stats.completed ? 'text-primary' : 'text-foreground',
                )}
              >
                {stats.completed ? 'Done' : 'Grow'}
              </span>
            </motion.div>
          </motion.div>

          <motion.div
            className="h-4 w-px bg-border"
            variants={toolbarGroupVariants}
          ></motion.div>

          <motion.div
            className="flex h-10 items-center rounded-full border border-border/70 bg-surface/70 p-0.5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]"
            variants={toolbarGroupVariants}
          >
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
                className="h-8 w-8 justify-center rounded-full border-transparent border-l-border/70 bg-transparent px-0 text-muted shadow-none transition-colors duration-300 ease-out-expo hover:bg-surfaceHover/70 hover:text-foreground focus-visible:ring-primary/50 data-[state=open]:bg-surfaceHover/80 data-[state=open]:text-foreground [&>svg]:transition-transform [&>svg]:duration-300 [&>svg]:ease-out-expo data-[state=open]:[&>svg]:rotate-180"
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
          </motion.div>
        </motion.div>

        {exportError && (
          <motion.div
            className="flex items-center gap-2 rounded-full border border-red-500/40 bg-red-500/10 px-4 py-1.5 text-xs text-red-200 backdrop-blur-md shadow-md"
            variants={toolbarGroupVariants}
          >
            <span>{exportError}</span>
            <Button
              variant="ghost"
              size="compact"
              onClick={onDismissExportError}
              className="h-5 px-1.5 rounded-full text-[10px] hover:bg-red-500/20"
            >
              Dismiss
            </Button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
