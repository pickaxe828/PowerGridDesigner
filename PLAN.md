# CPG-Circuit — Board Designer Plan

## Overview

A graphical designer for Create: Power Grid circuit boards. Design circuits visually, export as NBT for in-game import.

**Approach**: Fork of [PearAPI/PowerGridDesigner](https://github.com/PearAPI/PowerGridDesigner) (commit `b361cb5`), adapted and extended.

---

## Tech Stack

- **React 19 + TypeScript 5.9 + Vite 8**
- **@xyflow/react** (React Flow) — DOM/SVG canvas
- **zustand** — state management
- **Tailwind CSS v4** (existing)
- **shadcn/ui** — to replace/or augment existing custom UI
- **prismarine-nbt** — Minecraft NBT binary
- **pako** — gzip compression
- **jszip** — multi-board ZIP packaging
- **buffer** — polyfill for browser

---

## Design Decisions (source of truth)

| Decision | Choice | Reasoning |
|---|---|---|
| **Canvas** | React Flow | DOM/SVG-native, pan/zoom/drag. No `<canvas>`. |
| **Grid background** | HTML `<canvas>` (existing) | Was dots, now square grid with active board highlighting. |
| **Components** | All 23 types (original fork had 18, 5 missing) | Full parity with mod. |
| **Simulation** | Include DC solver (fork already has one) | Existing MNA solver kept as-is. |
| **Board scope** | Single-board for MVP (multi-board planned) | No component spans board boundaries. Cross-board vias planned. |
| **Wire traces** | Directional 4-bit/cell | Matches mod's TraceMatrix format. |
| **NBT export** | Single `.nbt` (gzip) or multi-board `.zip` | Fork already has single-board export. |
| **UI components** | Existing Tailwind (shadcn/ui planned) | Fork has custom panels. |

---

## What Was in the Original Fork (18/23 components)

### Passive (5/5 — complete)
resistor, capacitor, inductor, diode, varistor

### Switching (3/6 — missing 3)
switch, button, redstone_relay
Already present: relay_spdt, relay_dpdt, potentiometer

### Active (6/6 — complete)
bjt_npn, bjt_pnp, static_induction_transistor (vfet), electron_tube, regulator_tube, barretter_tube

### Display & Utility (4/6 — missing 2)
voltage_gauge, current_gauge
Already present: light_bulb, neon_bulb, connector, via

> **Total**: 18 implemented + 5 missing = 23 total in-game components

---

## Known Bugs

| Bug | Details |
|-----|---------|
| `light_bulb` key mismatch | `ComponentType` is `'light_bulb'`, but `App.tsx` nodeTypes maps `lv_bulb: LVBulbNode`. LV Bulb nodes won't render. Fix: change `lv_bulb` to `light_bulb` in `App.tsx:48`. |
| Global mouseUp doesn't call `paintWire` for single-cell commits | Single-click wire cells released outside canvas won't commit. Edge case. |

---

## Implementation Phases

### Phase 1: Fork Familiarization + Housekeeping
- [x] Audit all existing files, understand the full codebase
- [ ] Set up shadcn/ui in the existing Tailwind config
- [ ] Clean up unused assets

### Phase 2: Directional Wire Traces
- [x] Add `TraceDir` enum and direction helpers to `types/circuit.ts`
- [x] Change `wireGrid` from `Map<string, boolean>` to `Map<string, number>` (4-bit mask)
- [x] `paintWire` with directional connections, `paintLine` for straight lines
- [x] Directional trace rendering in `WireGridOverlay.tsx` (square body + arms)
- [x] NBT export as `TraceMatrix` format in `serializeBoard.ts`

### Phase 3: Wire Painting UX
- [x] Axis-constrained straight-line drawing
- [x] Preview-only during drag, commit on mouseUp or second click
- [x] Dynamic axis switching mid-drag
- [x] Middle mouse always pans
- [x] Custom fit-view button includes wire cells in bounding box

### Phase 4: Board / Grid
- [x] Square grid (replaced dot grid)
- [x] Grid lines offset to match wire cell edges
- [x] Active board highlighting (home board + boards with content)
- [x] Home board auto-relocation on first placement
- [x] `defaultViewport` instead of `fitView` for empty canvas

### Phase 5: UI Polish
- [x] Rename "Select" → "Navigate", `H`/`ESC` shortcut
- [x] Layer toggle moved to toolbar with pill switch + kbd
- [x] Material Symbols icons for general tools + connector/via
- [x] Unified `<kbd>` shortcut styling
- [x] Vite dev base path fix
- [x] Wire color white/gray

### Phase 6: New Component Types (5 missing)
- [ ] `switch` — manual toggle switch (2 terminals)
- [ ] `button` — momentary push button (2 terminals)
- [ ] `redstone_relay` — redstone-controlled switch (2 terminals)
- [ ] `voltage_gauge` — voltage measurement (2 terminals)
- [ ] `current_gauge` — current measurement (2 terminals)

### Phase 7: Multi-Board Support
- [ ] Board extent tracking in store
- [ ] `BoardCoord` helper functions
- [ ] Cross-board via auto-placement when painting across boundaries
- [ ] Multi-board ZIP export
- [ ] Board boundary validation (no component spans two boards)

### Phase 8: shadcn/ui Migration
- [ ] Rewrite `ComponentPalette.tsx` with shadcn Sidebar, Button, Tooltip
- [ ] Rewrite `PropertiesPanel.tsx` with shadcn Card, Input, Label, Select
- [ ] Rewrite `Toolbar.tsx` export dialog with shadcn Dialog
- [ ] Add toast notifications (Sonner)

### Phase 9: SVG Grid Background
- [ ] Replace `<canvas>` grid background with SVG `<pattern>` + board boundary `<line>`s
- [ ] Remove canvas dependency entirely

### Phase 10: Polish + Verification
- [ ] Fix `light_bulb` / `lv_bulb` key mismatch bug
- [ ] Fix global mouseUp single-cell commit edge case
- [ ] Keyboard shortcut consistency audit
- [ ] Verify NBT output round-trips through the mod
- [ ] Test cross-board via placement and cleanup

---

## Keyboard Shortcuts (current)

| Key | Action |
|-----|--------|
| `H` / `ESC` | Navigate mode (move canvas + select nodes) |
| `W` | Wire Paint mode |
| `E` | Eraser mode |
| `R` | Rotate selected component (when selected) |
| `F` | Flip layer (front/back) |
| `DEL` / `Backspace` | Delete selected |
| Component keys | Equip component from registry |

> **TODO — V / Select mode**: A separate "Select" mode (`V` key) should be distinct from "Navigate" (`H`/`ESC`). Navigate = pan + click to inspect. Select = click to select component + show properties. Not yet implemented.

---

## Data Model (matching PowerGrid NBT schema)

### Wire Traces — TraceMatrix

Per 16x16 board chunk, stored as `LongArrayTag`:

- **Grid**: 16 × 16 cells, each with 4 directional bits
- **Bit layout**: bit+0=UP, bit+1=DOWN, bit+2=LEFT, bit+3=RIGHT
- **Cell bit index**: `(y * 16 + x) * 4`
- **Packed into**: 16 Java `long`s (1024 bits total, 1 long per row)
- **Keys**: `"Front"` / `"Back"` (one per layer)
- **Flag**: `"FullPixelTraces"` = `byte(0)` (always false for modern format)

### Component NBT

```
"Id": StringTag          → "powergrid:<type>"
"X", "Y": IntTag         → local position within board chunk (0-15)
"UUID": IntArrayTag      → 4 random ints
"Properties": CompoundTag
  "powergrid:orientable": IntTag        (0=N, 1=S, 2=E, 3=W)
  "powergrid:resistor_value": FloatTag
  "powergrid:capacitor_value": FloatTag
  "powergrid:label": StringTag
  ...
```

### Board NBT Root

```
CompoundTag {
  "Components": ListTag { ... },
  "Front": LongArrayTag (16 longs),
  "Back": LongArrayTag (16 longs),
  "FullPixelTraces": ByteTag (0),
  "Name": StringTag
}
```

---

## Multi-Board Architecture (planned)

- World coordinates are continuous. Each 16×16 block is one board chunk.
- `BoardCoord = { boardX, boardY, localX, localY }` where `localX/Y` ∈ [0, 15].
- **Constraint**: A component's bounding box must fit entirely within one board chunk.
- **Cross-board wires**: When painting a trace from `(15, y)` → `(0, y)` (or vertically):
  1. Detect the board boundary crossing
  2. Auto-place a `ViaComponent` at `(15, y)` on origin board
  3. Auto-place a `ViaComponent` at `(0, y)` on destination board
  4. Set corresponding trace direction bits on the boundary cells
  5. Track auto-placed vias so eraser can clean them up
