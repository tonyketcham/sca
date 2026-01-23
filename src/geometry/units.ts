export type Unit = 'in' | 'cm' | 'mm'

export const UNIT_LABELS: Record<Unit, string> = {
  in: 'in',
  cm: 'cm',
  mm: 'mm'
}

export function unitsToPx(value: number, unit: Unit, dpi: number): number {
  if (unit === 'in') {
    return value * dpi
  }
  if (unit === 'cm') {
    return (value * dpi) / 2.54
  }
  return (value * dpi) / 25.4
}

export function pxToUnits(value: number, unit: Unit, dpi: number): number {
  if (unit === 'in') {
    return value / dpi
  }
  if (unit === 'cm') {
    return (value * 2.54) / dpi
  }
  return (value * 25.4) / dpi
}
