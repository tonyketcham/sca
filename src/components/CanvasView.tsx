import { useCallback, useEffect, useMemo, useRef, type RefObject } from 'react';
import type { SimulationState, Vec2 } from '../engine/simulationState';
import { stepSimulation } from '../engine/spaceColonization';
import {
  getArtboardOrigin,
  renderComposite,
  type GridLayout,
  type ViewTransform,
} from '../render/canvasRenderer';
import type { FrameConfig, TemplateGridSettings } from '../types/ui';

type CanvasViewProps = {
  simulationRef: RefObject<SimulationState[]>;
  framesRef: RefObject<FrameConfig[]>;
  gridLayout: GridLayout;
  templateGrid: TemplateGridSettings;
  selectedFrameIndices: number[];
  onSelectFrame: (index: number) => void;
  onToggleFrame: (index: number) => void;
  onClearSelection: () => void;
  running: boolean;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  viewCommand: CanvasViewCommand | null;
  fitInsets?: Partial<CanvasViewportInsets>;
  onZoomChange?: (zoom: number) => void;
};

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 4;
const DEFAULT_VIEWPORT_INSETS: CanvasViewportInsets = {
  top: 24,
  right: 24,
  bottom: 24,
  left: 24,
};

export type CanvasViewportInsets = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type CanvasViewCommand =
  | {
      type: 'setZoom';
      zoom: number;
      commandId: number;
    }
  | {
      type: 'zoomToFit';
      commandId: number;
    };

export default function CanvasView({
  simulationRef,
  framesRef,
  gridLayout,
  templateGrid,
  selectedFrameIndices,
  onSelectFrame,
  onToggleFrame,
  onClearSelection,
  running,
  canvasRef,
  viewCommand,
  fitInsets,
  onZoomChange,
}: CanvasViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<ViewTransform>({
    pan: { x: 0, y: 0 },
    zoom: 1,
  });
  const canvasSizeRef = useRef({ width: 1, height: 1, dpr: 1 });
  const isDraggingRef = useRef(false);
  const lastPointerRef = useRef<Vec2>({ x: 0, y: 0 });
  const pointerDownRef = useRef<{
    x: number;
    y: number;
    frameIndex: number | null;
  } | null>(null);
  const hoveredFrameRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastReportedZoomRef = useRef<number | null>(null);
  const normalizedInsets = useMemo(
    () => normalizeViewportInsets(fitInsets),
    [fitInsets],
  );

  const reportZoom = useCallback(
    (zoom: number) => {
      if (!onZoomChange) return;
      const rounded = Math.round(zoom * 10000) / 10000;
      if (
        lastReportedZoomRef.current !== null &&
        Math.abs(lastReportedZoomRef.current - rounded) < 0.0001
      ) {
        return;
      }
      lastReportedZoomRef.current = rounded;
      onZoomChange(zoom);
    },
    [onZoomChange],
  );

  const getCompositeBounds = useCallback(
    () => ({
      width: gridLayout.cellWidth * gridLayout.cols,
      height: gridLayout.cellHeight * gridLayout.rows,
    }),
    [
      gridLayout.cellHeight,
      gridLayout.cellWidth,
      gridLayout.cols,
      gridLayout.rows,
    ],
  );

  const getViewportRect = useCallback(() => {
    const { width, height } = canvasSizeRef.current;
    const leftInset = Math.min(Math.max(0, normalizedInsets.left), width - 1);
    const topInset = Math.min(Math.max(0, normalizedInsets.top), height - 1);
    const maxRightInset = Math.max(0, width - leftInset - 1);
    const maxBottomInset = Math.max(0, height - topInset - 1);
    const rightInset = Math.min(
      Math.max(0, normalizedInsets.right),
      maxRightInset,
    );
    const bottomInset = Math.min(
      Math.max(0, normalizedInsets.bottom),
      maxBottomInset,
    );
    const viewportWidth = Math.max(1, width - leftInset - rightInset);
    const viewportHeight = Math.max(1, height - topInset - bottomInset);
    return {
      left: leftInset,
      top: topInset,
      width: viewportWidth,
      height: viewportHeight,
      center: {
        x: leftInset + viewportWidth * 0.5,
        y: topInset + viewportHeight * 0.5,
      },
    };
  }, [
    normalizedInsets.bottom,
    normalizedInsets.left,
    normalizedInsets.right,
    normalizedInsets.top,
  ]);

  const applyZoomAtPointer = useCallback(
    (pointer: Vec2, requestedZoom: number) => {
      const bounds = getCompositeBounds();
      const { width, height } = canvasSizeRef.current;
      const nextZoom = clamp(requestedZoom, MIN_ZOOM, MAX_ZOOM);
      const currentZoom = viewRef.current.zoom;
      if (Math.abs(nextZoom - currentZoom) < 0.0001) return;

      const origin = getArtboardOrigin(width, height, bounds, viewRef.current);
      const worldPoint = {
        x: (pointer.x - origin.x) / currentZoom,
        y: (pointer.y - origin.y) / currentZoom,
      };
      const nextOrigin = {
        x: pointer.x - worldPoint.x * nextZoom,
        y: pointer.y - worldPoint.y * nextZoom,
      };

      viewRef.current.zoom = nextZoom;
      viewRef.current.pan = {
        x: nextOrigin.x - (width - bounds.width * nextZoom) * 0.5,
        y: nextOrigin.y - (height - bounds.height * nextZoom) * 0.5,
      };
      reportZoom(nextZoom);
    },
    [getCompositeBounds, reportZoom],
  );

  const setZoomAroundViewportCenter = useCallback(
    (requestedZoom: number) => {
      const viewport = getViewportRect();
      applyZoomAtPointer(viewport.center, requestedZoom);
    },
    [applyZoomAtPointer, getViewportRect],
  );

  const zoomToFit = useCallback(() => {
    const bounds = getCompositeBounds();
    if (bounds.width <= 0 || bounds.height <= 0) return;
    const { width: canvasWidth, height: canvasHeight } = canvasSizeRef.current;
    const viewport = getViewportRect();
    const nextZoom = clamp(
      Math.min(viewport.width / bounds.width, viewport.height / bounds.height),
      MIN_ZOOM,
      MAX_ZOOM,
    );
    const targetOriginX =
      viewport.left + (viewport.width - bounds.width * nextZoom) * 0.5;
    const targetOriginY =
      viewport.top + (viewport.height - bounds.height * nextZoom) * 0.5;

    viewRef.current.zoom = nextZoom;
    viewRef.current.pan = {
      x: targetOriginX - (canvasWidth - bounds.width * nextZoom) * 0.5,
      y: targetOriginY - (canvasHeight - bounds.height * nextZoom) * 0.5,
    };
    reportZoom(nextZoom);
  }, [getCompositeBounds, getViewportRect, reportZoom]);

  useEffect(() => {
    reportZoom(viewRef.current.zoom);
  }, [reportZoom]);

  useEffect(() => {
    if (!viewCommand) return;
    if (viewCommand.type === 'zoomToFit') {
      zoomToFit();
      return;
    }
    if (viewCommand.type === 'setZoom') {
      setZoomAroundViewportCenter(viewCommand.zoom);
    }
  }, [setZoomAroundViewportCenter, viewCommand, zoomToFit]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const dpr = window.devicePixelRatio || 1;
        const logicalWidth = Math.max(1, Math.floor(width));
        const logicalHeight = Math.max(1, Math.floor(height));
        canvas.style.width = `${logicalWidth}px`;
        canvas.style.height = `${logicalHeight}px`;
        canvas.width = Math.max(1, Math.floor(logicalWidth * dpr));
        canvas.height = Math.max(1, Math.floor(logicalHeight * dpr));
        canvasSizeRef.current = {
          width: logicalWidth,
          height: logicalHeight,
          dpr,
        };
      }
    });
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, [canvasRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateHover = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const point = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
      hoveredFrameRef.current = getFrameIndexAtPoint(
        point,
        canvas,
        gridLayout,
        viewRef.current,
      );
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      const rect = canvas.getBoundingClientRect();
      const point = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
      pointerDownRef.current = {
        x: event.clientX,
        y: event.clientY,
        frameIndex: getFrameIndexAtPoint(
          point,
          canvas,
          gridLayout,
          viewRef.current,
        ),
      };
      isDraggingRef.current = false;
      lastPointerRef.current = { x: event.clientX, y: event.clientY };
      canvas.setPointerCapture(event.pointerId);
      canvas.focus();
    };

    const onPointerUp = (event: PointerEvent) => {
      if (pointerDownRef.current && !isDraggingRef.current) {
        const { frameIndex } = pointerDownRef.current;
        if (typeof frameIndex === 'number') {
          if (event.metaKey || event.ctrlKey) {
            onToggleFrame(frameIndex);
          } else {
            onSelectFrame(frameIndex);
          }
        } else {
          onClearSelection();
        }
      }
      pointerDownRef.current = null;
      isDraggingRef.current = false;
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
    };

    const onPointerLeave = (event: PointerEvent) => {
      hoveredFrameRef.current = null;
      onPointerUp(event);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!pointerDownRef.current) {
        updateHover(event);
        return;
      }

      if (!isDraggingRef.current) {
        const distance = Math.hypot(
          event.clientX - pointerDownRef.current.x,
          event.clientY - pointerDownRef.current.y,
        );
        if (distance < 3) {
          return;
        }
        isDraggingRef.current = true;
      }

      const deltaX = event.clientX - lastPointerRef.current.x;
      const deltaY = event.clientY - lastPointerRef.current.y;
      lastPointerRef.current = { x: event.clientX, y: event.clientY };
      viewRef.current.pan.x += deltaX;
      viewRef.current.pan.y += deltaY;
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const pointer = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };

      let delta = event.deltaY;
      if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
        delta *= 16;
      } else if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
        delta *= canvasSizeRef.current.height;
      }

      const zoomSpeed = event.ctrlKey ? 0.025 : 0.015;
      const { zoom } = viewRef.current;
      const nextZoom = clamp(
        zoom * Math.exp(-delta * zoomSpeed),
        MIN_ZOOM,
        MAX_ZOOM,
      );
      applyZoomAtPointer(pointer, nextZoom);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const panStep = event.shiftKey ? 96 : 48;
      let handled = true;
      switch (event.key) {
        case 'ArrowLeft':
          viewRef.current.pan.x += panStep;
          break;
        case 'ArrowRight':
          viewRef.current.pan.x -= panStep;
          break;
        case 'ArrowUp':
          viewRef.current.pan.y += panStep;
          break;
        case 'ArrowDown':
          viewRef.current.pan.y -= panStep;
          break;
        case '=':
        case '+':
          setZoomAroundViewportCenter(viewRef.current.zoom * 1.1);
          break;
        case '-':
        case '_':
          setZoomAroundViewportCenter(viewRef.current.zoom * 0.9);
          break;
        case '0':
          viewRef.current.pan = { x: 0, y: 0 };
          viewRef.current.zoom = 1;
          reportZoom(1);
          break;
        default:
          handled = false;
      }
      if (handled) {
        event.preventDefault();
      }
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointerleave', onPointerLeave);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('keydown', onKeyDown);

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('keydown', onKeyDown);
    };
  }, [
    canvasRef,
    gridLayout,
    applyZoomAtPointer,
    setZoomAroundViewportCenter,
    onClearSelection,
    onSelectFrame,
    onToggleFrame,
    reportZoom,
    simulationRef,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = () => {
      const { width, height, dpr } = canvasSizeRef.current;
      const frames = framesRef.current;
      const states = simulationRef.current;

      if (running) {
        for (let index = 0; index < states.length; index += 1) {
          const state = states[index];
          const frame = frames[index];
          if (!state || !frame || state.completed) continue;
          for (let i = 0; i < frame.params.stepsPerFrame; i += 1) {
            stepSimulation(state, frame.params);
            if (state.completed) break;
          }
        }
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      renderComposite(ctx, states, {
        canvasWidth: width,
        canvasHeight: height,
        view: viewRef.current,
        mode: 'editor',
        grid: gridLayout,
        frames,
        templateGrid,
        hoveredFrameIndex: hoveredFrameRef.current,
        selectedFrameIndices,
      });

      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [
    canvasRef,
    framesRef,
    gridLayout,
    running,
    selectedFrameIndices,
    simulationRef,
    templateGrid,
  ]);

  const viewHints = useMemo(
    () => (
      <div className="pointer-events-none absolute bottom-4 right-4 rounded border border-border/40 bg-surface/80 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted shadow-sm backdrop-blur-md transition-opacity duration-300">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 justify-between">
            <span>Pan</span>
            <span className="font-semibold text-foreground/60">Drag</span>
          </div>
          <div className="flex items-center gap-2 justify-between">
            <span>Zoom</span>
            <span className="font-semibold text-foreground/60">Scroll</span>
          </div>
          <div className="flex items-center gap-2 justify-between">
            <span>Select</span>
            <span className="font-semibold text-foreground/60">Click</span>
          </div>
        </div>
      </div>
    ),
    [],
  );

  return (
    <div className="relative h-full w-full bg-background" ref={containerRef}>
      <canvas
        ref={canvasRef}
        className="block h-full w-full focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:ring-offset-0 focus-visible:ring-inset cursor-grab active:cursor-grabbing"
        tabIndex={0}
        aria-label="Simulation canvas. Drag to pan, scroll to zoom, use arrow keys to pan, plus and minus to zoom, zero to reset view, or use the zoom menu in the toolbar."
      />
      {viewHints}
    </div>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeViewportInsets(
  insets: Partial<CanvasViewportInsets> | undefined,
): CanvasViewportInsets {
  return {
    top: finiteInset(insets?.top, DEFAULT_VIEWPORT_INSETS.top),
    right: finiteInset(insets?.right, DEFAULT_VIEWPORT_INSETS.right),
    bottom: finiteInset(insets?.bottom, DEFAULT_VIEWPORT_INSETS.bottom),
    left: finiteInset(insets?.left, DEFAULT_VIEWPORT_INSETS.left),
  };
}

function finiteInset(value: number | undefined, fallback: number): number {
  const numericValue = typeof value === 'number' ? value : Number.NaN;
  if (!Number.isFinite(numericValue)) {
    return fallback;
  }
  return Math.max(0, numericValue);
}

function getFrameIndexAtPoint(
  point: Vec2,
  canvas: HTMLCanvasElement,
  gridLayout: GridLayout,
  view: ViewTransform,
): number | null {
  const bounds = {
    width: gridLayout.cellWidth * gridLayout.cols,
    height: gridLayout.cellHeight * gridLayout.rows,
  };
  const canvasWidth = canvas.clientWidth || canvas.width;
  const canvasHeight = canvas.clientHeight || canvas.height;
  const origin = getArtboardOrigin(canvasWidth, canvasHeight, bounds, view);
  const worldX = (point.x - origin.x) / view.zoom;
  const worldY = (point.y - origin.y) / view.zoom;
  if (
    worldX < 0 ||
    worldY < 0 ||
    worldX > bounds.width ||
    worldY > bounds.height
  ) {
    return null;
  }
  const col = Math.floor(worldX / gridLayout.cellWidth);
  const row = Math.floor(worldY / gridLayout.cellHeight);
  const index = row * gridLayout.cols + col;
  return gridLayout.cells[index] ? index : null;
}
