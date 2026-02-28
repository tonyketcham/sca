import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CanvasView, {
  type CanvasViewCommand,
  type CanvasViewportInsets,
} from './components/CanvasView';
import LeftSidebar from './components/LeftSidebar';
import RightSidebar from './components/RightSidebar';
import Toolbar from './components/Toolbar';
import {
  createSimulationState,
  type Bounds,
  type SimulationParams,
  type SimulationState,
} from './engine/simulationState';
import { unitsToPx } from './geometry/units';
import { generatePolygons, type Polygon } from './obstacles/polygons';
import { renderComposite, type RenderSettings } from './render/canvasRenderer';
import { exportCompositeSvg } from './export/svgExporter';
import { encodeCompositeMp4 } from './export/webcodecsMp4';
import type {
  ConfigState,
  ExportSettings,
  FrameConfig,
  ObstacleSettings,
  PaperSettings,
  StatsSummary,
  TemplateGridSettings,
} from './types/ui';
import { useSavedConfigs } from './hooks/useSavedConfigs';
import { useFrameClipboard } from './hooks/useFrameClipboard';
import { decodeConfig, encodeConfig } from './utils/serialize';
import { createSeed, createSeededRng } from './utils/rng';
import { LATEST_SCHEMA_VERSION } from './utils/schemaMigrations';

const DEFAULT_PAPER: PaperSettings = {
  width: 8.5,
  height: 11,
  unit: 'in',
  dpi: 96,
  includeCanvasUiInExport: false,
};

const DEFAULT_PARAMS: SimulationParams = {
  influenceRadius: 80,
  killRadius: 16,
  stepSize: 6,
  maxNodes: 4000,
  seedCount: 3,
  seedSpread: 30,
  seedPlacement: 'edge',
  seedEdge: 'top',
  seedAngle: 0,
  attractorCount: 900,
  stepsPerFrame: 3,
  avoidObstacles: true,
  seedRotationStrength: 0,
  attractorTangentStrength: 0,
  pathSmoothing: 0,
};

const DEFAULT_OBSTACLES: ObstacleSettings = {
  count: 4,
  minVertices: 4,
  maxVertices: 7,
  minRadius: 0.6,
  maxRadius: 1.8,
  margin: 0.4,
};

const DEFAULT_RENDER: RenderSettings = {
  showAttractors: false,
  showNodes: false,
  showObstacles: true,
  strokeWidth: 1.4,
  nodeRadius: 1.5,
  rootColor: '#6ea95a',
  obstacleFill: '#756c64',
  attractorColor: '#5c84f4',
};

const DEFAULT_EXPORT: ExportSettings = {
  fps: 30,
  durationSeconds: 6,
  stepsPerFrame: 3,
  durationMode: 'fixed',
};

const DEFAULT_TEMPLATE_GRID: TemplateGridSettings = {
  rows: 1,
  cols: 1,
  gutter: 0,
  showGutter: true,
  gutterAsObstacles: false,
};
const MIN_CANVAS_ZOOM = 0.2;
const MAX_CANVAS_ZOOM = 4;

type GridCellLayout = {
  index: number;
  row: number;
  col: number;
  offset: { x: number; y: number };
  bounds: Bounds;
};

type GridShape = {
  rows: number;
  cols: number;
};

const EXPORT_CANVAS_UI_PADDING_PX = 8;

function createFrameName(index: number): string {
  return `Frame ${index + 1}`;
}

function createDefaultFrame(name?: string): FrameConfig {
  return {
    name: name ?? 'Frame',
    params: { ...DEFAULT_PARAMS },
    obstacles: { ...DEFAULT_OBSTACLES },
    renderSettings: { ...DEFAULT_RENDER },
    exportSettings: { ...DEFAULT_EXPORT },
    seed: createSeed(),
    randomizeSeed: true,
  };
}

export default function App() {
  const [paper, setPaper] = useState<PaperSettings>(DEFAULT_PAPER);
  const [templateGrid, setTemplateGrid] = useState<TemplateGridSettings>(
    DEFAULT_TEMPLATE_GRID,
  );
  const [frames, setFrames] = useState<FrameConfig[]>(() => [
    createDefaultFrame(createFrameName(0)),
  ]);
  const [selectedFrameIndices, setSelectedFrameIndices] = useState<number[]>([
    0,
  ]);
  const [running, setRunning] = useState(true);
  const [exportError, setExportError] = useState<string | null>(null);
  const [isExportingMp4, setIsExportingMp4] = useState(false);
  const [canvasZoomPercent, setCanvasZoomPercent] = useState(100);
  const [canvasViewCommand, setCanvasViewCommand] =
    useState<CanvasViewCommand | null>(null);
  const [toolbarOverlayBottomPx, setToolbarOverlayBottomPx] = useState(88);
  const [stats, setStats] = useState<StatsSummary>({
    nodes: 0,
    attractors: 0,
    iterations: 0,
    completed: false,
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const framesRef = useRef(frames);
  const hydratingRef = useRef(true);
  const previewConfigRef = useRef<ConfigState | null>(null);
  const previewRunningRef = useRef<boolean>(running);
  const urlUpdateRef = useRef<number | null>(null);
  const simulationRef = useRef<SimulationState[]>([]);
  const lastEditedFrameIndexRef = useRef(0);
  const canvasViewCommandIdRef = useRef(0);
  const previousGridShapeRef = useRef<GridShape>({
    rows: DEFAULT_TEMPLATE_GRID.rows,
    cols: DEFAULT_TEMPLATE_GRID.cols,
  });

  /**
   * Track the latest non-preview config and running state via refs that are
   * updated synchronously during render.  This prevents a race condition where
   * handlePreviewEnd clears previewConfigRef, then a mouseenter fires before
   * the restore render commits — the stale closure would capture the *preview*
   * configState, permanently losing the real project.  Reading from these refs
   * ensures handlePreviewEntry always saves the true pre-preview values.
   *
   * Initialised with null/false and populated after configState is defined.
   */
  const latestRealConfigRef = useRef<ConfigState | null>(null);
  const latestRealRunningRef = useRef<boolean>(running);

  const selectedFrameIndicesRef = useRef(selectedFrameIndices);

  useEffect(() => {
    framesRef.current = frames;
  }, [frames]);

  useEffect(() => {
    selectedFrameIndicesRef.current = selectedFrameIndices;
  }, [selectedFrameIndices]);

  const boundsPx = useMemo(
    () => ({
      width: unitsToPx(paper.width, paper.unit, paper.dpi),
      height: unitsToPx(paper.height, paper.unit, paper.dpi),
    }),
    [paper],
  );

  const gridLayout = useMemo(() => {
    const rows = Math.max(1, Math.floor(templateGrid.rows));
    const cols = Math.max(1, Math.floor(templateGrid.cols));
    const cellWidth = Math.max(1, boundsPx.width / cols);
    const cellHeight = Math.max(1, boundsPx.height / rows);
    const gutterPx = unitsToPx(templateGrid.gutter, paper.unit, paper.dpi);
    const cells = Array.from({ length: rows * cols }, (_, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      return {
        index,
        row,
        col,
        offset: { x: col * cellWidth, y: row * cellHeight },
        bounds: { width: cellWidth, height: cellHeight },
      };
    });
    return {
      rows,
      cols,
      cellWidth,
      cellHeight,
      gutterPx,
      cells,
    };
  }, [
    boundsPx.height,
    boundsPx.width,
    paper.dpi,
    paper.unit,
    templateGrid.cols,
    templateGrid.gutter,
    templateGrid.rows,
  ]);

  const gutterPaddingPx = useMemo(
    () => Math.max(0, gridLayout.gutterPx * 0.5),
    [gridLayout.gutterPx],
  );

  const buildFrameObstacles = useCallback(
    (
      frame: FrameConfig,
      layout: GridCellLayout,
      seedValue: number,
    ): Polygon[] => {
      const rng = createSeededRng(seedValue);
      const minRadiusPx = unitsToPx(
        frame.obstacles.minRadius,
        paper.unit,
        paper.dpi,
      );
      const maxRadiusPx = unitsToPx(
        frame.obstacles.maxRadius,
        paper.unit,
        paper.dpi,
      );
      const marginPx = unitsToPx(frame.obstacles.margin, paper.unit, paper.dpi);
      const polygons = generatePolygons(
        layout.bounds,
        {
          count: frame.obstacles.count,
          minVertices: frame.obstacles.minVertices,
          maxVertices: frame.obstacles.maxVertices,
          minRadius: minRadiusPx,
          maxRadius: maxRadiusPx,
          margin: marginPx,
        },
        rng,
      );
      if (!templateGrid.gutterAsObstacles || gutterPaddingPx <= 0) {
        return polygons;
      }
      const edges = {
        top: layout.row > 0,
        bottom: layout.row < gridLayout.rows - 1,
        left: layout.col > 0,
        right: layout.col < gridLayout.cols - 1,
      };
      return [
        ...polygons,
        ...createGutterObstacles(layout.bounds, gutterPaddingPx, edges),
      ];
    },
    [
      gridLayout.cols,
      gridLayout.rows,
      gutterPaddingPx,
      paper.dpi,
      paper.unit,
      templateGrid.gutterAsObstacles,
    ],
  );

  const rebuildFrameSimulation = useCallback(
    (index: number, frame: FrameConfig, seedOverride?: number) => {
      const layout = gridLayout.cells[index];
      if (!layout) return;
      const seedValue = seedOverride ?? frame.seed;
      const obstacles = buildFrameObstacles(frame, layout, seedValue);
      const rng = createSeededRng(seedValue + 1);
      simulationRef.current[index] = createSimulationState(
        layout.bounds,
        frame.params,
        obstacles,
        rng,
      );
    },
    [buildFrameObstacles, gridLayout.cells],
  );

  const rebuildAllSimulations = useCallback(
    (nextFrames: FrameConfig[]) => {
      simulationRef.current = nextFrames.map((frame, index) => {
        const layout = gridLayout.cells[index];
        if (!layout) {
          return createSimulationState(
            { width: 0, height: 0 },
            frame.params,
            [],
          );
        }
        const obstacles = buildFrameObstacles(frame, layout, frame.seed);
        const rng = createSeededRng(frame.seed + 1);
        return createSimulationState(
          layout.bounds,
          frame.params,
          obstacles,
          rng,
        );
      });
    },
    [buildFrameObstacles, gridLayout.cells],
  );

  const normalizeSelection = useCallback(
    (indices: number[], length: number): number[] => {
      if (!Array.isArray(indices) || length < 1) return [];
      const next: number[] = [];
      const seen = new Set<number>();
      for (const raw of indices) {
        if (!Number.isFinite(raw)) continue;
        const index = Math.floor(raw);
        if (index < 0 || index >= length) continue;
        if (seen.has(index)) continue;
        seen.add(index);
        next.push(index);
      }
      return next;
    },
    [],
  );

  const getMostRecentlyEditedFrame = useCallback(
    (allFrames: FrameConfig[]): FrameConfig | undefined => {
      if (allFrames.length === 0) return undefined;

      const editedIndex = lastEditedFrameIndexRef.current;
      if (editedIndex >= 0 && editedIndex < allFrames.length) {
        return allFrames[editedIndex];
      }

      const selectedIndex = selectedFrameIndicesRef.current[0];
      if (
        typeof selectedIndex === 'number' &&
        Number.isFinite(selectedIndex) &&
        selectedIndex >= 0 &&
        selectedIndex < allFrames.length
      ) {
        return allFrames[selectedIndex];
      }

      return allFrames[allFrames.length - 1];
    },
    [],
  );

  useEffect(() => {
    const previousGridShape = previousGridShapeRef.current;
    const nextGridShape: GridShape = {
      rows: gridLayout.rows,
      cols: gridLayout.cols,
    };

    setFrames((prev) => {
      const isColumnExpansion =
        nextGridShape.rows === previousGridShape.rows &&
        nextGridShape.cols > previousGridShape.cols;
      const next = resizeFrames(prev, gridLayout.cells.length, {
        shouldCloneTemplate: isColumnExpansion,
        templateFrame: isColumnExpansion
          ? getMostRecentlyEditedFrame(prev)
          : undefined,
      });
      if (next !== prev) {
        setSelectedFrameIndices((indices) =>
          normalizeSelection(indices, next.length),
        );
        rebuildAllSimulations(next);
      }
      return next;
    });
    previousGridShapeRef.current = nextGridShape;
  }, [
    getMostRecentlyEditedFrame,
    gridLayout.cells.length,
    gridLayout.cols,
    gridLayout.rows,
    normalizeSelection,
    rebuildAllSimulations,
  ]);

  useEffect(() => {
    rebuildAllSimulations(frames);
  }, [
    rebuildAllSimulations,
    gridLayout.cellHeight,
    gridLayout.cellWidth,
    gridLayout.rows,
    gridLayout.cols,
  ]);

  const primaryFrameIndex = selectedFrameIndices[0] ?? 0;

  useEffect(() => {
    const updateStats = () => {
      const state = simulationRef.current[primaryFrameIndex];
      if (!state) return;
      const next = {
        nodes: state.nodes.length,
        attractors: state.attractors.length,
        iterations: state.iterations,
        completed: state.completed,
      };
      setStats((prev) =>
        prev.nodes === next.nodes &&
        prev.attractors === next.attractors &&
        prev.iterations === next.iterations &&
        prev.completed === next.completed
          ? prev
          : next,
      );
    };

    updateStats();
    if (!running) {
      return;
    }

    const id = window.setInterval(updateStats, 200);
    return () => window.clearInterval(id);
  }, [primaryFrameIndex, running]);

  const getExportScope = useCallback(() => {
    const indices = selectedFrameIndicesRef.current;
    const allFrames = framesRef.current;
    const allStates = simulationRef.current;

    let scopedGrid = gridLayout;
    let scopedFrames = allFrames;
    let scopedStates = allStates;
    let widthInUnits = paper.width;
    let heightInUnits = paper.height;
    let selectedFrameIndicesForExport = normalizeSelection(
      indices,
      allFrames.length,
    );

    if (indices.length > 0) {
      const subFrames = indices
        .map((i) => allFrames[i])
        .filter((f): f is FrameConfig => f !== undefined);
      const subStates = indices
        .map((i) => allStates[i])
        .filter((s): s is SimulationState => s !== undefined);
      const n = subFrames.length;
      const { cellWidth, cellHeight, gutterPx } = gridLayout;

      scopedGrid = {
        rows: 1,
        cols: n,
        cellWidth,
        cellHeight,
        gutterPx,
        cells: subFrames.map((_, i) => ({
          index: i,
          row: 0,
          col: i,
          offset: { x: i * cellWidth, y: 0 },
          bounds: { width: cellWidth, height: cellHeight },
        })),
      };
      scopedFrames = subFrames;
      scopedStates = subStates;
      selectedFrameIndicesForExport = subFrames.map((_, index) => index);

      const cellWidthUnits = paper.width / gridLayout.cols;
      const cellHeightUnits = paper.height / gridLayout.rows;
      widthInUnits = cellWidthUnits * n;
      heightInUnits = cellHeightUnits;
    }

    const includeCanvasUi = paper.includeCanvasUiInExport;
    const canvasUiPaddingPx = includeCanvasUi ? EXPORT_CANVAS_UI_PADDING_PX : 0;
    const baseWidthPx = Math.max(1, scopedGrid.cellWidth * scopedGrid.cols);
    const baseHeightPx = Math.max(1, scopedGrid.cellHeight * scopedGrid.rows);
    const paddedGrid =
      canvasUiPaddingPx > 0
        ? offsetGridLayout(scopedGrid, canvasUiPaddingPx)
        : scopedGrid;
    const canvasWidthPx = Math.max(
      1,
      Math.round(baseWidthPx + canvasUiPaddingPx * 2),
    );
    const canvasHeightPx = Math.max(
      1,
      Math.round(baseHeightPx + canvasUiPaddingPx * 2),
    );
    const paddedWidthInUnits =
      widthInUnits + (canvasUiPaddingPx * 2 * widthInUnits) / baseWidthPx;
    const paddedHeightInUnits =
      heightInUnits + (canvasUiPaddingPx * 2 * heightInUnits) / baseHeightPx;

    return {
      grid: paddedGrid,
      frames: scopedFrames,
      states: scopedStates,
      widthInUnits: paddedWidthInUnits,
      heightInUnits: paddedHeightInUnits,
      canvasWidthPx,
      canvasHeightPx,
      includeCanvasUi,
      selectedFrameIndices: selectedFrameIndicesForExport,
    };
  }, [
    gridLayout,
    normalizeSelection,
    paper.height,
    paper.includeCanvasUiInExport,
    paper.width,
  ]);

  const exportCanvas = useCallback(() => {
    const scope = getExportScope();
    const canvas = document.createElement('canvas');
    canvas.width = scope.canvasWidthPx;
    canvas.height = scope.canvasHeightPx;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return null;

    renderComposite(ctx, scope.states, {
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      view: { pan: { x: 0, y: 0 }, zoom: 1 },
      mode: 'export',
      grid: scope.grid,
      frames: scope.frames,
      includeCanvasUi: scope.includeCanvasUi,
      selectedFrameIndices: scope.selectedFrameIndices,
    });
    return canvas;
  }, [getExportScope]);

  const handleExportPng = useCallback(() => {
    setExportError(null);
    const canvas = exportCanvas();
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      downloadBlob(blob, `root-growth-${Date.now()}.png`);
    });
  }, [exportCanvas]);

  const handleExportSvg = useCallback(() => {
    setExportError(null);
    const scope = getExportScope();
    const svg = exportCompositeSvg({
      states: scope.states,
      frames: scope.frames,
      grid: scope.grid,
      unit: paper.unit,
      widthInUnits: scope.widthInUnits,
      heightInUnits: scope.heightInUnits,
      includeCanvasUi: scope.includeCanvasUi,
      selectedFrameIndices: scope.selectedFrameIndices,
    });
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    downloadBlob(blob, `root-growth-${Date.now()}.svg`);
  }, [getExportScope, paper.unit]);

  const handleExportMp4 = useCallback(async () => {
    if (isExportingMp4) return;
    try {
      setExportError(null);
      setIsExportingMp4(true);
      const scope = getExportScope();
      const activeFrame = scope.frames[0];
      if (!activeFrame) return;
      const blob = await encodeCompositeMp4({
        frames: scope.frames,
        grid: scope.grid,
        states: scope.states,
        fps: activeFrame.exportSettings.fps,
        durationSeconds: activeFrame.exportSettings.durationSeconds,
        durationMode: activeFrame.exportSettings.durationMode,
        stepsPerFrame: activeFrame.exportSettings.stepsPerFrame,
        canvasWidth: scope.canvasWidthPx,
        canvasHeight: scope.canvasHeightPx,
        includeCanvasUi: scope.includeCanvasUi,
        selectedFrameIndices: scope.selectedFrameIndices,
      });
      downloadBlob(blob, `root-growth-${Date.now()}.mp4`);
    } catch (error) {
      console.error(error);
      setExportError(
        error instanceof Error ? error.message : 'MP4 export failed.',
      );
    } finally {
      setIsExportingMp4(false);
    }
  }, [getExportScope, isExportingMp4]);

  const dismissExportError = useCallback(() => {
    setExportError(null);
  }, []);

  const handleToggleRunning = useCallback(() => {
    setRunning((value) => !value);
  }, []);

  const issueCanvasCommand = useCallback(
    (
      command:
        | Omit<Extract<CanvasViewCommand, { type: 'setZoom' }>, 'commandId'>
        | Omit<Extract<CanvasViewCommand, { type: 'zoomToFit' }>, 'commandId'>,
    ) => {
      canvasViewCommandIdRef.current += 1;
      setCanvasViewCommand({
        ...command,
        commandId: canvasViewCommandIdRef.current,
      });
    },
    [],
  );

  const handleSetCanvasZoomPercent = useCallback(
    (zoomPercent: number) => {
      const normalizedPercent = finiteNumber(zoomPercent, 100);
      const zoom = clampNumber(
        normalizedPercent / 100,
        MIN_CANVAS_ZOOM,
        MAX_CANVAS_ZOOM,
      );
      issueCanvasCommand({ type: 'setZoom', zoom });
    },
    [issueCanvasCommand],
  );

  const handleZoomToFit = useCallback(() => {
    issueCanvasCommand({ type: 'zoomToFit' });
  }, [issueCanvasCommand]);

  const handleCanvasZoomChange = useCallback((zoom: number) => {
    const nextPercent = Math.round(
      clampNumber(zoom, MIN_CANVAS_ZOOM, MAX_CANVAS_ZOOM) * 100,
    );
    setCanvasZoomPercent((prev) => (prev === nextPercent ? prev : nextPercent));
  }, []);

  const handleToolbarOverlayBottomChange = useCallback((bottomPx: number) => {
    const normalizedBottom = Math.max(0, finiteNumber(bottomPx, 0));
    setToolbarOverlayBottomPx((prev) =>
      Math.abs(prev - normalizedBottom) < 0.5 ? prev : normalizedBottom,
    );
  }, []);

  const canvasFitInsets = useMemo<CanvasViewportInsets>(
    () => ({
      top: Math.max(24, toolbarOverlayBottomPx + 18),
      right: 28,
      bottom: 28,
      left: 28,
    }),
    [toolbarOverlayBottomPx],
  );

  const configState = useMemo<ConfigState>(
    () => ({
      schemaVersion: LATEST_SCHEMA_VERSION,
      paper,
      templateGrid,
      frames,
      selectedFrameIndices,
    }),
    [paper, templateGrid, frames, selectedFrameIndices],
  );

  // Synchronous render-phase update: keep the "real" (non-preview) snapshot
  // current so that handlePreviewEntry can always read the true pre-preview
  // state, even when its closure is stale from a previous preview render.
  if (!previewConfigRef.current) {
    latestRealConfigRef.current = configState;
    latestRealRunningRef.current = running;
  }

  const {
    savedEntries,
    saveManualEntry,
    deleteEntry,
    getEntryConfig,
    currentConfig,
  } = useSavedConfigs(configState, {
    enabled: !hydratingRef.current && previewConfigRef.current === null,
  });

  const normalizeConfig = useCallback(
    (config: ConfigState): ConfigState => {
      const normalizedGrid = normalizeGrid(config.templateGrid);
      const nextFrames = normalizeFrames(
        config.frames,
        normalizedGrid.rows * normalizedGrid.cols,
      );
      const legacyIndex = (config as { activeFrameIndex?: number })
        .activeFrameIndex;
      const selectionSource = Array.isArray(
        (config as ConfigState).selectedFrameIndices,
      )
        ? (config as ConfigState).selectedFrameIndices
        : [legacyIndex ?? 0];
      const normalizedSelection = normalizeSelection(
        selectionSource,
        nextFrames.length,
      );
      return {
        schemaVersion: LATEST_SCHEMA_VERSION,
        paper: normalizePaper(config.paper),
        templateGrid: normalizedGrid,
        frames: nextFrames,
        selectedFrameIndices: normalizedSelection,
      };
    },
    [normalizeSelection],
  );

  const applyConfig = useCallback(
    (config: ConfigState) => {
      const normalized = normalizeConfig(config);
      setPaper(normalized.paper);
      setTemplateGrid(normalized.templateGrid);
      setFrames(normalized.frames);
      setSelectedFrameIndices(normalized.selectedFrameIndices);
      rebuildAllSimulations(normalized.frames);
    },
    [normalizeConfig, rebuildAllSimulations],
  );

  useEffect(() => {
    if (!hydratingRef.current) return;
    const url = new URL(window.location.href);
    const fromUrl = url.searchParams.get('cfg');
    if (fromUrl) {
      const decoded = decodeConfig(fromUrl);
      if (decoded) {
        applyConfig(decoded);
        hydratingRef.current = false;
        return;
      }
    }
    if (currentConfig) {
      applyConfig(currentConfig);
    }
    hydratingRef.current = false;
  }, [applyConfig, currentConfig]);

  useEffect(() => {
    if (hydratingRef.current || previewConfigRef.current) return;
    if (urlUpdateRef.current) {
      window.clearTimeout(urlUpdateRef.current);
    }
    urlUpdateRef.current = window.setTimeout(() => {
      const url = new URL(window.location.href);
      const encoded = encodeConfig(configState);
      url.searchParams.set('cfg', encoded);
      window.history.replaceState({}, '', url.toString());
    }, 250);
    return () => {
      if (urlUpdateRef.current) {
        window.clearTimeout(urlUpdateRef.current);
      }
    };
  }, [configState]);

  const handlePreviewEntry = useCallback(
    (id: string) => {
      if (previewConfigRef.current) {
        return;
      }
      const config = getEntryConfig(id);
      if (!config) return;
      previewConfigRef.current = latestRealConfigRef.current;
      previewRunningRef.current = latestRealRunningRef.current;
      setRunning(true);
      applyConfig(normalizeConfig(config));
    },
    [applyConfig, getEntryConfig, normalizeConfig],
  );

  const handlePreviewEnd = useCallback(() => {
    if (!previewConfigRef.current) return;
    const restore = previewConfigRef.current;
    previewConfigRef.current = null;
    applyConfig(restore);
    setRunning(previewRunningRef.current);
  }, [applyConfig]);

  const handleLoadEntry = useCallback(
    (id: string) => {
      const config = getEntryConfig(id);
      if (!config) return;
      previewConfigRef.current = null;
      applyConfig(normalizeConfig(config));
    },
    [applyConfig, getEntryConfig, normalizeConfig],
  );

  const hasFrameSelection = selectedFrameIndices.length > 0;

  const updateSelectedFrames = useCallback(
    (
      updater: (frame: FrameConfig) => FrameConfig,
      options?: { rebuildSimulation?: boolean; seedOverride?: number },
    ) => {
      if (!hasFrameSelection) return;
      setFrames((prev) => {
        const next = [...prev];
        const updatedFrames = new Map<number, FrameConfig>();
        let mostRecentlyEditedIndex: number | null = null;
        for (const index of selectedFrameIndices) {
          const frame = prev[index];
          if (!frame) continue;
          const updated = normalizeFrameConfig(updater(frame), index);
          next[index] = updated;
          updatedFrames.set(index, updated);
          if (mostRecentlyEditedIndex === null) {
            mostRecentlyEditedIndex = index;
          }
        }
        if (mostRecentlyEditedIndex !== null) {
          lastEditedFrameIndexRef.current = mostRecentlyEditedIndex;
        }
        if (options?.rebuildSimulation) {
          for (const [index, updated] of updatedFrames) {
            rebuildFrameSimulation(index, updated, options.seedOverride);
          }
        }
        return next;
      });
    },
    [hasFrameSelection, rebuildFrameSimulation, selectedFrameIndices],
  );

  useFrameClipboard({
    frames,
    selectedFrameIndices,
    onPasteToSelected: updateSelectedFrames,
  });

  const handleReplaySimulation = useCallback(() => {
    if (!hasFrameSelection) return;
    updateSelectedFrames((frame) => frame, { rebuildSimulation: true });
  }, [hasFrameSelection, updateSelectedFrames]);

  const handleRegenerateSimulation = useCallback(() => {
    if (!hasFrameSelection) return;
    updateSelectedFrames(
      (frame) => {
        const nextSeed = frame.randomizeSeed ? createSeed() : frame.seed;
        return {
          ...frame,
          seed: nextSeed,
        };
      },
      { rebuildSimulation: true },
    );
  }, [hasFrameSelection, updateSelectedFrames]);

  const handleRegenerateObstacles = handleRegenerateSimulation;

  const handleRandomizeSelectedFrames = useCallback(() => {
    if (!hasFrameSelection) return;
    updateSelectedFrames((frame) => randomizeFrameConfig(frame), {
      rebuildSimulation: true,
    });
  }, [hasFrameSelection, updateSelectedFrames]);

  const handleResetSelectedFramesToDefault = useCallback(() => {
    if (!hasFrameSelection) return;
    updateSelectedFrames(
      (frame) => ({
        ...createDefaultFrame(frame.name),
        name: frame.name,
      }),
      { rebuildSimulation: true },
    );
  }, [hasFrameSelection, updateSelectedFrames]);

  const selectSingleFrame = useCallback(
    (index: number) => {
      setSelectedFrameIndices((prev) => {
        if (prev.length === 1 && prev[0] === index) return prev;
        return normalizeSelection([index], framesRef.current.length);
      });
    },
    [normalizeSelection],
  );

  const toggleFrameSelection = useCallback(
    (index: number) => {
      setSelectedFrameIndices((prev) => {
        if (prev.includes(index)) {
          return prev.filter((item) => item !== index);
        }
        return normalizeSelection([...prev, index], framesRef.current.length);
      });
    },
    [normalizeSelection],
  );

  const selectFrameRange = useCallback(
    (startIndex: number, endIndex: number) => {
      if (!Number.isFinite(startIndex) || !Number.isFinite(endIndex)) return;
      const start = Math.min(Math.floor(startIndex), Math.floor(endIndex));
      const end = Math.max(Math.floor(startIndex), Math.floor(endIndex));
      const next: number[] = [];
      for (let i = start; i <= end; i += 1) {
        next.push(i);
      }
      setSelectedFrameIndices(() =>
        normalizeSelection(next, framesRef.current.length),
      );
    },
    [normalizeSelection],
  );

  const clearSelection = useCallback(() => {
    setSelectedFrameIndices([]);
  }, []);

  const handleReorderFrames = useCallback(
    (startIndex: number, endIndex: number) => {
      if (startIndex === endIndex) return;
      setFrames((prev) => reorderArray(prev, startIndex, endIndex));
      setSelectedFrameIndices((prev) =>
        remapSelectionForMove(prev, startIndex, endIndex),
      );
      simulationRef.current = reorderArray(
        simulationRef.current,
        startIndex,
        endIndex,
      );
    },
    [],
  );

  const handleRenameFrame = useCallback((index: number, name: string) => {
    setFrames((prev) =>
      prev.map((frame, frameIndex) =>
        frameIndex === index ? { ...frame, name } : frame,
      ),
    );
  }, []);

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background font-sans">
      <aside className="h-full shrink-0">
        <LeftSidebar
          paper={paper}
          templateGrid={templateGrid}
          frames={frames}
          selectedFrameIndices={selectedFrameIndices}
          savedEntries={savedEntries}
          onPaperChange={setPaper}
          onTemplateGridChange={setTemplateGrid}
          onSelectFrame={selectSingleFrame}
          onToggleFrame={toggleFrameSelection}
          onSelectFrameRange={selectFrameRange}
          onReorderFrames={handleReorderFrames}
          onRenameFrame={handleRenameFrame}
          onSaveEntry={saveManualEntry}
          onLoadEntry={handleLoadEntry}
          onDeleteEntry={deleteEntry}
          onPreviewEntry={handlePreviewEntry}
          onPreviewEnd={handlePreviewEnd}
        />
      </aside>

      <main className="relative min-w-0 flex-1 bg-background">
        <Toolbar
          running={running}
          onToggleRunning={handleToggleRunning}
          onReplaySimulation={handleReplaySimulation}
          onRegenerateSimulation={handleRegenerateSimulation}
          stats={stats}
          onExportPng={handleExportPng}
          onExportSvg={handleExportSvg}
          onExportMp4={handleExportMp4}
          exportError={exportError}
          isExportingMp4={isExportingMp4}
          onDismissExportError={dismissExportError}
          zoomPercent={canvasZoomPercent}
          onSetZoomPercent={handleSetCanvasZoomPercent}
          onZoomToFit={handleZoomToFit}
          onOverlayBottomChange={handleToolbarOverlayBottomChange}
          hasFrameSelection={hasFrameSelection}
          selectedFramesCount={selectedFrameIndices.length}
        />

        <CanvasView
          key={`${boundsPx.width}-${boundsPx.height}-${gridLayout.rows}-${gridLayout.cols}`}
          simulationRef={simulationRef}
          framesRef={framesRef}
          gridLayout={gridLayout}
          templateGrid={templateGrid}
          selectedFrameIndices={selectedFrameIndices}
          onSelectFrame={selectSingleFrame}
          onToggleFrame={toggleFrameSelection}
          onClearSelection={clearSelection}
          running={running}
          canvasRef={canvasRef}
          viewCommand={canvasViewCommand}
          fitInsets={canvasFitInsets}
          onZoomChange={handleCanvasZoomChange}
        />
      </main>

      <aside className="h-full shrink-0 z-10">
        <RightSidebar
          frames={frames}
          selectedFrameIndices={selectedFrameIndices}
          onUpdateSelectedFrames={updateSelectedFrames}
          onRegenerateObstacles={handleRegenerateObstacles}
          onRandomizeSelectedFrames={handleRandomizeSelectedFrames}
          onResetSelectedFramesToDefault={handleResetSelectedFramesToDefault}
          unit={paper.unit}
        />
      </aside>
    </div>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function normalizePaper(
  paper: Partial<PaperSettings> | undefined,
): PaperSettings {
  const normalizedWidth = finiteNumber(paper?.width, DEFAULT_PAPER.width);
  const normalizedHeight = finiteNumber(paper?.height, DEFAULT_PAPER.height);
  const normalizedDpi = finiteNumber(paper?.dpi, DEFAULT_PAPER.dpi);
  return {
    width: normalizedWidth > 0 ? normalizedWidth : DEFAULT_PAPER.width,
    height: normalizedHeight > 0 ? normalizedHeight : DEFAULT_PAPER.height,
    unit:
      paper?.unit === 'in' || paper?.unit === 'cm' || paper?.unit === 'mm'
        ? paper.unit
        : DEFAULT_PAPER.unit,
    dpi: normalizedDpi > 0 ? normalizedDpi : DEFAULT_PAPER.dpi,
    includeCanvasUiInExport:
      typeof paper?.includeCanvasUiInExport === 'boolean'
        ? paper.includeCanvasUiInExport
        : DEFAULT_PAPER.includeCanvasUiInExport,
  };
}

function normalizeGrid(grid: TemplateGridSettings): TemplateGridSettings {
  return {
    rows: Math.max(1, Math.floor(grid?.rows ?? DEFAULT_TEMPLATE_GRID.rows)),
    cols: Math.max(1, Math.floor(grid?.cols ?? DEFAULT_TEMPLATE_GRID.cols)),
    gutter: Number.isFinite(grid?.gutter)
      ? grid.gutter
      : DEFAULT_TEMPLATE_GRID.gutter,
    showGutter:
      typeof grid?.showGutter === 'boolean'
        ? grid.showGutter
        : DEFAULT_TEMPLATE_GRID.showGutter,
    gutterAsObstacles:
      typeof grid?.gutterAsObstacles === 'boolean'
        ? grid.gutterAsObstacles
        : DEFAULT_TEMPLATE_GRID.gutterAsObstacles,
  };
}

function offsetGridLayout(
  grid: {
    rows: number;
    cols: number;
    cellWidth: number;
    cellHeight: number;
    gutterPx: number;
    cells: GridCellLayout[];
  },
  paddingPx: number,
): {
  rows: number;
  cols: number;
  cellWidth: number;
  cellHeight: number;
  gutterPx: number;
  cells: GridCellLayout[];
} {
  const inset = finiteNumber(paddingPx, 0);
  if (inset <= 0) {
    return grid;
  }
  return {
    ...grid,
    cells: grid.cells.map((cell) => ({
      ...cell,
      offset: {
        x: cell.offset.x + inset,
        y: cell.offset.y + inset,
      },
    })),
  };
}

function normalizeFrames(
  frames: FrameConfig[],
  targetLength: number,
): FrameConfig[] {
  const safeFrames = Array.isArray(frames) ? frames : [];
  const normalized = safeFrames.map((frame, index) =>
    normalizeFrameConfig(frame, index),
  );
  if (normalized.length >= targetLength) {
    return normalized.slice(0, Math.max(1, targetLength));
  }
  const next = [...normalized];
  while (next.length < Math.max(1, targetLength)) {
    next.push(createDefaultFrame(createFrameName(next.length)));
  }
  return next;
}

function normalizeFrameConfig(
  frame: FrameConfig | undefined,
  index: number,
): FrameConfig {
  const params = { ...DEFAULT_PARAMS, ...(frame?.params ?? {}) };
  const seed = frame?.seed;
  return {
    name:
      typeof frame?.name === 'string' && frame.name.trim().length > 0
        ? frame.name
        : createFrameName(index),
    params: {
      ...params,
      seedRotationStrength: finiteNumber(params.seedRotationStrength, 0),
      attractorTangentStrength: finiteNumber(
        params.attractorTangentStrength,
        0,
      ),
      pathSmoothing: clamp01(
        finiteNumber(params.pathSmoothing, DEFAULT_PARAMS.pathSmoothing),
      ),
    },
    obstacles: { ...DEFAULT_OBSTACLES, ...(frame?.obstacles ?? {}) },
    renderSettings: { ...DEFAULT_RENDER, ...(frame?.renderSettings ?? {}) },
    exportSettings: { ...DEFAULT_EXPORT, ...(frame?.exportSettings ?? {}) },
    seed: Number.isFinite(seed) ? Number(seed) : createSeed(),
    randomizeSeed:
      typeof frame?.randomizeSeed === 'boolean' ? frame.randomizeSeed : true,
  };
}

function resizeFrames(
  frames: FrameConfig[],
  targetLength: number,
  options?: { shouldCloneTemplate?: boolean; templateFrame?: FrameConfig },
): FrameConfig[] {
  if (!Number.isFinite(targetLength) || targetLength < 1) return frames;
  if (frames.length === targetLength) return frames;
  if (frames.length > targetLength) {
    return frames.slice(0, targetLength);
  }
  const next = [...frames];
  while (next.length < targetLength) {
    if (options?.shouldCloneTemplate) {
      next.push(createFrameFromTemplate(options.templateFrame, next.length));
      continue;
    }
    next.push(createDefaultFrame(createFrameName(next.length)));
  }
  return next;
}

function createFrameFromTemplate(
  templateFrame: FrameConfig | undefined,
  index: number,
): FrameConfig {
  if (!templateFrame) {
    return createDefaultFrame(createFrameName(index));
  }
  return normalizeFrameConfig(
    {
      ...templateFrame,
      name: createFrameName(index),
      params: { ...templateFrame.params },
      obstacles: { ...templateFrame.obstacles },
      renderSettings: { ...templateFrame.renderSettings },
      exportSettings: { ...templateFrame.exportSettings },
      seed: templateFrame.seed,
      randomizeSeed: templateFrame.randomizeSeed,
    },
    index,
  );
}

function reorderArray<T>(
  items: T[],
  startIndex: number,
  endIndex: number,
): T[] {
  if (!items.length) return items;
  if (
    startIndex < 0 ||
    endIndex < 0 ||
    startIndex >= items.length ||
    endIndex >= items.length
  ) {
    return items;
  }
  const next = [...items];
  const [removed] = next.splice(startIndex, 1);
  next.splice(endIndex, 0, removed);
  return next;
}

function remapSelectionForMove(
  selection: number[],
  from: number,
  to: number,
): number[] {
  if (!selection.length || from === to) return selection;
  const next: number[] = [];
  const seen = new Set<number>();
  for (const index of selection) {
    let mapped = index;
    if (index === from) {
      mapped = to;
    } else if (from < to && index > from && index <= to) {
      mapped = index - 1;
    } else if (from > to && index >= to && index < from) {
      mapped = index + 1;
    }
    if (!seen.has(mapped)) {
      seen.add(mapped);
      next.push(mapped);
    }
  }
  return next;
}

function createGutterObstacles(
  bounds: Bounds,
  padding: number,
  edges: { top: boolean; bottom: boolean; left: boolean; right: boolean },
): Polygon[] {
  const inset = Math.min(
    Math.max(0, padding),
    bounds.width / 2,
    bounds.height / 2,
  );
  if (inset <= 0) return [];
  const w = bounds.width;
  const h = bounds.height;
  const polygons: Polygon[] = [];
  if (edges.top) {
    polygons.push([
      { x: 0, y: 0 },
      { x: w, y: 0 },
      { x: w, y: inset },
      { x: 0, y: inset },
    ]);
  }
  if (edges.bottom) {
    polygons.push([
      { x: 0, y: h - inset },
      { x: w, y: h - inset },
      { x: w, y: h },
      { x: 0, y: h },
    ]);
  }
  if (edges.left) {
    polygons.push([
      { x: 0, y: inset },
      { x: inset, y: inset },
      { x: inset, y: h - inset },
      { x: 0, y: h - inset },
    ]);
  }
  if (edges.right) {
    polygons.push([
      { x: w - inset, y: inset },
      { x: w, y: inset },
      { x: w, y: h - inset },
      { x: w - inset, y: h - inset },
    ]);
  }
  return polygons;
}

function finiteNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

const SEED_PLACEMENTS = ['edge', 'scatter'] as const;
const SEED_EDGES = ['top', 'right', 'bottom', 'left'] as const;

function randomizeFrameConfig(frame: FrameConfig): FrameConfig {
  const influenceRadius = randomInt(45, 170);
  const killRadius = randomInt(
    Math.max(4, Math.floor(influenceRadius * 0.18)),
    Math.max(8, Math.floor(influenceRadius * 0.46)),
  );
  const seedPlacement = randomItem(SEED_PLACEMENTS);
  const minVertices = randomInt(3, 7);
  const maxVertices = randomInt(minVertices, 9);
  const minRadius = randomStep(0.2, 1.6, 0.1);
  const maxRadius = randomStep(Math.max(minRadius + 0.2, 0.4), 3, 0.1);

  return {
    ...frame,
    params: {
      ...frame.params,
      influenceRadius,
      killRadius,
      stepSize: randomStep(2, 12, 0.5),
      maxNodes: randomInt(1800, 9000),
      seedCount: randomInt(1, 7),
      seedSpread: randomInt(10, 95),
      seedPlacement,
      seedEdge: randomItem(SEED_EDGES),
      seedAngle: seedPlacement === 'edge' ? randomInt(-180, 180) : 0,
      attractorCount: randomInt(300, 2600),
      stepsPerFrame: randomInt(1, 8),
      avoidObstacles: Math.random() > 0.15,
      seedRotationStrength: randomStep(-1.2, 1.2, 0.05),
      attractorTangentStrength: randomStep(-1.2, 1.2, 0.05),
      pathSmoothing: randomStep(0, 0.45, 0.01),
    },
    obstacles: {
      ...frame.obstacles,
      count: randomInt(0, 7),
      minVertices,
      maxVertices,
      minRadius,
      maxRadius,
      margin: randomStep(0.1, 1.2, 0.1),
    },
    seed: createSeed(),
  };
}

function randomInt(min: number, max: number): number {
  const low = Math.ceil(Math.min(min, max));
  const high = Math.floor(Math.max(min, max));
  if (high <= low) return low;
  return Math.floor(Math.random() * (high - low + 1)) + low;
}

function randomStep(min: number, max: number, step: number): number {
  const low = Math.min(min, max);
  const high = Math.max(min, max);
  if (high === low) return Number(low.toFixed(4));
  const safeStep = step > 0 ? step : 1;
  const totalSteps = Math.max(1, Math.round((high - low) / safeStep));
  const selectedStep = randomInt(0, totalSteps);
  const value = Math.min(high, low + selectedStep * safeStep);
  return Number(value.toFixed(4));
}

function randomItem<T>(items: readonly [T, ...T[]]): T {
  return items[randomInt(0, items.length - 1)];
}
