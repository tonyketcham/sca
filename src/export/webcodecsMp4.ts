import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import {
  renderComposite,
  renderSimulation,
  type GridLayout,
  type RenderSettings,
} from '../render/canvasRenderer';
import type {
  SimulationParams,
  SimulationState,
} from '../engine/simulationState';
import { createSimulationState } from '../engine/simulationState';
import { createSeededRng } from '../utils/rng';
import { stepSimulation } from '../engine/spaceColonization';
import type { FrameConfig } from '../types/ui';

type Mp4Options = {
  state: SimulationState;
  params: SimulationParams;
  settings: RenderSettings;
  fps: number;
  durationSeconds: number;
  durationMode: 'fixed' | 'auto';
  stepsPerFrame: number;
  seed: number;
};

export async function encodeSimulationMp4(options: Mp4Options): Promise<Blob> {
  if (!('VideoEncoder' in window)) {
    throw new Error('WebCodecs VideoEncoder is not available in this browser.');
  }

  const width = Math.round(options.state.bounds.width);
  const height = Math.round(options.state.bounds.height);
  const frameCount =
    options.durationMode === 'fixed'
      ? Math.max(1, Math.floor(options.durationSeconds * options.fps))
      : 0;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) {
    throw new Error('Unable to create 2D canvas for MP4 export.');
  }

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    fastStart: 'in-memory',
    video: {
      codec: 'avc',
      width,
      height,
      frameRate: options.fps,
    },
  });

  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (error) => {
      throw error;
    },
  });

  encoder.configure({
    codec: 'avc1.42E01F',
    width,
    height,
    bitrate: width * height * options.fps * 1.5,
    framerate: options.fps,
  });

  const rng = createSeededRng(options.seed + 1);
  const state = createSimulationState(
    { width, height },
    options.params,
    options.state.obstacles.map((polygon) =>
      polygon.map((point) => ({ ...point })),
    ),
    rng,
  );
  const frameDurationUs = 1_000_000 / options.fps;

  const maxFrames =
    options.durationMode === 'auto'
      ? Math.max(
          120,
          Math.ceil(
            options.params.maxNodes / Math.max(1, options.stepsPerFrame),
          ) * 4,
        )
      : frameCount;

  let frameIndex = 0;
  while (
    frameIndex < maxFrames &&
    (options.durationMode === 'fixed' || !state.completed)
  ) {
    if (!state.completed) {
      for (let i = 0; i < options.stepsPerFrame; i += 1) {
        stepSimulation(state, options.params);
        if (state.completed) break;
      }
    }

    renderSimulation(ctx, state, {
      canvasWidth: width,
      canvasHeight: height,
      view: { pan: { x: 0, y: 0 }, zoom: 1 },
      mode: 'export',
      settings: options.settings,
    });

    const bitmap = await createImageBitmap(canvas);
    const frame = new VideoFrame(bitmap, {
      timestamp: frameIndex * frameDurationUs,
    });
    encoder.encode(frame, { keyFrame: frameIndex % options.fps === 0 });
    frame.close();
    bitmap.close();
    frameIndex += 1;
  }

  await encoder.flush();
  muxer.finalize();

  const buffer = muxer.target.buffer;
  return new Blob([buffer], { type: 'video/mp4' });
}

type CompositeMp4Options = {
  frames: FrameConfig[];
  grid: GridLayout;
  states: SimulationState[];
  canvasWidth: number;
  canvasHeight: number;
  includeCanvasUi: boolean;
  selectedFrameIndices: number[];
  fps: number;
  durationSeconds: number;
  durationMode: 'fixed' | 'auto';
  stepsPerFrame: number;
};

export async function encodeCompositeMp4(
  options: CompositeMp4Options,
): Promise<Blob> {
  if (!('VideoEncoder' in window)) {
    throw new Error('WebCodecs VideoEncoder is not available in this browser.');
  }

  const width = Math.max(1, Math.round(options.canvasWidth));
  const height = Math.max(1, Math.round(options.canvasHeight));
  const frameCount =
    options.durationMode === 'fixed'
      ? Math.max(1, Math.floor(options.durationSeconds * options.fps))
      : 0;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) {
    throw new Error('Unable to create 2D canvas for MP4 export.');
  }

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    fastStart: 'in-memory',
    video: {
      codec: 'avc',
      width,
      height,
      frameRate: options.fps,
    },
  });

  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (error) => {
      throw error;
    },
  });

  encoder.configure({
    codec: 'avc1.42E01F',
    width,
    height,
    bitrate: width * height * options.fps * 1.5,
    framerate: options.fps,
  });

  const frameStates = options.frames.map((frame, index) => {
    const cell = options.grid.cells[index];
    const bounds = cell?.bounds ?? { width: 0, height: 0 };
    const source = options.states[index];
    const obstacles = source
      ? source.obstacles.map((polygon) =>
          polygon.map((point) => ({ ...point })),
        )
      : [];
    const rng = createSeededRng(frame.seed + 1);
    return createSimulationState(bounds, frame.params, obstacles, rng);
  });

  const frameDurationUs = 1_000_000 / options.fps;
  const autoFrames = options.frames.reduce((max, frame) => {
    const estimate =
      Math.ceil(frame.params.maxNodes / Math.max(1, options.stepsPerFrame)) * 4;
    return Math.max(max, estimate);
  }, 0);
  const maxFrames =
    options.durationMode === 'auto' ? Math.max(120, autoFrames) : frameCount;

  let frameIndex = 0;
  while (
    frameIndex < maxFrames &&
    (options.durationMode === 'fixed' ||
      frameStates.some((state) => !state.completed))
  ) {
    for (let index = 0; index < frameStates.length; index += 1) {
      const state = frameStates[index];
      const frame = options.frames[index];
      if (!state || !frame || state.completed) continue;
      for (let i = 0; i < options.stepsPerFrame; i += 1) {
        stepSimulation(state, frame.params);
        if (state.completed) break;
      }
    }

    renderComposite(ctx, frameStates, {
      canvasWidth: width,
      canvasHeight: height,
      view: { pan: { x: 0, y: 0 }, zoom: 1 },
      mode: 'export',
      grid: options.grid,
      frames: options.frames,
      includeCanvasUi: options.includeCanvasUi,
      selectedFrameIndices: options.selectedFrameIndices,
    });

    const bitmap = await createImageBitmap(canvas);
    const frame = new VideoFrame(bitmap, {
      timestamp: frameIndex * frameDurationUs,
    });
    encoder.encode(frame, { keyFrame: frameIndex % options.fps === 0 });
    frame.close();
    bitmap.close();
    frameIndex += 1;
  }

  await encoder.flush();
  muxer.finalize();

  const buffer = muxer.target.buffer;
  return new Blob([buffer], { type: 'video/mp4' });
}
