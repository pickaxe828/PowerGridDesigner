import { useState } from 'react';
import { useCircuitStore } from '../store/circuitStore';
import { downloadNbtBinary, downloadMultiTileZip } from '../pipeline/nbtCompiler';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Toolbar() {
  const clearAll = useCircuitStore(s => s.clearAll);
  const getCircuitState = useCircuitStore(s => s.getCircuitState);
  const activeLayer = useCircuitStore(s => s.activeLayer);
  const toggleLayer = useCircuitStore(s => s.toggleLayer);
  const activeTool = useCircuitStore(s => s.activeTool);

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
      if (tilesX === 1 && tilesY === 1) {
        await downloadNbtBinary(state, 'circuit_board.nbt');
      } else {
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
      <div className="flex items-center justify-between h-12 px-4 bg-card border-b border-border z-[100]">
        <div className="flex items-center gap-2">
          <span className="text-xl [filter:drop-shadow(0_0_6px_#f59e0b)]">⚡</span>
          <h1 className="text-sm font-bold tracking-wider bg-gradient-to-br from-amber-500 to-cyan-500 bg-clip-text text-transparent">
            PowerGrid Designer
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-[11px] text-muted-foreground">
            Tool: <strong className="text-foreground">{toolLabel}</strong>
          </span>
          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
            <span>Layer:</span>
            <Button
              variant="ghost"
              size="xs"
              onClick={toggleLayer}
              title="Switch layer (F)"
            >
              <strong className={`font-bold text-[11px] ${activeLayer === 'front' ? 'text-[#e74c3c]' : 'text-[#3498db]'}`}>
                {activeLayer.toUpperCase()}
              </strong>
              <span className={`w-5 h-2.5 rounded-full relative ${activeLayer === 'front' ? 'bg-[#e74c3c55]' : 'bg-[#3498db55]'}`}>
                <span className={`absolute block w-2 h-2 rounded-full top-px transition-[margin] duration-200 ${activeLayer === 'front' ? 'bg-[#e74c3c] left-px' : 'bg-[#3498db] left-[11px]'}`} />
              </span>
            </Button>
            <kbd className="text-[9px] font-bold text-foreground bg-muted border border-border rounded px-1.5 min-w-[18px] text-center ml-1">F</kbd>
          </span>
        </div>

        <div className="flex gap-1.5">
          <Button
            size="sm"
            onClick={() => setShowExportModal(true)}
            className="bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-600 text-[11px] font-bold"
          >
            🎮 Export NBT
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportJSON}
            className="text-[11px]"
          >
            📋 Export JSON
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={clearAll}
            className="text-[11px]"
          >
            🗑 Clear
          </Button>
        </div>
      </div>

      <Dialog open={showExportModal} onOpenChange={setShowExportModal}>
        <DialogContent className="bg-card border-border !max-w-[320px]">
          <DialogTitle>Export Schematic</DialogTitle>

          <div className="flex flex-col gap-4 py-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="tiles-x" className="text-xs text-muted-foreground">Width (Boards X)</Label>
              <Input
                id="tiles-x"
                type="number"
                min={1}
                max={20}
                value={tilesX}
                onChange={e => setTilesX(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 text-center"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="tiles-y" className="text-xs text-muted-foreground">Height (Boards Y)</Label>
              <Input
                id="tiles-y"
                type="number"
                min={1}
                max={20}
                value={tilesY}
                onChange={e => setTilesY(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20 text-center"
              />
            </div>
          </div>

          <p className="text-[10px] text-emerald-500 text-center">
            {tilesX === 1 && tilesY === 1
              ? "Exports a single .nbt file"
              : `Exports a .zip archive containing ${tilesX * tilesY} boards`}
          </p>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowExportModal(false)}
              disabled={isExporting}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={confirmExport}
              disabled={isExporting}
              className="bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-600"
            >
              {isExporting ? 'Compiling...' : 'Confirm Export'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
