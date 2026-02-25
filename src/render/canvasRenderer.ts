import type { SimulationState, Vec2 } from '../engine/simulationState';
import type { FrameConfig, TemplateGridSettings } from '../types/ui';

export type ViewTransform = {
  pan: Vec2;
  zoom: number;
};

export type RenderSettings = {
  showAttractors: boolean;
  showNodes: boolean;
  showObstacles: boolean;
  strokeWidth: number;
  nodeRadius: number;
  rootColor: string;
  obstacleFill: string;
  attractorColor: string;
};

export type RenderOptions = {
  canvasWidth: number;
  canvasHeight: number;
  view: ViewTransform;
  mode: 'editor' | 'export';
  settings: RenderSettings;
};

export type GridLayout = {
  rows: number;
  cols: number;
  cellWidth: number;
  cellHeight: number;
  gutterPx: number;
  cells: Array<{
    index: number;
    row: number;
    col: number;
    offset: Vec2;
    bounds: SimulationState['bounds'];
  }>;
};

export type CompositeRenderOptions = {
  canvasWidth: number;
  canvasHeight: number;
  view: ViewTransform;
  mode: 'editor' | 'export';
  grid: GridLayout;
  frames: FrameConfig[];
  templateGrid?: TemplateGridSettings;
  hoveredFrameIndex?: number | null;
  selectedFrameIndices?: number[];
};

export function renderSimulation(
  ctx: CanvasRenderingContext2D,
  state: SimulationState,
  options: RenderOptions,
): void {
  const { canvasWidth, canvasHeight, view, settings, mode } = options;
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  if (mode === 'editor') {
    ctx.fillStyle = 'var(--app-bg, #0a0f16)';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  }

  const origin = getArtboardOrigin(
    canvasWidth,
    canvasHeight,
    state.bounds,
    view,
  );

  ctx.save();
  ctx.translate(origin.x, origin.y);
  ctx.scale(view.zoom, view.zoom);

  if (mode === 'editor') {
    ctx.save();
    // Using complex subtle shadows as defined in principles
    ctx.shadowColor = 'oklch(var(--background) / 0.8)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 12;
    ctx.fillStyle = 'oklch(var(--surface))';
    ctx.fillRect(0, 0, state.bounds.width, state.bounds.height);

    // Inner border for subtle depth
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'oklch(var(--border))';
    ctx.lineWidth = 1 / view.zoom;
    ctx.strokeRect(0, 0, state.bounds.width, state.bounds.height);
    ctx.restore();
  }

  if (settings.showObstacles) {
    drawObstacles(ctx, state, settings);
  }
  drawRoots(ctx, state, settings);

  if (settings.showNodes) {
    drawNodes(ctx, state, settings);
  }

  if (settings.showAttractors) {
    drawAttractors(ctx, state, settings);
  }

  ctx.restore();
}

export function renderComposite(
  ctx: CanvasRenderingContext2D,
  states: SimulationState[],
  options: CompositeRenderOptions,
): void {
  const {
    canvasWidth,
    canvasHeight,
    view,
    mode,
    grid,
    frames,
    templateGrid,
    hoveredFrameIndex,
    selectedFrameIndices,
  } = options;
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  if (mode === 'editor') {
    ctx.fillStyle = 'oklch(var(--background))';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  }

  const bounds = {
    width: grid.cellWidth * grid.cols,
    height: grid.cellHeight * grid.rows,
  };
  const origin = getArtboardOrigin(canvasWidth, canvasHeight, bounds, view);

  ctx.save();
  ctx.translate(origin.x, origin.y);
  ctx.scale(view.zoom, view.zoom);

  if (mode === 'editor') {
    ctx.save();
    // Complex shadow for depth
    ctx.shadowColor = 'oklch(0 0 0 / 0.5)';
    ctx.shadowBlur = 32;
    ctx.shadowOffsetY = 16;
    ctx.fillStyle = 'oklch(var(--surface))';
    ctx.fillRect(0, 0, bounds.width, bounds.height);
    ctx.restore();

    // Precise borders
    ctx.strokeStyle = 'oklch(var(--border))';
    ctx.lineWidth = 1 / view.zoom;
    ctx.strokeRect(0, 0, bounds.width, bounds.height);
  }

  const selectedSet = new Set(selectedFrameIndices ?? []);

  for (let index = 0; index < grid.cells.length; index += 1) {
    const cell = grid.cells[index];
    const state = states[index];
    const frame = frames[index];
    if (!cell || !state || !frame) continue;

    ctx.save();
    ctx.translate(cell.offset.x, cell.offset.y);
    renderFrame(ctx, state, frame.renderSettings, mode, view);
    if (mode === 'editor' && templateGrid?.showGutter && grid.gutterPx > 0) {
      const edges = {
        top: cell.row > 0,
        bottom: cell.row < grid.rows - 1,
        left: cell.col > 0,
        right: cell.col < grid.cols - 1,
      };
      drawGutterOverlay(
        ctx,
        state.bounds,
        grid.gutterPx * 0.5,
        frame.renderSettings.obstacleFill,
        edges,
      );
    }

    if (mode === 'editor') {
      const isSelected = selectedSet.has(index);
      const isHovered = hoveredFrameIndex === index;
      if (isSelected || isHovered) {
        drawSelectionOutline(ctx, state.bounds, view.zoom, {
          hovered: isHovered,
          selected: isSelected,
        });
      }
    }
    ctx.restore();
  }

  ctx.restore();
}

function drawSelectionOutline(
  ctx: CanvasRenderingContext2D,
  bounds: SimulationState['bounds'],
  zoom: number,
  state: { hovered: boolean; selected: boolean },
): void {
  ctx.save();
  // Ensure we render the hover state underneath the selected state if both are somehow active
  if (state.hovered && !state.selected) {
    ctx.strokeStyle = 'oklch(var(--border-hover))';
    ctx.lineWidth = 1 / zoom;
    ctx.strokeRect(0, 0, bounds.width, bounds.height);
  }
  if (state.selected) {
    // 2px primary border for selection to be prominent and tool-like
    ctx.strokeStyle = 'oklch(var(--primary))';
    ctx.lineWidth = 2 / zoom;
    // We adjust strokeRect to account for the stroke width on the outside or center
    // Standard strokeRect is centered, so we leave it as is, or we could inset it
    ctx.strokeRect(0, 0, bounds.width, bounds.height);

    // Add an inner ring for more tool-like precision
    ctx.strokeStyle = 'oklch(var(--background) / 0.5)';
    ctx.lineWidth = 1 / zoom;
    ctx.strokeRect(
      1 / zoom,
      1 / zoom,
      bounds.width - 2 / zoom,
      bounds.height - 2 / zoom,
    );
  }
  ctx.restore();
}

export function getArtboardOrigin(
  canvasWidth: number,
  canvasHeight: number,
  bounds: SimulationState['bounds'],
  view: ViewTransform,
): Vec2 {
  return {
    x: (canvasWidth - bounds.width * view.zoom) * 0.5 + view.pan.x,
    y: (canvasHeight - bounds.height * view.zoom) * 0.5 + view.pan.y,
  };
}

function renderFrame(
  ctx: CanvasRenderingContext2D,
  state: SimulationState,
  settings: RenderSettings,
  mode: 'editor' | 'export',
  view: ViewTransform,
): void {
  if (settings.showObstacles) {
    drawObstacles(ctx, state, settings);
  }
  drawRoots(ctx, state, settings);

  if (settings.showNodes) {
    drawNodes(ctx, state, settings);
  }

  if (settings.showAttractors) {
    drawAttractors(ctx, state, settings);
  }
  if (mode === 'editor') {
    // Make the grid frame borders more subtle and precise
    ctx.strokeStyle = 'oklch(var(--border) / 0.5)';
    ctx.lineWidth = 1 / view.zoom; // Keep it 1px visual regardless of zoom
    ctx.strokeRect(0, 0, state.bounds.width, state.bounds.height);
  }
}

function drawGutterOverlay(
  ctx: CanvasRenderingContext2D,
  bounds: SimulationState['bounds'],
  padding: number,
  fill: string,
  edges: { top: boolean; bottom: boolean; left: boolean; right: boolean },
): void {
  const inset = Math.min(
    Math.max(0, padding),
    bounds.width / 2,
    bounds.height / 2,
  );
  if (inset <= 0) return;
  ctx.save();

  // Use a subtle, sophisticated overlay for the gutters, using mix-blend-mode if needed
  // or a very specific transparent color that feels native
  ctx.globalAlpha = 0.8;
  // Darken the gutters slightly
  ctx.fillStyle = 'oklch(var(--surface-hover) / 0.8)';

  if (edges.top) {
    ctx.fillRect(0, 0, bounds.width, inset);
  }
  if (edges.bottom) {
    ctx.fillRect(0, bounds.height - inset, bounds.width, inset);
  }
  if (edges.left) {
    ctx.fillRect(0, inset, inset, bounds.height - inset * 2);
  }
  if (edges.right) {
    ctx.fillRect(bounds.width - inset, inset, inset, bounds.height - inset * 2);
  }
  ctx.restore();
}

function drawObstacles(
  ctx: CanvasRenderingContext2D,
  state: SimulationState,
  settings: RenderSettings,
): void {
  ctx.fillStyle = settings.obstacleFill;
  for (const polygon of state.obstacles) {
    if (polygon.length === 0) continue;
    ctx.beginPath();
    ctx.moveTo(polygon[0].x, polygon[0].y);
    for (let i = 1; i < polygon.length; i += 1) {
      ctx.lineTo(polygon[i].x, polygon[i].y);
    }
    ctx.closePath();
    ctx.fill();
  }
}

function drawRoots(
  ctx: CanvasRenderingContext2D,
  state: SimulationState,
  settings: RenderSettings,
): void {
  ctx.strokeStyle = settings.rootColor;
  ctx.lineWidth = settings.strokeWidth;
  ctx.lineCap = 'round';

  ctx.beginPath();
  for (let i = 0; i < state.nodes.length; i += 1) {
    const node = state.nodes[i];
    if (node.parent === null) continue;
    const parent = state.nodes[node.parent];
    ctx.moveTo(parent.x, parent.y);
    ctx.lineTo(node.x, node.y);
  }
  ctx.stroke();
}

function drawNodes(
  ctx: CanvasRenderingContext2D,
  state: SimulationState,
  settings: RenderSettings,
): void {
  ctx.fillStyle = settings.rootColor;
  for (const node of state.nodes) {
    ctx.beginPath();
    // Small nodes to keep the dense, tool-like precision feeling
    ctx.arc(node.x, node.y, settings.nodeRadius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawAttractors(
  ctx: CanvasRenderingContext2D,
  state: SimulationState,
  settings: RenderSettings,
): void {
  ctx.fillStyle = settings.attractorColor;
  for (const attractor of state.attractors) {
    ctx.beginPath();
    // Subtle attractors that don't overwhelm
    ctx.arc(attractor.x, attractor.y, 0.8, 0, Math.PI * 2);
    ctx.fill();
  }
}
