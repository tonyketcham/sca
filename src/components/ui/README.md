# UI Primitives

Shared, composable primitives for the app shell and control panels.

## Sidebar primitives

- `SidebarShell`: fixed-width explorer/inspector container with left/right border variants.
- `SidebarHeader`: standardized top bar for sidebar titles and trailing metadata.

Use these for all full-height side panels to keep width, backdrop, and border treatment consistent.

## Section primitives

- `SectionHeading`: mono uppercase section title used across explorer/inspector/layers surfaces.

Use this for internal panel section labels instead of repeating heading utility classes.

## Surface primitives

- `InsetPanel`: inset, bordered surface for grouped controls or nested panel blocks.
  - `tone="default"`: standard border (`border-border`)
  - `tone="subtle"`: softer border (`border-border/50`)
  - `padding="sm" | "md"` for compact vs default spacing

Use this for reusable control group containers (for example, seed controls and archive form blocks).

## Field primitives

- `ColorSwatchField`: compact labeled color swatch + native color input control.

Use this when exposing color controls in inspector sections to ensure consistent spacing and affordance.
