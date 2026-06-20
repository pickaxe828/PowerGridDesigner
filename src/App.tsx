import { useCallback, useRef, useEffect } from 'react';
import {
    ReactFlow,
    Controls,
    MiniMap,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useCircuitStore } from './store/circuitStore';
import type { ComponentType } from './types/circuit';
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
    const lastPaintedCell = useRef<{ x: number; y: number } | null>(null);

    const nodes = useCircuitStore(s => s.nodes);
    const onNodesChange = useCircuitStore(s => s.onNodesChange);
    const addComponent = useCircuitStore(s => s.addComponent);
    const setSelectedNode = useCircuitStore(s => s.setSelectedNode);
    const activeTool = useCircuitStore(s => s.activeTool);
    const paintWire = useCircuitStore(s => s.paintWire);
    const eraseWire = useCircuitStore(s => s.eraseWire);
    const isPainting = useCircuitStore(s => s.isPainting);
    const setIsPainting = useCircuitStore(s => s.setIsPainting);
    const setSelectedWireKey = useCircuitStore(s => s.setSelectedWireKey);
    const setHoveredCell = useCircuitStore(s => s.setHoveredCell);
    const findComponentAt = useCircuitStore(s => s.findComponentAt);
    const removeComponent = useCircuitStore(s => s.removeComponent);

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

    /** Bug 3 fix: window-level mouseup to catch releases outside canvas */
    useEffect(() => {
        const handleGlobalMouseUp = () => {
            setIsPainting(false);
            lastPaintedCell.current = null;
        };
        window.addEventListener('mouseup', handleGlobalMouseUp);
        return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }, [setIsPainting]);

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
                lastPaintedCell.current = { x: grid.x, y: grid.y };
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
            setIsPainting(true);
            lastPaintedCell.current = { x: grid.x, y: grid.y };

            if (e.button === 2 || activeTool === 'eraser') {
                eraseWire(grid.x, grid.y);
            } else {
                // First cell in drag — no previous cell, no direction yet
                paintWire(grid.x, grid.y);
            }
        } else {
            // Component tool — place at grid position
            addComponent(activeTool as ComponentType, {
                x: grid.x * GRID_SIZE,
                y: grid.y * GRID_SIZE,
            });
        }
    }, [activeTool, screenToGrid, paintWire, eraseWire, addComponent, setIsPainting, findComponentAt, removeComponent]);

    /** Mouse move — continuous drag-to-paint and track hover state */
    const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
        const grid = screenToGrid(e.clientX, e.clientY);
        if (!grid) return;

        // Always track hovered grid globally for keydown deletion
        setHoveredCell(grid);

        if (!isPainting || !(activeTool === 'wire' || activeTool === 'eraser')) return;

        // Skip if same cell as last painted
        if (lastPaintedCell.current && lastPaintedCell.current.x === grid.x && lastPaintedCell.current.y === grid.y) return;

        if (e.buttons === 2 || activeTool === 'eraser') {
            eraseWire(grid.x, grid.y);
            lastPaintedCell.current = { x: grid.x, y: grid.y };
        } else {
            // Paint with directional trace connection from previous cell
            const prev = lastPaintedCell.current;
            paintWire(
                grid.x, grid.y,
                prev?.x, prev?.y,
            );
            lastPaintedCell.current = { x: grid.x, y: grid.y };
        }
    }, [isPainting, activeTool, screenToGrid, paintWire, eraseWire, setHoveredCell]);

    const cursorStyle = (activeTool === 'wire' || activeTool === 'eraser') ? 'crosshair'
        : activeTool === 'select' ? 'default'
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
                    onContextMenu={(e) => e.preventDefault()}
                >
                    <ReactFlow
                        nodes={nodes}
                        edges={[]}
                        onNodesChange={onNodesChange}
                        nodeTypes={nodeTypes}
                        snapToGrid={false}
                        onInit={(instance) => { reactFlowRef.current = instance; }}
                        onNodeClick={(_, node) => {
                            if (activeTool === 'select') setSelectedNode(node.id);
                        }}
                        onPaneClick={() => {
                            if (activeTool === 'select') {
                                setSelectedNode(null);
                                setSelectedWireKey(null);
                            }
                        }}
                        fitView
                        proOptions={{ hideAttribution: true }}
                        nodesDraggable={activeTool === 'select'}
                        panOnDrag={activeTool === 'select'}
                    >
                        <BoardBackground />
                        <Controls />
                        <MiniMap
                            nodeColor={(n) => (n.data?.color as string) || '#f59e0b'}
                            maskColor="rgba(10, 10, 15, 0.7)"
                        />
                        <WireGridOverlay />
                    </ReactFlow>
                </div>
                <PropertiesPanel />
            </div>
        </>
    );
}
