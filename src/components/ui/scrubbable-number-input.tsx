import { useEffect, useRef } from 'react'
import { Input } from './input'

type ScrubbableNumberInputProps = {
  value: number
  onValueChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  integer?: boolean
  className?: string
  disabled?: boolean
}

const PX_PER_STEP = 4

export function ScrubbableNumberInput({
  value,
  onValueChange,
  min,
  max,
  step = 1,
  integer = false,
  className,
  disabled = false
}: ScrubbableNumberInputProps) {
  const startRef = useRef<{ x: number; value: number } | null>(null)
  const pointerIdRef = useRef<number | null>(null)

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
    if (step > 0) {
      return Math.round(next / step) * step
    }
    return next
  }

  const getMultiplier = (event: PointerEvent) => {
    if (event.shiftKey) return 10
    if (event.altKey) return 0.1
    return 1
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLInputElement>) => {
    if (disabled) return
    if (event.button !== 0) return
    startRef.current = { x: event.clientX, value }
    pointerIdRef.current = event.pointerId
    event.currentTarget.setPointerCapture(event.pointerId)
    document.body.style.cursor = 'ew-resize'
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLInputElement>) => {
    if (disabled) return
    if (!startRef.current || pointerIdRef.current !== event.pointerId) return
    const delta = event.clientX - startRef.current.x
    const multiplier = getMultiplier(event.nativeEvent)
    const raw = startRef.current.value + (delta / PX_PER_STEP) * step * multiplier
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
    const nextValue = Number(event.target.value)
    if (Number.isNaN(nextValue)) return
    onValueChange(clamp(snap(nextValue)))
  }

  return (
    <Input
      type="number"
      value={value}
      onChange={handleChange}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      className={className}
      inputMode="decimal"
      disabled={disabled}
    />
  )
}
