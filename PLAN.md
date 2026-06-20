# CPG-Circuit — Board Designer MVP Plan

## Overview

A graphical designer for Create: Power Grid circuit boards. Design circuits visually, export as NBT for in-game import.

**Approach**: Fork of [PearAPI/PowerGridDesigner](https://github.com/PearAPI/PowerGridDesigner), adapted and extended.

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
| **Canvas** | React Flow (already in fork) | DOM/SVG-native, handles pan/zoom/drag. No `<canvas>`. |
| **Grid background** | SVG (currently `<canvas>` — needs replacement) | Must be pure SVG per requirements; no `<canvas>`. |
| **Components** | All 24+ types (fork has 18, need 6+ more) | Full parity with mod. |
| **Simulation** | Include DC solver (fork already has one) | Adapted existing MNA solver. |
| **Board scope** | Multi-board with guards (fork is single-board only) | No component spans board boundaries. Cross-board wire painting auto-places edge vias. |
| **Wire traces** | Directional 4-bit/cell (fork uses simple on/off) | Must match mod's TraceMatrix format. |
| **NBT export** | Single `.nbt` (gzip) or multi-board `.zip` | Fork already has single-board export. |
| **UI components** | Mix of existing Tailwind + migrate to shadcn/ui where needed | Fork has custom panels; migrate toolbar, dialog, palette to shadcn. |

---

## What We Keep From the Fork

### Keep as-is (minor polish):
- **Type definitions** — enums, interfaces, `COMPONENT_REGISTRY` (~18 types)
- **Component node files** — all 18 existing node components (resistor, capacitor, etc.)
- **BaseNode.tsx** — shared node shell with rotation, pins, labels
- **Simulation** — netlist builder, MNA DC solver, matrix solver
- **Zustand store** — circuit store (extend for multi-board)
- **Keyboard shortcuts**
- **Buffer polyfill** in main.tsx
- **Tailwind config + index.css**

### Keep but adapt:
- **`pipeline/serializeBoard.ts`** — needs TraceMatrix directional format + multi-board
- **`pipeline/nbtCompiler.ts`** — needs multi-board loop logic
- **`pipeline/coordinateMapper.ts`** — needs board chunk addressing
- **`App.tsx`** — add multi-board canvas, new panels, shadcn components
- **`Toolbar.tsx`** — rewrite export dialog with shadcn
- **`ComponentPalette.tsx`** — rewrite with shadcn + add new components
- **`PropertiesPanel.tsx`** — rewrite with shadcn + multi-board awareness
- **Wire grid**: paint + store currently lacks directional bits — extend
- **BoardBackground.tsx** — replace `<canvas>` with SVG `<pattern>` approach

---

## What We Need to Build / Add

### New:
| Feature | Details |
|---|---|
| **Directional TraceMatrix** | 4-bit-per-cell (UP/DOWN/LEFT/RIGHT) serialization matching mod |
| **SVG grid background** | Replace `<canvas>` with SVG pattern + board boundary lines |
| **Multi-board store** | Board extent tracking, component→board mapping |
| **Cross-board via logic** | Auto-place vias when wire crosses a board boundary |
| **6+ new component types** | electron_tube, vfet, bjt_npn, bjt_pnp, regulator_tube, barretter_tube, label, neon_bulb, gauges |
| **shadcn/ui panels** | Replace component palette, properties panel, toolbar + export dialog with shadcn components |

### Modified:
| Existing | Change |
|---|---|
| `WireGridOverlay.tsx` | Render directional traces instead of filled rects |
| `serializeBoard.ts` | Output `TraceMatrix` directional format |
| `circuitStore.ts` | Add board extent, directional wire bits, cross-board actions |
| `App.tsx` | Integrate new panels, multi-board mouse handling |
| `export.ts` | Multi-board ZIP export |

---

## Data Model (matching PowerGrid NBT schema)

### Wire Traces — TraceMatrix

Per 16x16 board chunk, stored as `LongArrayTag`:

- **Grid**: 16 × 16 cells, each with 4 directional bits
- **Bit layout**: [0]=UP, [1]=DOWN, [2]=LEFT, [3]=RIGHT
- **Cell bit index**: `(y * 16 + x) * 4`
- **Packed into**: 16 Java `long`s (1024 bits total)
- **Keys**: `"Front"` / `"Back"` (one per layer)

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
  "Schematic": CompoundTag {
    "Front": LongArrayTag,
    "Back": LongArrayTag,
    "Components": ListTag { ... placed components ... }
  }
}
```

---

## Multi-Board Architecture

- World coordinates are continuous. Each 16×16 block is one board chunk.
- `BoardCoord = { boardX, boardY, localX, localY }` where `localX/Y` ∈ [0, 15].
- **Constraint**: A component's bounding box must fit entirely within one board chunk.
- **Cross-board wires**: When painting a trace from `(15, y)` → `(0, y)` (or vertically):
  1. Detect the board boundary crossing
  2. Auto-place a `ViaComponent` at `(15, y)` on origin board
  3. Auto-place a `ViaComponent` at `(0, y)` on destination board
  4. Set corresponding trace direction bits on the boundary cells
  5. Track auto-placed vias so eraser can clean them up

---

## Implementation Phases

### Phase 1: Fork Familiarization + Housekeeping
- Audit all existing files, understand the full codebase
- Set up shadcn/ui in the existing Tailwind config
- Clean up unused assets

### Phase 2: Multi-Board Store + Types
- Add board extent tracking to Zustand store
- Add directional wire bit storage (extend wire grid from `bool` to `4-bit mask`)
- Add `BoardCoord` helper functions
- Add cross-board via tracking

### Phase 3: SVG Grid Background
- Replace `BoardBackground.tsx` canvas with SVG `<pattern>` for dots + `<line>` for board boundaries
- Remove canvas dependency entirely

### Phase 4: Directional Wire Traces
- Rewrite `WireGridOverlay.tsx` to render directional cross/plus shapes
- Update wire painting hooks to track direction
- Update serialization pipeline to output TraceMatrix format

### Phase 5: Cross-Board Via Logic
- `hooks/useCrossBoardVias.ts` — detect boundary crossings, auto-place/remove vias
- Integrate with wire painting flow

### Phase 6: shadcn/ui Panels
- Rewrite `ComponentPalette.tsx` with shadcn Sidebar, Button, Tooltip, ToggleGroup
- Rewrite `PropertiesPanel.tsx` with shadcn Card, Input, Label, Select
- Rewrite `Toolbar.tsx` with shadcn Dialog for export modal
- Add toast notifications

### Phase 7: New Component Types
- Add the 6+ missing component nodes to `components/nodes/`
- Register them in `COMPONENT_REGISTRY`
- Add their pin definitions, property schemas, and SVG bodies

### Phase 8: Multi-Board Export
- Update `serializeBoard.ts` for TraceMatrix format
- Build board chunk loop in export pipeline
- ZIP packing for multi-board

### Phase 9: Polish + Verification
- Keyboard shortcut consistency
- Verify NBT output structure against mod's expected format
- Test cross-board via placement and cleanup

### Keyboard Shortcuts (current)
| Key | Action |
|-----|--------|
| `H` / `ESC` | Navigate mode (move canvas + select nodes) |
| `W` | Wire Paint mode |
| `E` | Eraser mode |
| `R` | Rotate selected component |
| `F` | Flip layer (front/back) |
| `DEL` / `Backspace` | Delete selected |
| Component keys | Equip component from registry |

> **TODO — V / Select mode**: A separate "Select" mode (`V` key) should be distinct from "Navigate" (`H`/`ESC`).
> Navigate = pan canvas + click to inspect. Select = click to select component + show properties.
> Not yet implemented — currently both behaviors are collapsed into one mode.

---

## Component Types (complete set — 24+)

### Passive (fork has all)
resistor, capacitor, inductor, diode, varistor

### Switching (fork has most)
switch, button, relay_spdt, relay_dpdt, redstone_relay, potentiometer

### Active (fork has ~2 of 6; need to add)
bjt_npn, bjt_pnp, vfet, electron_tube, regulator_tube, barretter_tube

### Display & Utility (fork has ~2 of 7; need to add)
light_bulb, neon_bulb, connector, via, label, voltage_gauge, current_gauge
