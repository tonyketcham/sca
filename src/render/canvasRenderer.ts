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
      drawGutterOverlay(ctx, state.bounds, grid.gutterPx * 0.5, edges);
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
  const hoverOutlineWidth = 0.5 / zoom;
  const selectedOutlineWidth = 1 / zoom;
  const selectedInnerOutlineWidth = 0.5 / zoom;
  ctx.save();
  // Ensure we render the hover state underneath the selected state if both are somehow active
  if (state.hovered && !state.selected) {
    ctx.strokeStyle = 'oklch(var(--border-hover))';
    ctx.lineWidth = hoverOutlineWidth;
    ctx.strokeRect(0, 0, bounds.width, bounds.height);
  }
  if (state.selected) {
    // 1px primary border for clear selection without overpowering frame content.
    ctx.strokeStyle = 'oklch(var(--primary))';
    ctx.lineWidth = selectedOutlineWidth;
    // We adjust strokeRect to account for the stroke width on the outside or center
    // Standard strokeRect is centered, so we leave it as is, or we could inset it
    ctx.strokeRect(0, 0, bounds.width, bounds.height);

    // Add an inner ring for more tool-like precision
    ctx.strokeStyle = 'oklch(var(--background) / 0.5)';
    ctx.lineWidth = selectedInnerOutlineWidth;
    const innerInset = selectedInnerOutlineWidth;
    ctx.strokeRect(
      innerInset,
      innerInset,
      bounds.width - innerInset * 2,
      bounds.height - innerInset * 2,
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
    ctx.lineWidth = 0.5 / view.zoom; // Keep it visually lighter for high-density displays.
    ctx.strokeRect(0, 0, state.bounds.width, state.bounds.height);
  }
}

function drawGutterOverlay(
  ctx: CanvasRenderingContext2D,
  bounds: SimulationState['bounds'],
  padding: number,
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

type Rgb = {
  r: number;
  g: number;
  b: number;
};

type PolygonBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

type RockPalette = {
  highlight: string;
  base: string;
  shadow: string;
  rim: string;
  facet: string;
};

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function parseHexColor(color: string): Rgb | null {
  const short = /^#([0-9a-fA-F]{3})$/.exec(color.trim());
  if (short) {
    const [r, g, b] = short[1]
      .split('')
      .map((channel) => Number.parseInt(channel + channel, 16));
    return { r, g, b };
  }

  const full = /^#([0-9a-fA-F]{6})$/.exec(color.trim());
  if (!full) return null;
  return {
    r: Number.parseInt(full[1].slice(0, 2), 16),
    g: Number.parseInt(full[1].slice(2, 4), 16),
    b: Number.parseInt(full[1].slice(4, 6), 16),
  };
}

function mixRgb(from: Rgb, to: Rgb, amount: number): Rgb {
  const t = clamp01(amount);
  return {
    r: from.r + (to.r - from.r) * t,
    g: from.g + (to.g - from.g) * t,
    b: from.b + (to.b - from.b) * t,
  };
}

function rgbToRgba(color: Rgb, alpha = 1): string {
  return `rgba(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)}, ${clamp01(alpha)})`;
}

function createRockPalette(obstacleFill: string): RockPalette {
  const parsed = parseHexColor(obstacleFill);
  if (!parsed) {
    return {
      highlight: 'rgba(255, 255, 255, 0.2)',
      base: obstacleFill,
      shadow: 'rgba(0, 0, 0, 0.35)',
      rim: 'rgba(0, 0, 0, 0.55)',
      facet: 'rgba(255, 255, 255, 0.18)',
    };
  }

  const warmStone: Rgb = { r: 134, g: 126, b: 118 };
  const neutralized = mixRgb(parsed, warmStone, 0.35);
  return {
    highlight: rgbToRgba(
      mixRgb(neutralized, { r: 255, g: 255, b: 255 }, 0.24),
      0.98,
    ),
    base: rgbToRgba(neutralized, 0.98),
    shadow: rgbToRgba(mixRgb(neutralized, { r: 12, g: 12, b: 12 }, 0.4), 0.98),
    rim: rgbToRgba(mixRgb(neutralized, { r: 0, g: 0, b: 0 }, 0.55), 0.9),
    facet: rgbToRgba(
      mixRgb(neutralized, { r: 255, g: 255, b: 255 }, 0.3),
      0.28,
    ),
  };
}

function tracePolygonPath(
  ctx: CanvasRenderingContext2D,
  polygon: Vec2[],
): void {
  ctx.beginPath();
  ctx.moveTo(polygon[0].x, polygon[0].y);
  for (let i = 1; i < polygon.length; i += 1) {
    ctx.lineTo(polygon[i].x, polygon[i].y);
  }
  ctx.closePath();
}

function getPolygonBounds(polygon: Vec2[]): PolygonBounds {
  let minX = polygon[0].x;
  let minY = polygon[0].y;
  let maxX = polygon[0].x;
  let maxY = polygon[0].y;
  for (let i = 1; i < polygon.length; i += 1) {
    const point = polygon[i];
    if (point.x < minX) minX = point.x;
    if (point.y < minY) minY = point.y;
    if (point.x > maxX) maxX = point.x;
    if (point.y > maxY) maxY = point.y;
  }
  return { minX, minY, maxX, maxY };
}

function drawObstacles(
  ctx: CanvasRenderingContext2D,
  state: SimulationState,
  settings: RenderSettings,
): void {
  const palette = createRockPalette(settings.obstacleFill);
  for (const polygon of state.obstacles) {
    if (polygon.length < 3) continue;
    const bounds = getPolygonBounds(polygon);
    const gradient = ctx.createLinearGradient(
      bounds.minX,
      bounds.minY,
      bounds.maxX,
      bounds.maxY,
    );
    gradient.addColorStop(0, palette.highlight);
    gradient.addColorStop(0.48, palette.base);
    gradient.addColorStop(1, palette.shadow);

    tracePolygonPath(ctx, polygon);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.save();
    tracePolygonPath(ctx, polygon);
    ctx.clip();

    // Fixed diagonal striations emulate subtle stone facets.
    const span = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
    const facetStride = Math.max(7, span * 0.18);
    ctx.strokeStyle = palette.facet;
    ctx.lineWidth = 0.9;
    for (
      let y = bounds.minY - facetStride;
      y <= bounds.maxY + facetStride;
      y += facetStride
    ) {
      ctx.beginPath();
      ctx.moveTo(bounds.minX - facetStride, y);
      ctx.lineTo(bounds.maxX + facetStride, y + facetStride * 0.55);
      ctx.stroke();
    }
    ctx.restore();

    tracePolygonPath(ctx, polygon);
    ctx.strokeStyle = palette.rim;
    ctx.lineWidth = 1;
    ctx.stroke();
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
