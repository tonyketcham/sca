import type { SimulationState } from '../engine/simulationState';
import type { RenderSettings, GridLayout } from '../render/canvasRenderer';
import { UNIT_LABELS, type Unit } from '../geometry/units';
import type { FrameConfig } from '../types/ui';

export function exportSvg(
  state: SimulationState,
  unit: Unit,
  widthInUnits: number,
  heightInUnits: number,
  settings: RenderSettings,
): string {
  const widthPx = state.bounds.width;
  const heightPx = state.bounds.height;
  const unitLabel = UNIT_LABELS[unit];

  const lines = state.nodes
    .map((node) => {
      if (node.parent === null) return null;
      const parent = state.nodes[node.parent];
      return `<line x1="${parent.x.toFixed(2)}" y1="${parent.y.toFixed(2)}" x2="${node.x.toFixed(
        2,
      )}" y2="${node.y.toFixed(2)}" />`;
    })
    .filter(Boolean)
    .join('');

  const obstaclePaths = settings.showObstacles
    ? state.obstacles
        .map((polygon) => {
          const path = polygon
            .map(
              (point, index) =>
                `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`,
            )
            .join(' ');
          return `<path d="${path} Z" />`;
        })
        .join('')
    : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${widthInUnits}${unitLabel}" height="${heightInUnits}${unitLabel}" viewBox="0 0 ${widthPx} ${heightPx}">
  <rect width="${widthPx}" height="${heightPx}" fill="#ffffff" />
  ${settings.showObstacles ? `<g fill="${settings.obstacleFill}" fill-opacity="1">${obstaclePaths}</g>` : ''}
  <g stroke="${settings.rootColor}" stroke-width="${settings.strokeWidth}" stroke-linecap="round" fill="none">
    ${lines}
  </g>
</svg>`;
}

type CompositeSvgOptions = {
  states: SimulationState[];
  frames: FrameConfig[];
  grid: GridLayout;
  unit: Unit;
  widthInUnits: number;
  heightInUnits: number;
};

export function exportCompositeSvg(options: CompositeSvgOptions): string {
  const { states, frames, grid, unit, widthInUnits, heightInUnits } = options;
  const widthPx = grid.cellWidth * grid.cols;
  const heightPx = grid.cellHeight * grid.rows;
  const unitLabel = UNIT_LABELS[unit];

  const obstacleGroups = frames
    .map((frame, index) => {
      const state = states[index];
      const cell = grid.cells[index];
      if (!state || !cell || !frame.renderSettings.showObstacles) return '';
      const paths = state.obstacles
        .map((polygon) => {
          const path = polygon
            .map((point, pointIndex) => {
              const x = point.x + cell.offset.x;
              const y = point.y + cell.offset.y;
              return `${pointIndex === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
            })
            .join(' ');
          return `<path d="${path} Z" />`;
        })
        .join('');
      if (!paths) return '';
      return `<g fill="${frame.renderSettings.obstacleFill}" fill-opacity="1">${paths}</g>`;
    })
    .join('');

  const rootGroups = frames
    .map((frame, index) => {
      const state = states[index];
      const cell = grid.cells[index];
      if (!state || !cell) return '';
      const lines = state.nodes
        .map((node) => {
          if (node.parent === null) return null;
          const parent = state.nodes[node.parent];
          const x1 = parent.x + cell.offset.x;
          const y1 = parent.y + cell.offset.y;
          const x2 = node.x + cell.offset.x;
          const y2 = node.y + cell.offset.y;
          return `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(
            2,
          )}" />`;
        })
        .filter(Boolean)
        .join('');
      if (!lines) return '';
      return `<g stroke="${frame.renderSettings.rootColor}" stroke-width="${frame.renderSettings.strokeWidth}" stroke-linecap="round" fill="none">${lines}</g>`;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${widthInUnits}${unitLabel}" height="${heightInUnits}${unitLabel}" viewBox="0 0 ${widthPx} ${heightPx}">
  <rect width="${widthPx}" height="${heightPx}" fill="#ffffff" />
  ${obstacleGroups}
  ${rootGroups}
</svg>`;
}
