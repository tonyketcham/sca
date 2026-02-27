import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '../../lib/utils';
import { Input } from './input';

type ScrubCoarseness = 'fine' | 'normal' | 'coarse';

type ScrubbableNumberInputProps = {
  value: number | null;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  coarseness?: ScrubCoarseness;
  integer?: boolean;
  id?: string;
  name?: string;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
};

type ScrubFeedbackState = {
  isActive: boolean;
  deltaPx: number;
  edgePressure: number;
};

const PX_PER_STEP_BY_COARSENESS: Record<ScrubCoarseness, number> = {
  fine: 8,
  normal: 4,
  coarse: 2,
};

const RUBBER_BAND_PX = 72;
const SCRUB_PREVIEW_DISTANCE_PX = 140;
const SCRUB_PREVIEW_MAX_WIDTH_PERCENT = 44;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const rubberBandDistance = (distancePx: number) =>
  (distancePx * RUBBER_BAND_PX) / (distancePx + RUBBER_BAND_PX);

export function ScrubbableNumberInput({
  value,
  onValueChange,
  min,
  max,
  step = 1,
  coarseness = 'normal',
  integer = false,
  id,
  name,
  className,
  disabled = false,
  placeholder,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
}: ScrubbableNumberInputProps) {
  const startRef = useRef<{ x: number; value: number } | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const [scrubFeedback, setScrubFeedback] = useState<ScrubFeedbackState>({
    isActive: false,
    deltaPx: 0,
    edgePressure: 0,
  });
  const normalizedStep = Number.isFinite(step) && step > 0 ? step : 1;
  const minValue = typeof min === 'number' && Number.isFinite(min) ? min : null;
  const maxValue = typeof max === 'number' && Number.isFinite(max) ? max : null;
  const pxPerStep = useMemo(
    () => PX_PER_STEP_BY_COARSENESS[coarseness],
    [coarseness],
  );
  const boundedRange = useMemo(() => {
    if (minValue === null || maxValue === null || maxValue <= minValue) {
      return null;
    }
    return { min: minValue, max: maxValue, span: maxValue - minValue };
  }, [maxValue, minValue]);
  const boundedProgress = useMemo(() => {
    if (boundedRange === null || value === null || !Number.isFinite(value)) {
      return null;
    }
    return clamp01((value - boundedRange.min) / boundedRange.span);
  }, [boundedRange, value]);

  useEffect(() => {
    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, []);

  const clamp = (next: number) => {
    if (minValue !== null) {
      next = Math.max(minValue, next);
    }
    if (maxValue !== null) {
      next = Math.min(maxValue, next);
    }
    return next;
  };

  const snap = (next: number) => {
    if (integer) {
      return Math.round(next);
    }
    if (normalizedStep > 0) {
      return Math.round(next / normalizedStep) * normalizedStep;
    }
    return next;
  };

  const getMultiplier = (event: PointerEvent) => {
    if (event.shiftKey) return 10;
    if (event.altKey) return 0.1;
    return 1;
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled || value === null) return;
    if (!Number.isFinite(value)) return;
    if (event.button !== 0) return;
    event.preventDefault();
    startRef.current = { x: event.clientX, value };
    pointerIdRef.current = event.pointerId;
    setScrubFeedback({ isActive: true, deltaPx: 0, edgePressure: 0 });
    event.currentTarget.setPointerCapture(event.pointerId);
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled || value === null) return;
    if (!startRef.current || pointerIdRef.current !== event.pointerId) return;
    event.preventDefault();
    const delta = event.clientX - startRef.current.x;
    const multiplier = getMultiplier(event.nativeEvent);
    const valuePerPixel = (normalizedStep * multiplier) / pxPerStep;
    const raw =
      startRef.current.value +
      (delta / pxPerStep) * normalizedStep * multiplier;
    let edgePressure = 0;

    if (minValue !== null && raw < minValue && valuePerPixel > 0) {
      const overshootPx = (minValue - raw) / valuePerPixel;
      edgePressure = -clamp01(rubberBandDistance(overshootPx) / 30);
    } else if (maxValue !== null && raw > maxValue && valuePerPixel > 0) {
      const overshootPx = (raw - maxValue) / valuePerPixel;
      edgePressure = clamp01(rubberBandDistance(overshootPx) / 30);
    }

    setScrubFeedback({
      isActive: true,
      deltaPx: delta,
      edgePressure,
    });

    const next = clamp(snap(raw));
    const roundedNext = Number(next.toFixed(4));
    if (roundedNext !== value) {
      onValueChange(roundedNext);
    }
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (pointerIdRef.current !== event.pointerId) return;
    startRef.current = null;
    pointerIdRef.current = null;
    setScrubFeedback({ isActive: false, deltaPx: 0, edgePressure: 0 });
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const rawValue = event.target.value.trim();
    if (rawValue.length === 0) return;
    const nextValue = Number(rawValue);
    if (!Number.isFinite(nextValue)) return;
    onValueChange(clamp(snap(nextValue)));
  };

  const scrubPreviewMagnitude = clamp01(
    Math.abs(scrubFeedback.deltaPx) / SCRUB_PREVIEW_DISTANCE_PX,
  );
  const scrubPreviewWidthPercent =
    scrubPreviewMagnitude * SCRUB_PREVIEW_MAX_WIDTH_PERCENT;
  const scrubPreviewLeftPercent =
    scrubFeedback.deltaPx >= 0 ? 50 : 50 - scrubPreviewWidthPercent;

  const valueBarLeftPercent =
    boundedProgress === null ? scrubPreviewLeftPercent : 0;
  const valueBarWidthPercent =
    boundedProgress === null
      ? scrubFeedback.isActive
        ? Math.max(2, scrubPreviewWidthPercent)
        : 0
      : boundedProgress * 100;
  const valueBarOpacity =
    boundedProgress === null
      ? scrubFeedback.isActive
        ? 0.82
        : 0
      : scrubFeedback.isActive
        ? 0.9
        : 0.7;
  const edgePressureMagnitude = Math.abs(scrubFeedback.edgePressure);
  const edgeGlowWidthPercent = 8 + edgePressureMagnitude * 16;
  const showEdgeGlow = scrubFeedback.isActive && edgePressureMagnitude > 0.01;

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-y-[2px] left-7 right-[2px] z-0 overflow-hidden rounded-r-[5px]">
        <div className="absolute inset-x-0 bottom-[1px] h-px bg-border/40" />
        <div
          className={cn(
            'absolute bottom-[2px] top-[52%] rounded-[4px] transition-[left,width,opacity] duration-200 ease-out-expo',
            disabled && 'opacity-40',
          )}
          style={{
            left: `${valueBarLeftPercent}%`,
            width: `${valueBarWidthPercent}%`,
            opacity: valueBarOpacity,
            backgroundImage:
              'linear-gradient(90deg, oklch(var(--primary) / 0.22), oklch(var(--primary-hover) / 0.16))',
          }}
        />
        {showEdgeGlow && (
          <div
            className="absolute bottom-[2px] top-[52%] transition-all duration-150 ease-out-expo"
            style={{
              width: `${edgeGlowWidthPercent}%`,
              opacity: edgePressureMagnitude * 0.85,
              ...(scrubFeedback.edgePressure < 0
                ? { left: '0%' }
                : { right: '0%' }),
              backgroundImage:
                scrubFeedback.edgePressure < 0
                  ? 'linear-gradient(90deg, oklch(var(--primary-hover) / 0.32), transparent)'
                  : 'linear-gradient(270deg, oklch(var(--primary-hover) / 0.32), transparent)',
            }}
          />
        )}
      </div>
      <button
        type="button"
        tabIndex={-1}
        aria-label="Scrub value"
        disabled={disabled || value === null}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onLostPointerCapture={() => {
          startRef.current = null;
          pointerIdRef.current = null;
          setScrubFeedback({ isActive: false, deltaPx: 0, edgePressure: 0 });
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
        }}
        className={cn(
          'absolute left-0 top-0 z-10 flex h-full w-6 items-center justify-center rounded-l-md border-r border-border/70 text-muted/70 transition-[color,background-color,border-color,transform,box-shadow] duration-300 ease-out-expo touch-none',
          'cursor-ew-resize hover:text-foreground/90 hover:bg-background/80 active:bg-background active:scale-[0.985]',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:border-primary/50',
          scrubFeedback.isActive &&
            'bg-background/85 text-foreground/95 shadow-[inset_0_1px_0_oklch(var(--foreground)/0.06)]',
          'disabled:cursor-not-allowed disabled:text-muted/40 disabled:hover:bg-transparent',
        )}
        style={{
          transform:
            scrubFeedback.edgePressure === 0
              ? undefined
              : `translateX(${scrubFeedback.edgePressure * 1.75}px) scaleX(${
                  1 - edgePressureMagnitude * 0.045
                })`,
        }}
      >
        <span className="pointer-events-none flex items-center gap-[2px]">
          <span className="h-3 w-px rounded-full bg-current opacity-80" />
          <span className="h-3 w-px rounded-full bg-current opacity-90" />
          <span className="h-3 w-px rounded-full bg-current opacity-80" />
        </span>
      </button>

      <Input
        id={id}
        name={name}
        type="number"
        value={value ?? ''}
        placeholder={placeholder}
        onChange={handleChange}
        className={cn('relative z-[1] pl-7 bg-background/45', className)}
        inputMode={integer ? 'numeric' : 'decimal'}
        disabled={disabled}
        min={min}
        max={max}
        step={integer ? 1 : normalizedStep}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
      />
    </div>
  );
}
