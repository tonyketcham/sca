---
name: plotter-safe-simulation
description: Enforce simulation quality invariants and plotter-safe SVG output. Use when modifying the space colonization engine (spaceColonization.ts, simulationState.ts), SVG export (svgExporter.ts), or adding new growth/placement algorithms. Prevents hot spots, overlapping geometry, and duplicate nodes.
---

# Plotter-Safe Simulation Output

## Context

This app generates organic growth patterns via space colonization and exports SVG for pen plotters. Pen plotters physically trace every path element — overlapping or near-duplicate geometry causes the pen to repeatedly traverse the same spot, damaging paper and wasting time.

## Simulation Invariants

When modifying `src/engine/spaceColonization.ts` or adding new growth algorithms:

### 1. Minimum-distance node placement

Every new candidate node **must** be checked against all existing nodes before insertion. Skip if closer than `stepSize * 0.5` to any existing node.

```typescript
// Pattern: proximity gate before node insertion
const minDistSq = minDistanceSquared(candidate, nextNodes)
const proximityThresholdSq = params.stepSize * params.stepSize * 0.25
if (minDistSq < proximityThresholdSq) {
  continue
}
```

**Why:** Without this, a parent node surrounded by a dense attractor cluster will create hundreds of children at the exact same coordinates across successive iterations. Each attractor is consumed slowly (a few per step), while the averaged influence direction stays constant — producing identical candidates every step.

### 2. No zero-length segments

If `normalize()` returns a zero vector (influences cancel out), the candidate lands on top of the parent. The proximity check above catches this, but any new placement logic must handle the zero-direction case explicitly.

### 3. Guard against fan-out accumulation

When a single parent is influenced by many attractors from a similar direction:
- The child node overshoots or lands at an angle where it isn't closer to the remaining attractors
- The parent keeps being re-selected as the closest node
- Result: unbounded duplicate children from one parent

The proximity check is the primary defense. If refactoring the influence loop, preserve this invariant.

## SVG Export Invariants

When modifying `src/export/svgExporter.ts`:

### 1. No duplicate `<line>` elements

Every `<line>` in the SVG corresponds to a parent→child edge. If the simulation invariants above hold, duplicates won't exist. But if the export logic is refactored (e.g., path merging, curve fitting), verify no segment is emitted more than once.

### 2. Plotter-friendly geometry

- Avoid sub-pixel segments (length < 0.5px) — they cause pen dwell marks
- Prefer `<path>` with connected subpaths over individual `<line>` elements when optimizing for plotter travel distance
- Keep `stroke-linecap="round"` for consistent line endings

## Verification Checklist

When making changes to the simulation or export:

- [ ] Run a simulation to completion with default parameters
- [ ] Export SVG and check: no parent should have more than ~5 child segments (use browser devtools or script to count)
- [ ] Segment lengths should all be approximately `stepSize` (±10%)
- [ ] No coordinate appears as an endpoint in more than ~5 segments

### Quick SVG audit script

```bash
# Count segments per shared start point — values >5 indicate hot spots
python3 -c "
import re
from collections import Counter
with open('YOUR_FILE.svg') as f:
    lines = re.findall(r'x1=\"([^\"]+)\" y1=\"([^\"]+)\"', f.read())
counts = Counter(lines)
hot = [(k,v) for k,v in counts.most_common(20) if v > 5]
print('Hot spots:', hot if hot else 'None found')
"
```
