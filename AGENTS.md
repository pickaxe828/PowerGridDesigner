# AGENTS.md

## Project

**PowerGrid Designer** — a visual circuit board designer for the Minecraft mod **Create: Power Grid**. Design circuits on a grid canvas, paint directional wire traces, and export designs as Minecraft-compatible NBT files (gzip `.nbt`) or multi-board `.zip` archives. Fork of [PearAPI/PowerGridDesigner](https://github.com/PearAPI/PowerGridDesigner).

## Commands

| Command | Description |
|---|---|
| `pnpm dev` | Start Vite dev server with HMR |
| `pnpm build` | Type-check (`tsc -b`) then Vite production build |
| `pnpm lint` | ESLint on all `.ts`/`.tsx` files |
| `pnpm preview` | Preview production build locally |

There is **no test framework** configured.

## Tech Stack

- **React 19 + TypeScript 5.9** (strict mode, `verbatimModuleSyntax`, `erasableSyntaxOnly`)
- **Vite 8** with `@vitejs/plugin-react` and `@tailwindcss/vite`
- **@xyflow/react (React Flow)** — DOM/SVG canvas for pan/zoom/drag
- **zustand** — single store in `src/store/circuitStore.ts`
- **Tailwind CSS v4** + custom CSS (design tokens in `:root`, BEM-lite class naming)
- **prismarine-nbt** + **pako** (gzip) + **jszip** (multi-board export) + **buffer** (polyfill)
- **pnpm** 10.13.1

## Project Structure

```
src/
├── main.tsx                 # Entry: Buffer polyfill, render App
├── App.tsx                  # Root: React Flow canvas, tool modes, wire painting
├── index.css                # Global styles + design tokens + all component CSS
├── types/
│   └── circuit.ts           # All type definitions, COMPONENT_REGISTRY, direction helpers
├── store/
│   └── circuitStore.ts      # Zustand store: nodes, wireGrid, tools, all actions
├── hooks/
│   └── useKeyboardShortcuts.ts
├── components/
│   ├── BoardBackground.tsx   # <canvas> grid background with board highlighting
│   ├── WireGridOverlay.tsx   # SVG overlay for directional wire traces
│   ├── ComponentPalette.tsx  # Left sidebar: tool selector + component catalog
│   ├── PropertiesPanel.tsx   # Right sidebar: selected component/wire properties
│   ├── Toolbar.tsx           # Top bar: brand, status, export buttons, modals
│   └── nodes/               # 19 node components
│       ├── BaseNode.tsx      # Shared: SVG rotation, pin rendering, labels
│       └── *.tsx             # One file per component type (image/SVG-based)
├── pipeline/
│   ├── coordinateMapper.ts  # Canvas-to-Minecraft coordinate mapping
│   ├── serializeBoard.ts    # NBT CompoundTag for a single 16x16 board
│   └── nbtCompiler.ts       # Top-level: compile state → NBT, download binary/zip
└── simulation/
    ├── netlist.ts            # Build netlist graph from circuit state
    ├── matrixSolver.ts       # Gaussian elimination (Ax=b)
    └── simulator.ts          # DC MNA simulation runner
```

## Coding Conventions

### TypeScript
- **Strict mode** with `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`
- **`verbatimModuleSyntax`** — all type-only imports must use the `type` keyword:
  ```ts
  import { type Node } from '@xyflow/react';
  ```
- **`erasableSyntaxOnly`** — no runtime enums; use `const` enums or plain objects. The one exception is `TraceDir` in `types/circuit.ts` (numeric enum for bitmask use).
- Path alias `@/*` maps to `src/*`. Prefer relative imports within `src/`; only use `@/` for deeply nested imports or when the existing code already uses it.
- **JSDoc** on exported functions; section dividers use `// ─── Section ───`.

### React
- **Functional components** and **hooks** only. No class components.
- **`memo()`** wraps all exported node components in `src/components/nodes/`.
- **`useCallback`** / **`useRef`** for stable event handler references.
- JSX uses `react-jsx` transform — no need to `import React`.

### Zustand Store
- Single store: `src/store/circuitStore.ts`.
- **Always use individual selectors**, never destructure the full store:
  ```ts
  const nodes = useCircuitStore(s => s.nodes);
  ```
- Wire grid is `Map<string, number>`. Keys produced by `wireKey(x, y, layer)` (string format: `"x,y,layer"`).

### Naming
- **Files**: PascalCase for components (`ResistorNode.tsx`), camelCase for utilities/stores/hooks (`circuitStore.ts`, `useKeyboardShortcuts.ts`).
- **Directories**: lowercase (`components/`, `store/`, `hooks/`).
- **Types/Interfaces**: PascalCase (`ComponentType`, `WireLayer`).
- **Constants**: PascalCase for registries (`COMPONENT_REGISTRY`).

### CSS
- Design tokens as CSS custom properties in `:root` (dark theme).
- Class naming: BEM-lite with descriptive prefixes (`toolbar-*`, `palette-*`, `prop-*`, `circuit-node-*`, `modal-*`, `layer-*`).
- Transition duration: `0.15s ease`.
- Icons: Google Material Symbols font (loaded via CDN).

### Grid System
- Grid cells are 20px. Components snap to multiples of 20.
- Wire grid coords are integer grid indices (not pixels). Conversion: `Math.floor((px + 10) / 20)`.
- Boards are 16×16 cell chunks (320px).

## Key Architecture

- **Wire traces**: 4-bit directional mask per cell (UP/DOWN/LEFT/RIGHT bits). Stored as `number` in the `wireGrid` Map.
- **Tool system**: `activeTool` can be `'select'`, `'wire'`, `'eraser'`, or any `ComponentType` string.
- **Component nodes**: `BaseNode.tsx` handles rotation, pin rendering, labels. Each specific node provides only `svgContent` (image/SVG) and dimensions.
- **NBT export**: `nbtCompiler.ts` orchestrates; `serializeBoard.ts` builds the NBT `CompoundTag` per board; `coordinateMapper.ts` handles world-to-board coordinate math.
- **Simulation**: Modified Nodal Analysis DC solver in `simulation/simulator.ts` with Gaussian elimination in `matrixSolver.ts`.
