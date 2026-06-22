import { useCallback, useRef, useEffect, useState } from 'react';
import {
    ReactFlow,
    Controls,
    ControlButton,
    MiniMap,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useCircuitStore } from './store/circuitStore';
import type { ComponentType } from './types/circuit';
import { parseWireKey } from './types/circuit';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

import ComponentPalette from './components/ComponentPalette';
import PropertiesPanel from './components/PropertiesPanel';
import Toolbar from './components/Toolbar';
import WireGridOverlay from './components/WireGridOverlay';
import BoardBackground from './components/BoardBackground';

// Node types
import ResistorNode from './components/nodes/ResistorNode';
import CapacitorNode from './components/nodes/CapacitorNode';
import DiodeNode from './components/nodes/DiodeNode';
import VaristorNode from './components/nodes/VaristorNode';
import BarretterTubeNode from './components/nodes/BarretterTubeNode';
import NeonBulbNode from './components/nodes/NeonBulbNode';
import RegulatorTubeNode from './components/nodes/RegulatorTubeNode';
import PotentiometerNode from './components/nodes/PotentiometerNode';
import Bjt_pnpNode from './components/nodes/PnpBjtNode';
import Bjt_npnNode from './components/nodes/NpnBjtNode';
import StaticInductionTransistorNode from './components/nodes/StaticInductionTransistorNode';
import RelayDpdtNode from './components/nodes/RelayDpdtNode';
import RelaySpdtNode from './components/nodes/RelaySpdtNode';
import WireConnectorNode from './components/nodes/WireConnectorNode';
import ViaConnectorNode from './components/nodes/ViaConnectorNode';
import ElectronTubeNode from './components/nodes/ElectronTubeNode';
import LVBulbNode from './components/nodes/LVBulbNode';
import InductorNode from './components/nodes/InductorNode';

const nodeTypes = {
    resistor: ResistorNode,
    capacitor: CapacitorNode,
    diode: DiodeNode,
    varistor: VaristorNode,
    barretter_tube: BarretterTubeNode,
    neon_bulb: NeonBulbNode,
    lv_bulb: LVBulbNode,
    regulator_tube: RegulatorTubeNode,
    electron_tube: ElectronTubeNode,
    potentiometer: PotentiometerNode,
    bjt_pnp: Bjt_pnpNode,
    bjt_npn: Bjt_npnNode,
    static_induction_transistor: StaticInductionTransistorNode,
    relay_dpdt: RelayDpdtNode,
    relay_spdt: RelaySpdtNode,
    connector: WireConnectorNode,
    inductor: InductorNode,
    via: ViaConnectorNode,
};

const GRID_SIZE = 20;

export default function App() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reactFlowRef = useRef<any>(null);
    const axisLockStart = useRef<{ x: number; y: number } | null>(null);
    const paintAxis = useRef<'horizontal' | 'vertical' | null>(null);
    const lineToCommit = useRef<{ fromX: number; fromY: number; toX: number; toY: number } | null>(null);
    const [wirePreview, setWirePreview] = useState<{ start: { x: number; y: number }; end: { x: number; y: number } } | null>(null);

    const nodes = useCircuitStore(s => s.nodes);
    const onNodesChange = useCircuitStore(s => s.onNodesChange);
    const addComponent = useCircuitStore(s => s.addComponent);
    const setSelectedNode = useCircuitStore(s => s.setSelectedNode);
    const activeTool = useCircuitStore(s => s.activeTool);
    const paintWire = useCircuitStore(s => s.paintWire);
    const paintLine = useCircuitStore(s => s.paintLine);
    const eraseWire = useCircuitStore(s => s.eraseWire);
    const isPainting = useCircuitStore(s => s.isPainting);
    const setIsPainting = useCircuitStore(s => s.setIsPainting);
    const setSelectedWireKey = useCircuitStore(s => s.setSelectedWireKey);
    const setHoveredCell = useCircuitStore(s => s.setHoveredCell);
    const findComponentAt = useCircuitStore(s => s.findComponentAt);
    const removeComponent = useCircuitStore(s => s.removeComponent);

    // Keep paintLine ref current for the global mouseup handler
    const paintLineRef = useRef(paintLine);
    paintLineRef.current = paintLine;

    useKeyboardShortcuts();

    /** Convert screen coords → flow coords → grid cell */
    const screenToGrid = useCallback((clientX: number, clientY: number) => {
        if (!reactFlowRef.current) return null;
        const pos = reactFlowRef.current.screenToFlowPosition({ x: clientX, y: clientY });
        return {
            x: Math.floor((pos.x + GRID_SIZE / 2) / GRID_SIZE),
            y: Math.floor((pos.y + GRID_SIZE / 2) / GRID_SIZE),
        };
    }, []);

    useEffect(() => {
        const handleGlobalMouseUp = () => {
            if (lineToCommit.current) {
                const { fromX, fromY, toX, toY } = lineToCommit.current;
                if (fromX !== toX || fromY !== toY) {
                    paintLineRef.current(fromX, fromY, toX, toY);
                }
                lineToCommit.current = null;
            }
            setWirePreview(null);
            setIsPainting(false);
            axisLockStart.current = null;
            paintAxis.current = null;
        };
        window.addEventListener('mouseup', handleGlobalMouseUp);
        return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }, [setIsPainting, setWirePreview]);

    /** Mouse down on canvas — start wire painting or place component */
    const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
        const grid = screenToGrid(e.clientX, e.clientY);
        if (!grid) return;

        // Universal Right-Click Deletion
        if (e.button === 2 || e.buttons === 2) {
            e.preventDefault();
            e.stopPropagation();
            const compId = findComponentAt(grid.x, grid.y);
            if (compId) {
                removeComponent(compId);
                return;
            }
            if (activeTool === 'wire' || activeTool === 'eraser') {
                eraseWire(grid.x, grid.y);
                setIsPainting(true);
            }
            return;
        }

        if (activeTool === 'select') return;

        // Don't paint when clicking on nodes
        const target = e.target as HTMLElement;
        if (target.closest('.react-flow__node')) return;

        if (activeTool === 'wire' || activeTool === 'eraser') {
            e.preventDefault();
            e.stopPropagation();

            if (activeTool === 'wire' && isPainting) {
                // Second click while previewing → commit
                commitWirePreview();
                return;
            }

            setIsPainting(true);
            axisLockStart.current = { x: grid.x, y: grid.y };
            paintAxis.current = null;

            if (activeTool === 'eraser') {
                eraseWire(grid.x, grid.y);
            } else {
                setWirePreview({ start: grid, end: grid });
                lineToCommit.current = { fromX: grid.x, fromY: grid.y, toX: grid.x, toY: grid.y };
            }
        } else {
            // Component tool — place at grid position
            addComponent(activeTool as ComponentType, {
                x: grid.x * GRID_SIZE,
                y: grid.y * GRID_SIZE,
            });
        }
    }, [activeTool, screenToGrid, paintWire, eraseWire, addComponent, setIsPainting, findComponentAt, removeComponent]);

    /** Mouse move — track hover and update wire preview during painting */
    const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
        const grid = screenToGrid(e.clientX, e.clientY);
        if (!grid) return;

        setHoveredCell(grid);

        if (!isPainting || !(activeTool === 'wire' || activeTool === 'eraser')) return;

        if (e.buttons === 2 || activeTool === 'eraser') {
            eraseWire(grid.x, grid.y);
            return;
        }

        // Axis-constrained wire preview (no actual paint until mouse up)
        const start = axisLockStart.current;
        if (!start) return;

        let constrainedX = grid.x;
        let constrainedY = grid.y;

        const dx = Math.abs(constrainedX - start.x);
        const dy = Math.abs(constrainedY - start.y);
        if (dx + dy === 0) return;
        if (dx >= dy) {
            paintAxis.current = 'horizontal';
            constrainedY = start.y;
        } else {
            paintAxis.current = 'vertical';
            constrainedX = start.x;
        }

        setWirePreview({ start: { x: start.x, y: start.y }, end: { x: constrainedX, y: constrainedY } });
        lineToCommit.current = { fromX: start.x, fromY: start.y, toX: constrainedX, toY: constrainedY };
    }, [isPainting, activeTool, screenToGrid, eraseWire, setHoveredCell]);

    const commitWirePreview = useCallback(() => {
        if (!lineToCommit.current) return;
        const { fromX, fromY, toX, toY } = lineToCommit.current;
        if (fromX !== toX || fromY !== toY) {
            paintWire(fromX, fromY);
            paintLine(fromX, fromY, toX, toY);
        } else {
            paintWire(fromX, fromY);
        }
        lineToCommit.current = null;
        setWirePreview(null);
        setIsPainting(false);
        axisLockStart.current = null;
        paintAxis.current = null;
    }, [paintWire, paintLine]);

    const handleCanvasMouseUp = useCallback(() => {
        commitWirePreview();
    }, [commitWirePreview]);

    const fitViewWithWires = useCallback(() => {
        const rf = reactFlowRef.current;
        if (!rf) return;

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        for (const node of nodes) {
            minX = Math.min(minX, node.position.x);
            minY = Math.min(minY, node.position.y);
            maxX = Math.max(maxX, node.position.x + ((node.width as number) || 40));
            maxY = Math.max(maxY, node.position.y + ((node.height as number) || 40));
        }

        const wg = useCircuitStore.getState().wireGrid;
        for (const key of wg.keys()) {
            const cell = parseWireKey(key);
            minX = Math.min(minX, cell.x * GRID_SIZE);
            minY = Math.min(minY, cell.y * GRID_SIZE);
            maxX = Math.max(maxX, (cell.x + 1) * GRID_SIZE);
            maxY = Math.max(maxY, (cell.y + 1) * GRID_SIZE);
        }

        if (minX === Infinity) {
            rf.fitBounds({ x: -10, y: -10, width: 340, height: 340 }, { padding: 0.1, duration: 300 });
        } else {
            rf.fitBounds(
                { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
                { padding: 0.2, duration: 300 }
            );
        }
    }, [nodes]);

    const cursorStyle = (activeTool === 'wire' || activeTool === 'eraser') ? 'crosshair'
        : activeTool === 'select' ? 'grab'
            : 'cell';

    return (
        <>
            <Toolbar />
            <div className="app-layout">
                <ComponentPalette />
                <div
                    className="canvas-container"
                    style={{ cursor: cursorStyle }}
                    onMouseDown={handleCanvasMouseDown}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                    onContextMenu={(e) => e.preventDefault()}
                >
                    <ReactFlow
                        nodes={nodes}
                        edges={[]}
                        onNodesChange={onNodesChange}
                        nodeTypes={nodeTypes}
                        snapToGrid={false}
                        panOnScroll={true}
                        panOnScrollSpeed={1}
                        onInit={(instance) => {
                            reactFlowRef.current = instance;
                            instance.fitBounds(
                                { x: 0, y: 0, width: 320, height: 320 },
                                { padding: 0.2, duration: 0 }
                            );
                        }}
                        onNodeClick={(_, node) => {
                            if (activeTool === 'select') setSelectedNode(node.id);
                        }}
                        onPaneClick={() => {
                            if (activeTool === 'select') {
                                setSelectedNode(null);
                                setSelectedWireKey(null);
                            }
                        }}
                        defaultViewport={{ x: -120, y: -120, zoom: 1 }}
                        proOptions={{ hideAttribution: true }}
                        nodesDraggable={activeTool === 'select'}
                        panOnDrag={activeTool === 'select' ? true : [1]}
                    >
                        <BoardBackground />
                        <Controls showFitView={false}>
                            <ControlButton onClick={fitViewWithWires} title="Fit view (nodes + wires)">
                                <svg viewBox="0 0 32 30" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M3.692 4.63c0-.53.4-.938.939-.938h5.215V0H4.708C2.13 0 0 2.054 0 4.63v5.216h3.692V4.631zM27.354 0h-5.2v3.692h5.17c.53 0 .984.4.984.939v5.215H32V4.631A4.624 4.624 0 0027.354 0zm.954 24.83c0 .532-.4.94-.939.94h-5.215v3.768h5.215c2.577 0 4.631-2.13 4.631-4.707v-5.139h-3.692v5.139zm-23.677.94c-.531 0-.939-.4-.939-.94v-5.138H0v5.139c0 2.577 2.13 4.707 4.708 4.707h5.138V25.77H4.631z" />
                                </svg>
                            </ControlButton>
                        </Controls>
                        <MiniMap
                            nodeColor={(n) => (n.data?.color as string) || '#f59e0b'}
                            maskColor="rgba(10, 10, 15, 0.7)"
                        />
                        <WireGridOverlay previewLine={wirePreview} />
                    </ReactFlow>
                </div>
                <PropertiesPanel />
            </div>
        </>
    );
}
