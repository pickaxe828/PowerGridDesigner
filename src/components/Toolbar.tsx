import { useState } from 'react';
import { useCircuitStore } from '../store/circuitStore';
// Make sure you import both of the export functions you built earlier!
import { downloadNbtBinary, downloadMultiTileZip } from '../pipeline/nbtCompiler';

export default function Toolbar() {
    const clearAll = useCircuitStore(s => s.clearAll);
    const getCircuitState = useCircuitStore(s => s.getCircuitState);
    const activeLayer = useCircuitStore(s => s.activeLayer);
    const toggleLayer = useCircuitStore(s => s.toggleLayer);
    const activeTool = useCircuitStore(s => s.activeTool);

    // Modal State
    const [showExportModal, setShowExportModal] = useState(false);
    const [tilesX, setTilesX] = useState(1);
    const [tilesY, setTilesY] = useState(1);
    const [isExporting, setIsExporting] = useState(false);

    const handleExportJSON = () => {
        const state = getCircuitState();
        const json = JSON.stringify(state, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'circuit.json';
        a.click();
        URL.revokeObjectURL(url);
    };

    const confirmExport = async () => {
        setIsExporting(true);
        try {
            const state = getCircuitState();

            // If it's just 1x1, do a standard single file export
            if (tilesX === 1 && tilesY === 1) {
                await downloadNbtBinary(state, 'circuit_board.nbt');
            } else {
                // If it's larger, pack it into a ZIP array
                await downloadMultiTileZip(state, tilesX, tilesY);
            }

            setShowExportModal(false);
        } catch (error) {
            alert('Failed to compile NBT schematic. Check console for details.');
            console.error(error);
        } finally {
            setIsExporting(false);
        }
    };

    const toolLabel = activeTool === 'select' ? 'Navigate'
        : activeTool === 'wire' ? 'Wire Paint'
            : activeTool === 'eraser' ? 'Eraser'
                : activeTool.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    return (
        <>
            <div className="toolbar">
                <div className="toolbar-brand">
                    <span className="toolbar-logo">⚡</span>
                    <h1 className="toolbar-title">PowerGrid Designer</h1>
                </div>

                <div className="toolbar-status">
                    <span className="toolbar-status-item">
                        Tool: <strong>{toolLabel}</strong>
                    </span>
                    <span className="toolbar-status-item">
                        <span>Layer: </span>
                        <button className="layer-tgl" onClick={toggleLayer} title={`Switch layer (F)`}>
                            <strong className={`layer-badge ${activeLayer}`}>{activeLayer.toUpperCase()}</strong>
                            <span className={`layer-tgl-pill ${activeLayer}`} />
                        </button>
                        <kbd className="layer-tgl-kbd">F</kbd>
                    </span>
                </div>

                <div className="toolbar-actions">
                    {/* Change this button to open the modal instead of instantly exporting */}
                    <button
                        className="toolbar-btn"
                        onClick={() => setShowExportModal(true)}
                        title="Export circuit as Minecraft NBT Schematic"
                        style={{ backgroundColor: '#10b981', color: '#fff', borderColor: '#059669', fontWeight: 'bold' }}
                    >
                        🎮 Export NBT
                    </button>
                    <button className="toolbar-btn" onClick={handleExportJSON} title="Export circuit as JSON">
                        📋 Export JSON
                    </button>
                    <button className="toolbar-btn danger" onClick={clearAll} title="Clear all components">
                        🗑 Clear
                    </button>
                </div>
            </div>

            {/* ─── The Export Modal Overlay ─── */}
            {showExportModal && (
                <div className="modal-overlay" onClick={() => setShowExportModal(false)}>
                    {/* Prevent clicks inside the modal from closing the overlay */}
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            Export Schematic
                        </div>

                        <div className="modal-body">
                            <div className="modal-input-group">
                                <label>Width (Boards X):</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="20"
                                    value={tilesX}
                                    onChange={(e) => setTilesX(Math.max(1, parseInt(e.target.value) || 1))}
                                />
                            </div>

                            <div className="modal-input-group">
                                <label>Height (Boards Y):</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="20"
                                    value={tilesY}
                                    onChange={(e) => setTilesY(Math.max(1, parseInt(e.target.value) || 1))}
                                />
                            </div>

                            <div className="modal-info">
                                {tilesX === 1 && tilesY === 1
                                    ? "Exports a single .nbt file"
                                    : `Exports a .zip archive containing ${tilesX * tilesY} boards`}
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button
                                className="toolbar-btn"
                                onClick={() => setShowExportModal(false)}
                                disabled={isExporting}
                            >
                                Cancel
                            </button>
                            <button
                                className="toolbar-btn accent"
                                onClick={confirmExport}
                                disabled={isExporting}
                                style={{ backgroundColor: '#10b981', color: '#fff', borderColor: '#059669' }}
                            >
                                {isExporting ? 'Compiling...' : 'Confirm Export'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}