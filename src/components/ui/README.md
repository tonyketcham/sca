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
- `SwitchControlRow`: standardized `Label + Switch` control row with optional row/label/switch class overrides.
- `LabeledField`: standardized vertical field layout (`Label` + control) for numeric/select/input controls.

Use this when exposing color controls in inspector sections to ensure consistent spacing and affordance.
Use `SwitchControlRow` whenever a toggle appears in a control section to keep label typography and row behavior aligned.
Use `LabeledField` for all sidebar form fields to keep label spacing and `htmlFor` wiring consistent.

## Tokens

- `--sidebar-width`: semantic width token used by `SidebarShell` for explorer/inspector panel sizing.
