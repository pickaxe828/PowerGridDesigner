# PowerGrid Designer

A grid-based circuit board designer for the Minecraft mod Create: Power Grid. Components and wires are placed on a grid of 20px cells, grouped into 16×16 cell boards that correspond to Minecraft block chunks.

## Language

### Tool Modes

**Navigate**:
A hand-tool mode for panning and zooming the canvas. No editing or selection possible.
_Avoid_: Select, hand tool

**Select**:
Rubber-band and click-to-select mode. Left-drag draws a selection box; single left-click selects one component. Supports Shift-click to toggle and multi-select.
_Avoid_: Navigate, marquee

**Wire**:
Paint mode: click and drag to paint directional trace bits on grid cells.

**Component**:
Placement mode: click to place the currently selected component type. Right-click to delete a component.

### Grid & Board

**Grid cell**:
A single 20px × 20px position on the canvas. All coordinates are integer grid indices.
_Avoid_: Tile, pixel, slot

**Board**:
A 16×16 chunk of grid cells (320px × 320px) that maps to one in-game Minecraft block. Components must be fully contained within a single board. Boards are the unit of NBT export.
_Avoid_: Chunk, region, block

**Home board**:
The board containing the first placed component or wire. Determines the export origin. Automatically adopted when the design is empty.

**Active board**:
Any board containing at least one component or wire cell. Rendered with brighter grid lines.

### Traces

**Trace**:
A directional 4-bit mask (UP / DOWN / LEFT / RIGHT) stored per cell per layer. Traces are paint strokes on the grid, not entity-to-entity connections. They define connectivity for DC simulation.
_Avoid_: Wire, connection, link

**Wire layer**:
One of two routing layers: `front` (component side) or `back` (under-board). Traces on different layers do not interact.

**Flood-fill move**:
When a component is dragged in Select mode, traces connected to its pins are found via BFS along connected trace directions, bounded by the combined selection box. Those traces move with the component. Pass-through traces (inside the box but unreachable from any selected pin) are left behind.

### Components

**Component**:
A placed circuit element on the canvas. Has a type (resistor, capacitor, etc.), a position, a facing direction, and optional custom properties. Stored as a React Flow `Node`.
_Avoid_: Part, element, block

**Pin**:
A logical connection point on a component, defined relative to its north-facing origin. Traces connect to components at pin positions.

**Facing**:
The cardinal direction a component is oriented (`north`, `south`, `east`, `west`). Determines pin positions after rotation.

### Placement

**Placement constraint**:
A rule enforced during placement and drag: every cell of a component's bounding box must fall within the same board. Out-of-bounds positions snap to the nearest in-bounds position.

### Export

**NBT**:
Minecraft's Named Binary Tag format. Each board is serialized as a separate `CompoundTag`. Single-board designs download as `.nbt` (gzip); multi-board designs download as `.zip`.
