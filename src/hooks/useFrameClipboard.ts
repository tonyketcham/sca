import { useCallback, useEffect, useRef } from 'react';
import type { FrameConfig } from '../types/ui';

/** Settings payload stored in the clipboard (excludes identity fields). */
type FrameSettingsPayload = Omit<FrameConfig, 'name' | 'seed'>;

/**
 * Provides Cmd/Ctrl+C and Cmd/Ctrl+V keyboard shortcuts for copying one
 * frame's settings and pasting them onto all currently-selected frames.
 *
 * - **Copy** captures the primary (first) selected frame's settings.
 * - **Paste** applies the copied settings to every selected frame, preserving
 *   each frame's `name` and `seed`.
 *
 * The shortcuts are ignored when focus is inside an input, textarea, select, or
 * contentEditable element so they don't interfere with normal text editing.
 */
export function useFrameClipboard(options: {
  frames: ReadonlyArray<FrameConfig>;
  selectedFrameIndices: ReadonlyArray<number>;
  onPasteToSelected: (
    updater: (frame: FrameConfig) => FrameConfig,
    options: { rebuildSimulation: boolean },
  ) => void;
}): void {
  const clipboardRef = useRef<FrameSettingsPayload | null>(null);

  const { frames, selectedFrameIndices, onPasteToSelected } = options;

  /* ── Copy ──────────────────────────────────────────────────────────── */

  const handleCopy = useCallback(() => {
    const primaryIndex = selectedFrameIndices[0];
    if (primaryIndex === undefined) return;
    const frame = frames[primaryIndex];
    if (!frame) return;

    clipboardRef.current = {
      params: { ...frame.params },
      obstacles: { ...frame.obstacles },
      renderSettings: { ...frame.renderSettings },
      exportSettings: { ...frame.exportSettings },
      randomizeSeed: frame.randomizeSeed,
    };
  }, [frames, selectedFrameIndices]);

  /* ── Paste ─────────────────────────────────────────────────────────── */

  const handlePaste = useCallback(() => {
    const payload = clipboardRef.current;
    if (!payload) return;

    onPasteToSelected(
      (frame) => ({
        ...frame,
        params: { ...payload.params },
        obstacles: { ...payload.obstacles },
        renderSettings: { ...payload.renderSettings },
        exportSettings: { ...payload.exportSettings },
        randomizeSeed: payload.randomizeSeed,
      }),
      { rebuildSimulation: true },
    );
  }, [onPasteToSelected]);

  /* ── Keyboard listener ─────────────────────────────────────────────── */

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName;
        if (
          tag === 'INPUT' ||
          tag === 'TEXTAREA' ||
          tag === 'SELECT' ||
          target.isContentEditable
        ) {
          return;
        }
      }

      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod) return;

      if (e.key === 'c') {
        e.preventDefault();
        handleCopy();
      } else if (e.key === 'v') {
        e.preventDefault();
        handlePaste();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleCopy, handlePaste]);
}
