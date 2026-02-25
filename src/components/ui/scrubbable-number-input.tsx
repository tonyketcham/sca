import { useEffect, useRef } from 'react'
import { Input } from './input'

type ScrubbableNumberInputProps = {
  value: number | null
  onValueChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  integer?: boolean
  id?: string
  name?: string
  className?: string
  disabled?: boolean
  placeholder?: string
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
}

const PX_PER_STEP = 4

export function ScrubbableNumberInput({
  value,
  onValueChange,
  min,
  max,
  step = 1,
  integer = false,
  id,
  name,
  className,
  disabled = false,
  placeholder,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy
}: ScrubbableNumberInputProps) {
  const startRef = useRef<{ x: number; value: number } | null>(null)
  const pointerIdRef = useRef<number | null>(null)
  const normalizedStep = Number.isFinite(step) && step > 0 ? step : 1

  useEffect(() => {
    return () => {
      document.body.style.cursor = ''
    }
  }, [])

  const clamp = (next: number) => {
    if (typeof min === 'number') {
      next = Math.max(min, next)
    }
    if (typeof max === 'number') {
      next = Math.min(max, next)
    }
    return next
  }

  const snap = (next: number) => {
    if (integer) {
      return Math.round(next)
    }
    if (normalizedStep > 0) {
      return Math.round(next / normalizedStep) * normalizedStep
    }
    return next
  }

  const getMultiplier = (event: PointerEvent) => {
    if (event.shiftKey) return 10
    if (event.altKey) return 0.1
    return 1
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLInputElement>) => {
    if (disabled || value === null) return
    if (!Number.isFinite(value)) return
    if (event.button !== 0) return
    startRef.current = { x: event.clientX, value }
    pointerIdRef.current = event.pointerId
    event.currentTarget.setPointerCapture(event.pointerId)
    document.body.style.cursor = 'ew-resize'
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLInputElement>) => {
    if (disabled || value === null) return
    if (!startRef.current || pointerIdRef.current !== event.pointerId) return
    const delta = event.clientX - startRef.current.x
    const multiplier = getMultiplier(event.nativeEvent)
    const raw =
      startRef.current.value + (delta / PX_PER_STEP) * normalizedStep * multiplier
    const next = clamp(snap(raw))
    onValueChange(Number(next.toFixed(4)))
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLInputElement>) => {
    if (disabled) return
    if (pointerIdRef.current !== event.pointerId) return
    startRef.current = null
    pointerIdRef.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
    document.body.style.cursor = ''
  }

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return
    const rawValue = event.target.value.trim()
    if (rawValue.length === 0) return
    const nextValue = Number(rawValue)
    if (!Number.isFinite(nextValue)) return
    onValueChange(clamp(snap(nextValue)))
  }

  return (
    <Input
      id={id}
      name={name}
      type="number"
      value={value ?? ''}
      placeholder={placeholder}
      onChange={handleChange}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={className}
      inputMode={integer ? 'numeric' : 'decimal'}
      disabled={disabled}
      min={min}
      max={max}
      step={integer ? 1 : normalizedStep}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
    />
  )
}
