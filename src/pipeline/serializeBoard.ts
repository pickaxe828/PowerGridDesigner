import { comp, int, byte, string, intArray, longArray, list, float } from 'prismarine-nbt';
import type { CircuitComponent, WireCell } from '../types/circuit';

/**
 * Generates a compliant 4-integer Minecraft UUID
 */
function generateUUID(): [number, number, number, number] {
    const r = () => Math.floor(Math.random() * 4294967296) - 2147483648;
    return [r(), r(), r(), r()];
}

/**
 * Builds the modular namespaced Properties Compound for any ComponentType
 */
function buildComponentProperties(c: CircuitComponent): Record<string, any> {
    const props: Record<string, any> = {};

    // 1. Global / Shared Properties
    props['powergrid:orientation'] = int(c.orientation || 0);

    // 2. Component-Specific Properties
    if (c.customProperties) {
        for (const [key, value] of Object.entries(c.customProperties)) {
            props[key] = float(value);
        }
    }

    if (c.label) {
        props['powergrid:label'] = string(c.label);
    }

    // Wrap the dictionary as a native prismarine-nbt Compound Tag
    return comp(props);
}

/**
 * Given a localized list of components and wires for a single 16x16 board,
 * generates the specific NBT block entity data mapping.
 */
export function serializeBoard(components: CircuitComponent[], wires: WireCell[], boardX: number, boardY: number): Record<string, any> {
    const nbtComponents: any[] = [];

    // Board origins in continuous grid cell space
    const startX = boardX * 16;
    const startY = boardY * 16;

    // 1. Process Components
    for (const c of components) {
        // Calculate strictly local coordinates [0-15]
        const localX = c.position.x - startX;
        const localY = c.position.y - startY;

        nbtComponents.push({
            X: int(localX),
            Y: int(localY),
            Id: string(`powergrid:${c.type}`),
            UUID: intArray(generateUUID()),
            Properties: buildComponentProperties(c)
        });
    }

    // 2. Process Wire Grid Matrix — directional TraceMatrix format
    // 16 longs per layer, one long per row, 4 bits per cell
    const packDirectional = (layer: 'front' | 'back'): bigint[] => {
        // 16 longs, each covering one row (16 cells × 4 bits = 64 bits)
        const longs = new Array<bigint>(16).fill(0n);

        for (const w of wires) {
            if (w.layer !== layer) continue;
            const localX = w.x - startX;
            const localY = w.y - startY;
            if (localX < 0 || localX >= 16 || localY < 0 || localY >= 16) continue;

            // Each cell occupies 4 bits at position (x * 4) within long[y]
            const traces = w.traces || 0;
            const shift = BigInt(localX * 4);
            longs[localY] |= (BigInt(traces & 0xF) << shift);
        }

        // Force signed 64-bit limits
        return longs.map(val => BigInt.asIntN(64, val));
    };

    // 3. Construct Payload
    return comp({
        Components: list(comp(nbtComponents)),
        Front: longArray(packDirectional('front')),
        Back: longArray(packDirectional('back')),
        FullPixelTraces: byte(0),
    });
}
