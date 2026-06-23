import { create } from 'zustand';
import {
  type Node,
  type OnNodesChange,
  applyNodeChanges,
} from '@xyflow/react';
import {
  type ComponentType,
  type Facing,
  type WireLayer,
  type ToolType,
  type CircuitState,
  type WireCell,
  COMPONENT_MAP,
  COMPONENT_REGISTRY,
  TraceDir,
  wireKey,
  parseWireKey,
  oppositeDir,
  dirBetween,
} from '../types/circuit';

/** Counter state per component type prefix for auto-ID */
const idCounters: Record<string, number> = {};

function nextId(prefix: string): string {
  if (!idCounters[prefix]) idCounters[prefix] = 0;
  idCounters[prefix]++;
  return `${prefix}${idCounters[prefix]}`;
}

/** Cycle facing: N→E→S→W→N */
function rotateFacing(f: Facing): Facing {
  const order: Facing[] = ['north', 'east', 'south', 'west'];
  return order[(order.indexOf(f) + 1) % 4];
}

/** Rotation angle in degrees for CSS transform */
export function facingToDeg(f: Facing): number {
  switch (f) {
    case 'north': return 0;
    case 'east': return 90;
    case 'south': return 180;
    case 'west': return 270;
  }
}

export interface CircuitStoreState {
  // ─── Components (React Flow nodes) ───
  nodes: Node[];
  selectedNodeId: string | null;
  onNodesChange: OnNodesChange;

  // ─── Wire Grid (dual layer, directional traces) ───
  wireGrid: Map<string, number>;
  activeLayer: WireLayer;

  // ─── Tool System ───
  activeTool: ToolType;
  selectedComponentType: ComponentType;
  lastUsedComponentType: ComponentType;
  isPainting: boolean;

  // ─── Board / Plot state ───
  homeBoard: { bx: number; by: number };

  // ─── Interaction State ───
  hoveredCell: { x: number; y: number } | null;
  hoveredNodeId: string | null;
  nearbyNodeIds: Set<string>;
  setHoveredCell: (cell: { x: number; y: number } | null) => void;
  setHoveredNodeId: (id: string | null) => void;
  findComponentAt: (x: number, y: number) => string | null;

  // ─── Selected wire cells ───
  selectedWireKey: string | null;

  // ─── Actions ───
  addComponent: (type: ComponentType, position: { x: number; y: number }) => void;
  removeComponent: (id: string) => void;
  updateComponentData: (id: string, data: Record<string, unknown>) => void;
  rotateComponent: (id: string) => void;
  setSelectedNode: (id: string | null) => void;

  // Wire actions
  paintWire: (x: number, y: number, fromX?: number, fromY?: number) => void;
  paintLine: (fromX: number, fromY: number, toX: number, toY: number) => void;
  eraseWire: (x: number, y: number) => void;
  toggleLayer: () => void;
  setActiveLayer: (layer: WireLayer) => void;

  // Tool actions
  setActiveTool: (tool: ToolType) => void;
  selectComponentType: (type: ComponentType) => void;
  activateComponentTool: () => void;
  setIsPainting: (painting: boolean) => void;

  // Wire selection
  setSelectedWireKey: (key: string | null) => void;
  deleteSelected: () => void;

  // Export
  getCircuitState: () => CircuitState;
  clearAll: () => void;
}

export const useCircuitStore = create<CircuitStoreState>((set, get) => ({
  nodes: [],
  selectedNodeId: null,
  wireGrid: new Map<string, number>(),
  activeLayer: 'front' as WireLayer,
  activeTool: 'select' as ToolType,
  selectedComponentType: COMPONENT_REGISTRY[0].type,
  lastUsedComponentType: COMPONENT_REGISTRY[0].type,
  homeBoard: { bx: 0, by: 0 },
  isPainting: false,
  selectedWireKey: null,
  hoveredCell: null,
  hoveredNodeId: null,
  nearbyNodeIds: new Set<string>(),

  setHoveredCell: (cell) => {
    if (!cell) return set({ hoveredCell: null, nearbyNodeIds: new Set() });
    const state = get();
    const nearbyNodeIds = new Set<string>();
    const THRESHOLD = 1;
    for (const node of state.nodes) {
      const nx = Math.floor(node.position.x / 20);
      const ny = Math.floor(node.position.y / 20);
      const nw = Math.floor(((node.width as number) || 40) / 20);
      const nh = Math.floor(((node.height as number) || 40) / 20);
      if (cell.x >= nx - THRESHOLD && cell.x < nx + nw + THRESHOLD &&
          cell.y >= ny - THRESHOLD && cell.y < ny + nh + THRESHOLD) {
        nearbyNodeIds.add(node.id);
      }
    }
    set({ hoveredCell: cell, nearbyNodeIds });
  },
  setHoveredNodeId: (id) => set({ hoveredNodeId: id }),

  findComponentAt: (x, y) => {
    const nodes = get().nodes;
    for (const node of nodes) {
      if (!node.data || !node.data.componentType) continue;
      const meta = COMPONENT_MAP[node.data.componentType as ComponentType];
      if (!meta) continue;

      const ox = meta.centerOrigin ? 0.5 : 0;
      const widthPx = meta.width || 40;
      const heightPx = meta.height || 40;

      const facing = node.data.facing as Facing;
      let wPx = widthPx;
      let hPx = heightPx;
      if (facing === 'east' || facing === 'west') {
        wPx = heightPx; hPx = widthPx;
      }

      const left = node.position.x - (wPx * ox);
      const top = node.position.y - (hPx * ox);

      const px = x * 20;
      const py = y * 20;

      // Checking if grid dot explicitly tests within the exact rendered box
      // STRICT BOUNDARY: Use < instead of <= to prevent +1 visual inflation bug
      if (px >= left && px < left + wPx && py >= top && py < top + hPx) {
        return node.id;
      }
    }
    return null;
  },

  onNodesChange: (changes) => {
    changes = changes.filter(c => c.type !== 'select');
    const state = get();
    const nodes = state.nodes;
    const nextChanges = changes.map(change => {
      if (change.type === 'position' && change.position) {
        return {
          ...change,
          position: {
            x: Math.round(change.position.x / 20) * 20,
            y: Math.round(change.position.y / 20) * 20,
          },
        };
      }
      if (change.type === 'dimensions' && change.dimensions) {
        const node = nodes.find(n => n.id === change.id);
        const meta = node ? COMPONENT_MAP[node.data.componentType as ComponentType] : null;
        if (meta) {
          return {
            ...change,
            dimensions: {
              width: meta.width || 40,
              height: meta.height || 40,
            },
          };
        }
      }
      return change;
    });
    set({ nodes: applyNodeChanges(nextChanges, get().nodes) });
  },

  addComponent: (type, position) => {
    const { nodes, wireGrid, homeBoard } = get();
    const isEmpty = nodes.length === 0 && wireGrid.size === 0;

    let nextHome = homeBoard;
    if (isEmpty) {
      const bx = Math.floor(position.x / 320);
      const by = Math.floor(position.y / 320);
      if (bx !== homeBoard.bx || by !== homeBoard.by) {
        nextHome = { bx, by };
      }
    }

    const meta = COMPONENT_MAP[type];
    const id = nextId(meta.idPrefix);

    // Initialize custom properties from metadata defaults
    const customProperties: Record<string, number> = {};
    meta.properties?.forEach(p => {
      customProperties[p.id] = p.defaultValue;
    });

    const newNode: Node = {
      id,
      type,
      origin: meta.centerOrigin ? [0.5, 0.5] : [0, 0],
      position: {
        x: Math.round(position.x / 20) * 20,
        y: Math.round(position.y / 20) * 20,
      },
      width: meta.width || 40,
      height: meta.height || 40,
      style: { width: meta.width || 40, height: meta.height || 40 },
      data: {
        label: id,
        componentType: type,
        facing: 'north' as Facing,
        orientation: 0,
        customProperties,
        color: meta.color,
        terminals: meta.terminals,
      },
    };
    set({ nodes: [...nodes, newNode], homeBoard: nextHome, lastUsedComponentType: type });
  },

  removeComponent: (id) => {
    set({
      nodes: get().nodes.filter(n => n.id !== id),
      selectedNodeId: get().selectedNodeId === id ? null : get().selectedNodeId,
    });
  },

  updateComponentData: (id, data) => {
    set({
      nodes: get().nodes.map(n =>
        n.id === id ? { ...n, data: { ...n.data, ...data } } : n
      ),
    });
  },

  rotateComponent: (id) => {
    // Visual-only rotation: only changes the facing (SVG display), pins stay static
    set({
      nodes: get().nodes.map(n =>
        n.id === id
          ? { ...n, data: { ...n.data, facing: rotateFacing(n.data.facing as Facing), orientation: (((n.data.orientation as number) || 0) + 1) % 4 } }
          : n
      ),
    });
  },

  setSelectedNode: (id) => set({ selectedNodeId: id, selectedWireKey: null }),

  // ─── Wire Grid Actions ───

  /**
   * Paint a wire cell. Optionally provide previous cell coordinates
   * to establish a directional trace connection between them.
   */
  paintWire: (x: number, y: number, fromX?: number, fromY?: number) => {
    const { wireGrid, activeLayer, nodes, homeBoard } = get();
    const isEmpty = nodes.length === 0 && wireGrid.size === 0;

    let nextHome = homeBoard;
    if (isEmpty) {
      const bx = Math.floor(x / 16);
      const by = Math.floor(y / 16);
      if (bx !== homeBoard.bx || by !== homeBoard.by) {
        nextHome = { bx, by };
      }
    }

    const newGrid = new Map(wireGrid);
    const key = wireKey(x, y, activeLayer);

    if (fromX !== undefined && fromY !== undefined) {
      const dir = dirBetween(fromX, fromY, x, y);
      const opp = oppositeDir(dir);
      const existingTraces = newGrid.get(key) || 0;
      newGrid.set(key, existingTraces | opp);
      const prevKey = wireKey(fromX, fromY, activeLayer);
      const prevTraces = newGrid.get(prevKey) || 0;
      newGrid.set(prevKey, prevTraces | dir);
    } else if (!newGrid.has(key)) {
      newGrid.set(key, 0);
    }
    set({ wireGrid: newGrid, homeBoard: nextHome });
  },

  paintLine: (fromX: number, fromY: number, toX: number, toY: number) => {
    const { wireGrid, activeLayer, nodes, homeBoard } = get();
    const isEmpty = nodes.length === 0 && wireGrid.size === 0;

    let nextHome = homeBoard;
    if (isEmpty) {
      const bx = Math.floor(fromX / 16);
      const by = Math.floor(fromY / 16);
      if (bx !== homeBoard.bx || by !== homeBoard.by) {
        nextHome = { bx, by };
      }
    }

    const newGrid = new Map(wireGrid);

    const dx = Math.sign(toX - fromX);
    const dy = Math.sign(toY - fromY);
    const steps = Math.abs(toX - fromX) + Math.abs(toY - fromY);

    let cx = fromX;
    let cy = fromY;
    for (let i = 0; i < steps; i++) {
      const nx = cx + dx;
      const ny = cy + dy;
      const dir = dirBetween(cx, cy, nx, ny);
      const opp = oppositeDir(dir);

      const key = wireKey(nx, ny, activeLayer);
      const existingTraces = newGrid.get(key) || 0;
      newGrid.set(key, existingTraces | opp);

      const prevKey = wireKey(cx, cy, activeLayer);
      const prevTraces = newGrid.get(prevKey) || 0;
      newGrid.set(prevKey, prevTraces | dir);

      cx = nx;
      cy = ny;
    }
    set({ wireGrid: newGrid, homeBoard: nextHome });
  },

  eraseWire: (x, y) => {
    const { wireGrid, activeLayer } = get();
    const key = wireKey(x, y, activeLayer);
    if (!wireGrid.has(key)) return;

    const newGrid = new Map(wireGrid);
    newGrid.delete(key);

    const neighbors: [number, number, number][] = [
      [x - 1, y, TraceDir.RIGHT],
      [x + 1, y, TraceDir.LEFT],
      [x, y - 1, TraceDir.DOWN],
      [x, y + 1, TraceDir.UP],
    ];

    for (const [nx, ny, dir] of neighbors) {
      const nKey = wireKey(nx, ny, activeLayer);
      const traces = newGrid.get(nKey);
      if (traces !== undefined && (traces & dir)) {
        const updated = traces & ~dir;
        if (updated === 0) {
          newGrid.delete(nKey);
        } else {
          newGrid.set(nKey, updated);
        }
      }
    }

    set({ wireGrid: newGrid });
  },

  toggleLayer: () => {
    set({ activeLayer: get().activeLayer === 'front' ? 'back' : 'front' });
  },

  setActiveLayer: (layer) => set({ activeLayer: layer }),

  // ─── Tool Actions ───

  setActiveTool: (tool) => {
    if (tool === 'wire' || tool === 'select') {
      const nodes = get().nodes.map(n => n.selected ? { ...n, selected: false } : n);
      set({ activeTool: tool, selectedNodeId: null, selectedWireKey: null, nodes });
    } else {
      set({ activeTool: tool });
    }
  },
  selectComponentType: (type) => set({ activeTool: 'component', selectedComponentType: type, lastUsedComponentType: type }),
  activateComponentTool: () => set(state => ({ activeTool: 'component', selectedComponentType: state.lastUsedComponentType })),
  setIsPainting: (painting) => set({ isPainting: painting }),

  // ─── Wire Selection ───

  setSelectedWireKey: (key) => set({ selectedWireKey: key, selectedNodeId: null }),

  deleteSelected: () => {
    const { selectedNodeId, selectedWireKey } = get();
    if (selectedNodeId) {
      get().removeComponent(selectedNodeId);
    }
    if (selectedWireKey) {
      const cell = parseWireKey(selectedWireKey);
      const newGrid = new Map(get().wireGrid);
      newGrid.delete(selectedWireKey);

      const neighbors: [number, number, number][] = [
        [cell.x - 1, cell.y, TraceDir.RIGHT],
        [cell.x + 1, cell.y, TraceDir.LEFT],
        [cell.x, cell.y - 1, TraceDir.DOWN],
        [cell.x, cell.y + 1, TraceDir.UP],
      ];

      for (const [nx, ny, dir] of neighbors) {
        const nKey = wireKey(nx, ny, cell.layer);
        const traces = newGrid.get(nKey);
        if (traces !== undefined && (traces & dir)) {
          const updated = traces & ~dir;
          if (updated === 0) {
            newGrid.delete(nKey);
          } else {
            newGrid.set(nKey, updated);
          }
        }
      }

      set({ wireGrid: newGrid, selectedWireKey: null });
    }
  },

  // ─── Export ───

  getCircuitState: (): CircuitState => {
    const { nodes, wireGrid } = get();
    const wireCells: WireCell[] = [];
    for (const [key, traces] of wireGrid.entries()) {
      const cell = parseWireKey(key);
      cell.traces = traces;
      wireCells.push(cell);
    }
    return {
      version: 2,
      gridSize: { width: 64, height: 64 },
      components: nodes.map(n => ({
        id: n.id,
        type: n.data.componentType as ComponentType,
        position: { x: Math.round(n.position.x / 20), y: Math.round(n.position.y / 20) },
        facing: (n.data.facing || 'north') as Facing,
        orientation: (n.data.orientation as number) || 0,
        customProperties: n.data.customProperties as Record<string, number>,
        label: n.data.label as string | undefined,
      })),
      wireCells,
    };
  },

  clearAll: () => {
    set({ nodes: [], wireGrid: new Map(), selectedNodeId: null, selectedWireKey: null, activeTool: 'select', selectedComponentType: COMPONENT_REGISTRY[0].type, lastUsedComponentType: COMPONENT_REGISTRY[0].type, homeBoard: { bx: 0, by: 0 } });
    Object.keys(idCounters).forEach(k => { idCounters[k] = 0; });
  },
}));
