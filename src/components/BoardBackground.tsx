import { useEffect, useRef, useMemo } from 'react';
import { useStore } from '@xyflow/react';
import { useCircuitStore } from '../store/circuitStore';
import { parseWireKey } from '../types/circuit';

const GRID_SIZE = 20;
const BOARD_SIZE = 16;
const BOARD_PX = BOARD_SIZE * GRID_SIZE;

const INACTIVE_MINOR = 'rgba(71, 85, 105, 0.08)';
const INACTIVE_MAJOR = 'rgba(71, 85, 105, 0.15)';
const ACTIVE_MINOR = 'rgba(71, 85, 105, 0.30)';
const ACTIVE_MAJOR = 'rgba(71, 85, 105, 0.50)';
const ACTIVE_FILL = 'rgba(71, 85, 105, 0.04)';

function boardKey(bx: number, by: number): string {
    return `${bx},${by}`;
}

export default function BoardBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const transform = useStore((s) => s.transform);
    const width = useStore((s) => s.width);
    const height = useStore((s) => s.height);

    const homeBoard = useCircuitStore(s => s.homeBoard);
    const wireGrid = useCircuitStore(s => s.wireGrid);
    const nodes = useCircuitStore(s => s.nodes);

    const activeBoards = useMemo(() => {
        const set = new Set<string>();
        // Home board is always active
        set.add(boardKey(homeBoard.bx, homeBoard.by));
        // Any board containing wire cells
        for (const key of wireGrid.keys()) {
            const cell = parseWireKey(key);
            set.add(boardKey(Math.floor(cell.x / BOARD_SIZE), Math.floor(cell.y / BOARD_SIZE)));
        }
        // Any board containing components
        for (const node of nodes) {
            const bx = Math.floor(node.position.x / BOARD_PX);
            const by = Math.floor(node.position.y / BOARD_PX);
            set.add(boardKey(bx, by));
        }
        return set;
    }, [homeBoard, wireGrid, nodes]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !width || !height) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);

        ctx.clearRect(0, 0, width, height);

        const [tx, ty, zoom] = transform;

        const snap = (v: number) => Math.floor(v) + 0.5;

        const startCell = Math.floor(-tx / (GRID_SIZE * zoom)) - 1;
        const endCell = Math.ceil((width - tx) / (GRID_SIZE * zoom)) + 1;

        const startRow = Math.floor(-ty / (GRID_SIZE * zoom)) - 1;
        const endRow = Math.ceil((height - ty) / (GRID_SIZE * zoom)) + 1;

        // PASS 1: All minor grid lines (inactive)
        ctx.beginPath();
        ctx.strokeStyle = INACTIVE_MINOR;
        ctx.lineWidth = 0.5;
        for (let col = startCell; col <= endCell; col++) {
            const x = snap((col - 0.5) * GRID_SIZE * zoom + tx);
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
        }
        for (let row = startRow; row <= endRow; row++) {
            const y = snap((row - 0.5) * GRID_SIZE * zoom + ty);
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
        }
        ctx.stroke();

        // PASS 2: All major board boundaries (inactive)
        ctx.beginPath();
        ctx.strokeStyle = INACTIVE_MAJOR;
        ctx.lineWidth = 1.5;
        for (let col = startCell; col <= endCell; col++) {
            if (col % BOARD_SIZE === 0) {
                const x = snap((col - 0.5) * GRID_SIZE * zoom + tx);
                ctx.moveTo(x, 0);
                ctx.lineTo(x, height);
            }
        }
        for (let row = startRow; row <= endRow; row++) {
            if (row % BOARD_SIZE === 0) {
                const y = snap((row - 0.5) * GRID_SIZE * zoom + ty);
                ctx.moveTo(0, y);
                ctx.lineTo(width, y);
            }
        }
        ctx.stroke();

        // PASS 3: Highlight active boards
        const startBX = Math.floor(startCell / BOARD_SIZE) - 1;
        const endBX = Math.ceil(endCell / BOARD_SIZE) + 1;
        const startBoardY = Math.floor(startRow / BOARD_SIZE) - 1;
        const endBoardY = Math.ceil(endRow / BOARD_SIZE) + 1;

        for (let by = startBoardY; by <= endBoardY; by++) {
            for (let bx = startBX; bx <= endBX; bx++) {
                if (!activeBoards.has(boardKey(bx, by))) continue;

                const bxStart = bx * BOARD_SIZE;
                const byStart = by * BOARD_SIZE;

                const fX = snap((bxStart - 0.5) * GRID_SIZE * zoom + tx);
                const fY = snap((byStart - 0.5) * GRID_SIZE * zoom + ty);
                const fW = BOARD_PX * zoom;
                const fH = BOARD_PX * zoom;

                ctx.fillStyle = ACTIVE_FILL;
                ctx.fillRect(fX, fY, fW, fH);

                // Active minor grid lines
                ctx.beginPath();
                ctx.strokeStyle = ACTIVE_MINOR;
                ctx.lineWidth = 0.5;
                for (let col = bxStart; col <= bxStart + BOARD_SIZE; col++) {
                    const x = snap((col - 0.5) * GRID_SIZE * zoom + tx);
                    if (x < 0 || x > width) continue;
                    ctx.moveTo(x, Math.max(0, fY));
                    ctx.lineTo(x, Math.min(height, fY + fH));
                }
                for (let row = byStart; row <= byStart + BOARD_SIZE; row++) {
                    const y = snap((row - 0.5) * GRID_SIZE * zoom + ty);
                    if (y < 0 || y > height) continue;
                    ctx.moveTo(Math.max(0, fX), y);
                    ctx.lineTo(Math.min(width, fX + fW), y);
                }
                ctx.stroke();

                // Active board boundary
                ctx.beginPath();
                ctx.strokeStyle = ACTIVE_MAJOR;
                ctx.lineWidth = 1.5;

                const tY = snap((byStart - 0.5) * GRID_SIZE * zoom + ty);
                const bY = snap((byStart + BOARD_SIZE - 0.5) * GRID_SIZE * zoom + ty);
                const lX = snap((bxStart - 0.5) * GRID_SIZE * zoom + tx);
                const rX = snap((bxStart + BOARD_SIZE - 0.5) * GRID_SIZE * zoom + tx);

                ctx.moveTo(lX, tY); ctx.lineTo(rX, tY);
                ctx.moveTo(lX, bY); ctx.lineTo(rX, bY);
                ctx.moveTo(lX, tY); ctx.lineTo(lX, bY);
                ctx.moveTo(rX, tY); ctx.lineTo(rX, bY);

                ctx.stroke();
            }
        }

    }, [transform, width, height, activeBoards]);

    return (
        <canvas
            ref={canvasRef}
            className="react-flow__background"
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: -1,
            }}
        />
    );
}
