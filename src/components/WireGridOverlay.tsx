import { useMemo } from 'react';
import { useStore } from '@xyflow/react';
import { useCircuitStore } from '../store/circuitStore';
import { parseWireKey, TraceDir, type WireLayer } from '../types/circuit';

const CELL_SIZE = 20;
const CELL_HALF = CELL_SIZE / 2;
const BODY_HALF = 5;
const ARM_LEN = CELL_HALF - BODY_HALF;
const ARM_REACH = CELL_HALF;

const LAYER_COLORS: Record<WireLayer, string> = {
    front: '#e74c3c',
    back: '#3498db',
};

interface TraceCell {
    key: string;
    x: number;
    y: number;
    layer: WireLayer;
    traces: number;
}

export default function WireGridOverlay() {
    const wireGrid = useCircuitStore(s => s.wireGrid);
    const activeLayer = useCircuitStore(s => s.activeLayer);
    const selectedWireKey = useCircuitStore(s => s.selectedWireKey);

    const transform = useStore(s => s.transform);
    const [tx, ty, zoom] = transform;

    const cells = useMemo(() => {
        const result: TraceCell[] = [];
        for (const [key, traces] of wireGrid.entries()) {
            const cell = parseWireKey(key);
            result.push({ key, ...cell, traces });
        }
        return result;
    }, [wireGrid]);

    const inactiveLayer = activeLayer === 'front' ? 'back' : 'front';

    return (
        <svg
            className="wire-grid-overlay"
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 1,
                overflow: 'visible',
            }}
        >
            <g transform={`translate(${tx}, ${ty}) scale(${zoom})`}>
                {cells
                    .filter(c => c.layer === inactiveLayer)
                    .map(c => (
                        <TraceCellRenderer
                            key={c.key}
                            cell={c}
                            color={LAYER_COLORS[c.layer]}
                            opacity={0.25}
                            selected={false}
                        />
                    ))}

                {cells
                    .filter(c => c.layer === activeLayer)
                    .map(c => (
                        <TraceCellRenderer
                            key={c.key}
                            cell={c}
                            color={LAYER_COLORS[c.layer]}
                            opacity={0.85}
                            selected={c.key === selectedWireKey}
                        />
                    ))}
            </g>
        </svg>
    );
}

function TraceCellRenderer({ cell, color, opacity, selected }: {
    cell: TraceCell;
    color: string;
    opacity: number;
    selected: boolean;
}) {
    const cx = cell.x * CELL_SIZE;
    const cy = cell.y * CELL_SIZE;
    const t = cell.traces;

    const left = cx - BODY_HALF;
    const right = cx + BODY_HALF;
    const top = cy - BODY_HALF;
    const bottom = cy + BODY_HALF;

    return (
        <g opacity={opacity}>
            {/* Center body — always rendered for any occupied cell */}
            <rect x={left} y={top} width={BODY_HALF * 2} height={BODY_HALF * 2} fill={color} />

            {/* Directional arms extending from body toward cell edge */}
            {(t & TraceDir.UP) ? (
                <rect x={left} y={cy - ARM_REACH} width={BODY_HALF * 2} height={ARM_LEN} fill={color} />
            ) : null}
            {(t & TraceDir.DOWN) ? (
                <rect x={left} y={cy + BODY_HALF} width={BODY_HALF * 2} height={ARM_LEN} fill={color} />
            ) : null}
            {(t & TraceDir.LEFT) ? (
                <rect x={cx - ARM_REACH} y={top} width={ARM_LEN} height={BODY_HALF * 2} fill={color} />
            ) : null}
            {(t & TraceDir.RIGHT) ? (
                <rect x={cx + BODY_HALF} y={top} width={ARM_LEN} height={BODY_HALF * 2} fill={color} />
            ) : null}

            {/* Selection highlight */}
            {selected && (
                <rect
                    x={t & TraceDir.LEFT ? cx - ARM_REACH : left}
                    y={t & TraceDir.UP ? cy - ARM_REACH : top}
                    width={(t & TraceDir.LEFT ? ARM_REACH : 0) + BODY_HALF * 2 + (t & TraceDir.RIGHT ? ARM_REACH : 0)}
                    height={(t & TraceDir.UP ? ARM_REACH : 0) + BODY_HALF * 2 + (t & TraceDir.DOWN ? ARM_REACH : 0)}
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth={2}
                    rx={1}
                />
            )}
        </g>
    );
}
