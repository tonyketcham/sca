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
  includeCanvasUi?: boolean;
  selectedFrameIndices?: number[];
};

export function exportCompositeSvg(options: CompositeSvgOptions): string {
  const {
    states,
    frames,
    grid,
    unit,
    widthInUnits,
    heightInUnits,
    includeCanvasUi,
    selectedFrameIndices,
  } = options;
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

  const selectedSet = new Set(selectedFrameIndices ?? []);
  const frameBorders = includeCanvasUi
    ? grid.cells
        .map((cell, index) => {
          if (!frames[index]) return '';
          return `<rect x="${cell.offset.x.toFixed(2)}" y="${cell.offset.y.toFixed(2)}" width="${cell.bounds.width.toFixed(2)}" height="${cell.bounds.height.toFixed(2)}" fill="none" stroke="#7f858f" stroke-opacity="0.6" stroke-width="0.5" />`;
        })
        .join('')
    : '';
  const selectionReticles = includeCanvasUi
    ? grid.cells
        .map((cell, index) => {
          if (!frames[index] || !selectedSet.has(index)) return '';
          const reticlePath = buildSelectionReticlePath(
            cell.offset.x,
            cell.offset.y,
            cell.bounds.width,
            cell.bounds.height,
          );
          return `<path d="${reticlePath}" fill="none" stroke="#78b98a" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round" />`;
        })
        .join('')
    : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${widthInUnits}${unitLabel}" height="${heightInUnits}${unitLabel}" viewBox="0 0 ${widthPx} ${heightPx}">
  <rect width="${widthPx}" height="${heightPx}" fill="#ffffff" />
  ${obstacleGroups}
  ${rootGroups}
  ${frameBorders}
  ${selectionReticles}
</svg>`;
}

function buildSelectionReticlePath(
  x: number,
  y: number,
  width: number,
  height: number,
): string {
  const offset = 5;
  const minDimension = Math.min(width, height);
  const cornerLength = Math.min(
    Math.max(minDimension * 0.16, 10),
    minDimension * 0.45,
    26,
  );
  const left = x - offset;
  const top = y - offset;
  const right = x + width + offset;
  const bottom = y + height + offset;
  return [
    // Top-left corner
    `M ${(left + cornerLength).toFixed(2)} ${top.toFixed(2)}`,
    `L ${left.toFixed(2)} ${top.toFixed(2)}`,
    `L ${left.toFixed(2)} ${(top + cornerLength).toFixed(2)}`,
    // Top-right corner
    `M ${(right - cornerLength).toFixed(2)} ${top.toFixed(2)}`,
    `L ${right.toFixed(2)} ${top.toFixed(2)}`,
    `L ${right.toFixed(2)} ${(top + cornerLength).toFixed(2)}`,
    // Bottom-right corner
    `M ${right.toFixed(2)} ${(bottom - cornerLength).toFixed(2)}`,
    `L ${right.toFixed(2)} ${bottom.toFixed(2)}`,
    `L ${(right - cornerLength).toFixed(2)} ${bottom.toFixed(2)}`,
    // Bottom-left corner
    `M ${(left + cornerLength).toFixed(2)} ${bottom.toFixed(2)}`,
    `L ${left.toFixed(2)} ${bottom.toFixed(2)}`,
    `L ${left.toFixed(2)} ${(bottom - cornerLength).toFixed(2)}`,
  ].join(' ');
}
