/** Cardinal facing directions (Minecraft block states) */
export type Facing = 'north' | 'south' | 'east' | 'west';

/** Wire routing layers */
export type WireLayer = 'front' | 'back';

/** Tool types — what happens on canvas interaction */
export type ToolType = 'select' | 'wire' | 'component';

/** Supported component types matching Create: Power Grid blocks */
export type ComponentType =
    | 'connector'
    | 'via'
    | 'resistor'
    | 'capacitor'
    | 'diode'
    | 'varistor'
    | 'barretter_tube'
    | 'neon_bulb'
    | 'lv_bulb'
    | 'regulator_tube'
    | 'inductor'
    | 'potentiometer'
    | 'bjt_pnp'
    | 'bjt_npn'
    | 'static_induction_transistor'
    | 'relay_dpdt'
    | 'relay_spdt'
    | 'electron_tube';

/** Directional trace bits matching the mod's TraceMatrix encoding */
export const TraceDir = {
    UP:    1 << 0,   // bit 0
    DOWN:  1 << 1,   // bit 1
    LEFT:  1 << 2,   // bit 2
    RIGHT: 1 << 3,   // bit 3
} as const;

export const DIR_LABELS: Record<number, string> = {
    [TraceDir.UP]:    '↑',
    [TraceDir.DOWN]:  '↓',
    [TraceDir.LEFT]:  '←',
    [TraceDir.RIGHT]: '→',
};

/** Get the opposite direction for adjacent-cell connectivity */
export function oppositeDir(dir: number): number {
    switch (dir) {
        case TraceDir.UP:    return TraceDir.DOWN;
        case TraceDir.DOWN:  return TraceDir.UP;
        case TraceDir.LEFT:  return TraceDir.RIGHT;
        case TraceDir.RIGHT: return TraceDir.LEFT;
    }
    return 0;
}

/** Determine direction from (x1,y1) to (x2,y2) — assumes adjacent cells */
export function dirBetween(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    if (dx === 1)  return TraceDir.RIGHT;
    if (dx === -1) return TraceDir.LEFT;
    if (dy === 1)  return TraceDir.DOWN;
    if (dy === -1) return TraceDir.UP;
    return 0;
}

/** A single painted wire cell including directional trace bits */
export interface WireCell {
    x: number;
    y: number;
    layer: WireLayer;
    /** 4-bit directional mask — bit accumulations from multiple passes */
    traces?: number;
}

/** Create a map key for a wire cell — O(1) lookup */
export function wireKey(x: number, y: number, layer: WireLayer): string {
    return `${x},${y},${layer}`;
}

/** Parse a wire key back into coordinates + layer */
export function parseWireKey(key: string): WireCell {
    const [x, y, layer] = key.split(',');
    return { x: parseInt(x), y: parseInt(y), layer: layer as WireLayer };
}

export interface ComponentPropertyDef {
    id: string;          // e.g., 'gain', 'resistance'
    label: string;       // e.g., 'Gain', 'Resistance'
    unit: string;        // e.g., 'hFE', 'Ω'
    defaultValue: number;
    min?: number;
    max?: number;
    step?: number;
}

/** A mathematical definition for a component's logical pin/connector */
export interface ComponentPin {
    /** Internal ID (e.g. 'T1', 'B') */
    id: string;
    /** Display label (e.g. 'Terminal 1', 'Base') */
    label: string;
    /** X coordinate natively (for north-facing), usually 0 to 40 */
    x: number;
    /** Y coordinate natively (for north-facing), usually 0 to 40 */
    y: number;
}

/** A single placed component on the canvas */
export interface CircuitComponent {
    /** Unique ID (e.g. "R1", "D3") */
    id: string;
    /** Component type → maps to powergrid:<type> in NBT palette */
    type: ComponentType;
    /** Grid position (integer, 1 unit = 1 Minecraft block) */
    position: { x: number; y: number };
    /** Visual facing direction (pins stay static) */
    facing: Facing;
    /** Mod-specific rotational integer (0 to 3) */
    orientation?: number;
    /** Component-specific properties (ohms, farads, etc.) */
    customProperties?: Record<string, number>;
    /** Optional label for display */
    label?: string;
}

/** The complete circuit state exported from the canvas */
export interface CircuitState {
    /** Schema version for forward compatibility */
    version: 2;
    /** Canvas grid size (width × height in blocks) */
    gridSize: { width: number; height: number };
    /** All placed components */
    components: CircuitComponent[];
    /** All painted wire cells */
    wireCells: WireCell[];
}

/** Component metadata for the palette */
export interface ComponentMeta {
    type: ComponentType;
    label: string;
    /** Short label for the ID prefix (e.g. "R" for Resistor) */
    idPrefix: string;
    /** Dynamic properties defined for this component */
    properties?: ComponentPropertyDef[];
    /** Number of terminals */
    terminals: number;
    /** Category for palette grouping */
    category: 'passive' | 'active' | 'switching';
    /** Color accent for the component */
    color: string;
    /** Keyboard shortcut key (lowercase) */
    shortcutKey?: string;
    /** Pins defined relative to unrotated (north) Top-Left bound */
    pins: ComponentPin[];
    /** Optional custom React Flow container width (default 40) */
    width?: number;
    /** Optional custom React Flow container height (default 40) */
    height?: number;
    /** If true, the node snaps and anchors perfectly to its center rather than top-left */
    centerOrigin?: boolean;
    /** If true, label will be exported */
    exportLabel?: boolean;
}

// Common pin definitions
const CONNECTOR_PIN: ComponentPin[] = [
    { id: 'C', label: 'C', x: 20, y: 20 },
];

const VIA_PIN: ComponentPin[] = [
    { id: 'C', label: 'C', x: 10, y: 10 },
];

const TWO_PINS: ComponentPin[] = [
    { id: 'T1', label: '1', x: 0, y: 20 },
    { id: 'T2', label: '2', x: 40, y: 20 },
];

const VARISTOR_PINS: ComponentPin[] = [
    { id: 'T1', label: '1', x: 0, y: 20 },
    { id: 'T2', label: '2', x: 60, y: 40 },
];

const TUBE_PINS: ComponentPin[] = [
    { id: 'T1', label: '1', x: 0, y: 0 },
    { id: 'T2', label: '2', x: 20, y: 20 },
];

const REGULATOR_TUBE_PINS: ComponentPin[] = [
    { id: 'Anode', label: '+', x: 0, y: 20 },
    { id: 'Cathode', label: '-', x: 40, y: 20 },
];

const LV_BULB_PINS: ComponentPin[] = [
    { id: 'T1', label: '1', x: 0, y: 20 },
    { id: 'T2', label: '2', x: 40, y: 20 },
];

const POT_PINS: ComponentPin[] = [
    { id: 'T1', label: '1', x: 20, y: 40 },
    { id: 'T2', label: '2', x: 60, y: 40 },
    { id: 'W', label: 'W', x: 40, y: 60 },
];

const NPN_BJT_PINS: ComponentPin[] = [
    { id: 'C', label: 'C', x: 0, y: 20 },
    { id: 'B', label: 'B', x: 20, y: 40 },
    { id: 'E', label: 'E', x: 40, y: 20 },
];

const PNP_BJT_PINS: ComponentPin[] = [
    { id: 'C', label: 'C', x: 40, y: 20 },
    { id: 'B', label: 'B', x: 20, y: 40 },
    { id: 'E', label: 'E', x: 0, y: 20 },
];

const VFET_PINS: ComponentPin[] = [
    { id: 'D', label: 'D', x: 0, y: 0 },
    { id: 'S', label: 'S', x: 40, y: 0 },
    { id: 'G', label: 'G', x: 20, y: 40 },
];

const DPDT_PINS: ComponentPin[] = [
    // Left side (coil)
    { id: 'C1', label: 'C1', x: 0, y: 0 },
    { id: 'C2', label: 'C2', x: 0, y: 80 },
    // Middle (Switch 1)
    { id: 'NO1', label: 'NO', x: 40, y: 0 },
    { id: 'COM1', label: 'CM', x: 40, y: 40 },
    { id: 'NC1', label: 'NC', x: 40, y: 80 },
    // Right (Switch 2)
    { id: 'NO2', label: 'NO', x: 80, y: 0 },
    { id: 'COM2', label: 'CM', x: 80, y: 40 },
    { id: 'NC2', label: 'NC', x: 80, y: 80 },
];

const SPDT_PINS: ComponentPin[] = [
    { id: 'C1', label: 'C1', x: 0, y: 0 },
    { id: 'C2', label: 'C2', x: 0, y: 80 },
    { id: 'NO', label: 'NO', x: 40, y: 0 },
    { id: 'COM', label: 'CM', x: 60, y: 40 },
    { id: 'NC', label: 'NC', x: 40, y: 80 },
];

const TRIODE_PINS: ComponentPin[] = [
    { id: 'A', label: 'A', x: 0, y: 0 },
    { id: 'C', label: 'C', x: 20, y: 20 },
    { id: 'G', label: 'G', x: 40, y: 0 },
    { id: 'H1', label: 'H1', x: 0, y: 40 },
    { id: 'H2', label: 'H2', x: 40, y: 40 },
];

/** Registry of all components with their metadata */
export const COMPONENT_REGISTRY: ComponentMeta[] = [
    // Passive
    { type: 'connector', label: 'Wire Connector', idPrefix: 'WC', terminals: 1, category: 'passive', color: '#f0e656', pins: CONNECTOR_PIN, width: 40, height: 40, exportLabel: true },
    { type: 'via', label: 'Via', idPrefix: 'V', terminals: 1, category: 'passive', color: '#f0e656', pins: VIA_PIN, width: 20, height: 20, centerOrigin: true },
    {
        type: 'resistor', label: 'Resistor', idPrefix: 'R', terminals: 2, category: 'passive', color: '#ef4444', shortcutKey: 'r', pins: TWO_PINS,
        properties: [
            { id: 'resistance', label: 'Resistance', unit: 'Ω', defaultValue: 100, min: 0.1, max: 1E8 }
        ]
    },
    {
        type: 'capacitor', label: 'Capacitor', idPrefix: 'C', terminals: 2, category: 'passive', color: '#3b82f6', shortcutKey: 'c', pins: TWO_PINS,
        properties: [{ id: 'capacitance', label: 'Capacitance', unit: 'mF', defaultValue: 1, min: 1E-9, max: 1000 }]
    },
    {
        type: 'varistor', label: 'Varistor', idPrefix: 'VR', terminals: 2, category: 'passive', color: '#f97316', pins: VARISTOR_PINS, width: 60, height: 40,
        properties: [{ id: 'varistor_voltage', label: 'Clamping Voltage', unit: 'V', defaultValue: 100, min: 50, max: 1000 }]
    },
    {
        type: 'potentiometer', label: 'Potentiometer', idPrefix: 'POT', terminals: 3, category: 'passive', color: '#8b5cf6', pins: POT_PINS, width: 60, height: 60,
        properties: [
            { id: 'potentiometer_resistance', label: 'Max Resistance', unit: 'Ω', defaultValue: 10000, min: 100, max: 100_000 },
            { id: 'potentiometer_value', label: 'Value', unit: '%', defaultValue: 50, min: 0, max: 100 }
        ]
    },
    {
        type: 'lv_bulb', label: 'LV Bulb', idPrefix: 'LVB', terminals: 2, category: 'passive', color: '#fff492ff', pins: LV_BULB_PINS, exportLabel: true,
    },
    {
        type: 'inductor', label: 'Inductor', idPrefix: 'L', terminals: 2, category: 'passive', color: '#fff492ff', pins: TWO_PINS, exportLabel: true,
        properties: [{ id: 'inductance', label: 'Inductance', unit: 'mH', defaultValue: 0.1, min: 1E-4, max: 1000 }]
    },
    // Active
    {
        type: 'diode', label: 'Diode', idPrefix: 'D', terminals: 2, category: 'active', color: '#10b981', pins: TWO_PINS
    },
    {
        type: 'barretter_tube', label: 'Barretter Tube', idPrefix: 'BT', terminals: 2, category: 'active', color: '#ec4899', pins: TUBE_PINS,
        properties: [
            { id: 'barretter_current', label: 'Holding Current', unit: 'A', defaultValue: 0.1, min: 0.01, max: 2 },
            { id: 'barretter_resistance', label: 'Resistance', unit: 'Ω', defaultValue: 10, min: 10, max: 1000 }
        ]
    },
    {
        type: 'neon_bulb', label: 'Neon Bulb', idPrefix: 'NE', terminals: 2, category: 'active', color: '#fbbf24', pins: TUBE_PINS, exportLabel: true,
        properties: [{ id: 'neon_bulb_vb', label: 'Breakdown Voltage', unit: 'V', defaultValue: 60, min: 30, max: 300 }]
    },
    {
        type: 'regulator_tube', label: 'Regulator Tube', idPrefix: 'VT', terminals: 2, category: 'active', color: '#6366f1', pins: REGULATOR_TUBE_PINS,
        properties: [{ id: 'regulator_tube_vh', label: 'Holding Voltage', unit: 'V', defaultValue: 60, min: 30, max: 500 }]
    },
    {
        type: 'bjt_pnp', label: 'PNP BJT', idPrefix: 'Q', terminals: 3, category: 'active', color: '#f43f5e', pins: PNP_BJT_PINS,
        properties: [
            { id: 'bjt_gain', label: 'Gain', unit: 'hFE', defaultValue: 20, min: 5, max: 500 }
        ]
    },
    {
        type: 'bjt_npn', label: 'NPN BJT', idPrefix: 'Q', terminals: 3, category: 'active', color: '#14b8a6', pins: NPN_BJT_PINS,
        properties: [
            { id: 'bjt_gain', label: 'Gain', unit: 'hFE', defaultValue: 20, min: 5, max: 500 }
        ]
    },
    {
        type: 'static_induction_transistor', label: 'Static Induction Transistor', idPrefix: 'SIT', terminals: 3, category: 'active', color: '#a855f7', pins: VFET_PINS,
        properties: [{ id: 'vfet_gain', label: 'Gain', unit: 'hFE', defaultValue: 10, min: 1, max: 100 },
        { id: 'vfet_kg', label: 'Transconductance', unit: 'S', defaultValue: 0.1, min: 0.01, max: 1 }
        ]
    },
    {
        type: 'electron_tube', label: 'Electron Tube', idPrefix: 'ET', terminals: 5, category: 'active', color: '#94a3b8', pins: TRIODE_PINS, width: 60, height: 80,
        properties: [
            { id: 'tube_gain', label: 'Gain', unit: 'μ', defaultValue: 5, min: 1, max: 100 },
            { id: 'tube_transconductance', label: 'Transconductance', unit: 'S', defaultValue: 6800, min: 200, max: 10_000 },
            { id: 'tube_saturation_current', label: 'Saturation Current', unit: 'A', defaultValue: 0.1, min: 0.001, max: 20 },
            { id: 'tube_heater_voltage', label: 'Heater Voltage', unit: 'V', defaultValue: 6, min: 1, max: 16 },
        ]
    },
    // Switching
    {
        type: 'relay_dpdt', label: 'Relay DPDT', idPrefix: 'K', terminals: 8, category: 'switching', color: '#64748b', pins: DPDT_PINS, width: 80, height: 80,
        properties: [
            { id: 'relay_threshold', label: 'Threshold Voltage', unit: 'V', defaultValue: 12, min: 1, max: 120 }
        ]
    },
    {
        type: 'relay_spdt', label: 'Relay SPDT', idPrefix: 'K', terminals: 5, category: 'switching', color: '#94a3b8', pins: SPDT_PINS, width: 60, height: 80, properties: [
            { id: 'relay_threshold', label: 'Threshold Voltage', unit: 'V', defaultValue: 12, min: 1, max: 120 }
        ]
    },
];

/** Map from ComponentType to ComponentMeta for quick lookup */
export const COMPONENT_MAP: Record<ComponentType, ComponentMeta> = Object.fromEntries(
    COMPONENT_REGISTRY.map(m => [m.type, m])
) as Record<ComponentType, ComponentMeta>;
