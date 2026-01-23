import type { SimulationState } from '../engine/simulationState'
import type { RenderSettings } from '../render/canvasRenderer'
import { UNIT_LABELS, type Unit } from '../geometry/units'

export function exportSvg(
  state: SimulationState,
  unit: Unit,
  widthInUnits: number,
  heightInUnits: number,
  settings: RenderSettings
): string {
  const widthPx = state.bounds.width
  const heightPx = state.bounds.height
  const unitLabel = UNIT_LABELS[unit]

  const lines = state.nodes
    .map((node) => {
      if (node.parent === null) return null
      const parent = state.nodes[node.parent]
      return `<line x1="${parent.x.toFixed(2)}" y1="${parent.y.toFixed(2)}" x2="${node.x.toFixed(
        2
      )}" y2="${node.y.toFixed(2)}" />`
    })
    .filter(Boolean)
    .join('')

  const obstaclePaths = settings.showObstacles
    ? state.obstacles
        .map((polygon) => {
          const path = polygon
            .map(
              (point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`
            )
            .join(' ')
          return `<path d="${path} Z" />`
        })
        .join('')
    : ''

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${widthInUnits}${unitLabel}" height="${heightInUnits}${unitLabel}" viewBox="0 0 ${widthPx} ${heightPx}">
  <rect width="${widthPx}" height="${heightPx}" fill="#ffffff" />
  ${settings.showObstacles ? `<g fill="${settings.obstacleFill}" fill-opacity="1">${obstaclePaths}</g>` : ''}
  <g stroke="${settings.rootColor}" stroke-width="${settings.strokeWidth}" stroke-linecap="round" fill="none">
    ${lines}
  </g>
</svg>`
}
