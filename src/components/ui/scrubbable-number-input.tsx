import { useEffect, useMemo, useRef } from 'react';
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

const PX_PER_STEP_BY_COARSENESS: Record<ScrubCoarseness, number> = {
  fine: 8,
  normal: 4,
  coarse: 2,
};

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
  const normalizedStep = Number.isFinite(step) && step > 0 ? step : 1;
  const pxPerStep = useMemo(
    () => PX_PER_STEP_BY_COARSENESS[coarseness],
    [coarseness],
  );

  useEffect(() => {
    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, []);

  const clamp = (next: number) => {
    if (typeof min === 'number') {
      next = Math.max(min, next);
    }
    if (typeof max === 'number') {
      next = Math.min(max, next);
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
    const raw =
      startRef.current.value +
      (delta / pxPerStep) * normalizedStep * multiplier;
    const next = clamp(snap(raw));
    onValueChange(Number(next.toFixed(4)));
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (pointerIdRef.current !== event.pointerId) return;
    startRef.current = null;
    pointerIdRef.current = null;
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

  return (
    <div className="relative">
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
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
        }}
        className={cn(
          'absolute left-0 top-0 z-10 flex h-full w-6 items-center justify-center rounded-l-md border-r border-border/70 text-muted/70 transition-colors duration-300 ease-out-expo touch-none',
          'cursor-ew-resize hover:text-foreground/90 hover:bg-background/80 active:bg-background',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:border-primary/50',
          'disabled:cursor-not-allowed disabled:text-muted/40 disabled:hover:bg-transparent',
        )}
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
        className={cn('pl-7', className)}
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
