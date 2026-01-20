export type Unit = 'in' | 'cm'

export const UNIT_LABELS: Record<Unit, string> = {
  in: 'in',
  cm: 'cm'
}

export function unitsToPx(value: number, unit: Unit, dpi: number): number {
  if (unit === 'in') {
    return value * dpi
  }
  return (value * dpi) / 2.54
}

export function pxToUnits(value: number, unit: Unit, dpi: number): number {
  if (unit === 'in') {
    return value / dpi
  }
  return (value * 2.54) / dpi
}
