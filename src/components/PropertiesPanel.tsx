import { useCircuitStore } from '../store/circuitStore';
import { COMPONENT_MAP, type Facing, TraceDir, DIR_LABELS, type WireLayer } from '../types/circuit';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function PropertiesPanel() {
  const selectedNodeId = useCircuitStore(s => s.selectedNodeId);
  const selectedWireKey = useCircuitStore(s => s.selectedWireKey);
  const nodes = useCircuitStore(s => s.nodes);
  const wireGrid = useCircuitStore(s => s.wireGrid);
  const updateComponentData = useCircuitStore(s => s.updateComponentData);
  const rotateComponent = useCircuitStore(s => s.rotateComponent);
  const removeComponent = useCircuitStore(s => s.removeComponent);
  const deleteSelected = useCircuitStore(s => s.deleteSelected);

  const node = nodes.find(n => n.id === selectedNodeId);

  const panelOuter = "w-60 bg-card border-l border-border flex-shrink-0 flex flex-col";
  const panelInner = "flex-1 overflow-y-auto p-3 pr-3.5";

  if (selectedWireKey && !node) {
    const parts = selectedWireKey.split(',');
    const x = parseInt(parts[0]);
    const y = parseInt(parts[1]);
    const layer = parts[2] as WireLayer;
    const traces = wireGrid.get(selectedWireKey) || 0;
    return (
      <div className={panelOuter}>
        <div className={panelInner}>
        <h2 className="text-sm font-extrabold uppercase tracking-wider text-foreground pb-2 mb-3 border-b border-border">Wire Trace</h2>
        <div className="mb-3">
          <Label className="text-[9px] font-semibold uppercase tracking-wider text-foreground mb-1">Position</Label>
          <span className="text-xs text-foreground px-2 py-1 bg-muted rounded inline-block">({x}, {y})</span>
        </div>
        <div className="mb-3">
          <Label className="text-[9px] font-semibold uppercase tracking-wider text-foreground mb-1">Layer</Label>
          <span className={`text-xs font-bold px-2 py-1 rounded inline-block ${layer === 'front' ? 'text-[#e74c3c]' : 'text-[#3498db]'}`}>
            {layer.toUpperCase()}
          </span>
        </div>
        <div className="mb-3">
          <Label className="text-[9px] font-semibold uppercase tracking-wider text-foreground mb-1">Directions</Label>
          <span className="text-xs text-foreground px-2 py-1 bg-muted rounded inline-block">
            {traces === 0 ? '(none - isolated cell)' : (
              [TraceDir.UP, TraceDir.DOWN, TraceDir.LEFT, TraceDir.RIGHT]
                .filter(d => traces & d)
                .map(d => DIR_LABELS[d] || d.toString(16))
                .join(' ')
            )}
          </span>
        </div>
        <Button variant="destructive" size="sm" onClick={deleteSelected} className="w-full mt-4 text-[10px]">
          🗑 Delete Wire Trace
        </Button>
        </div>
      </div>
    );
  }

  if (!node) {
    return (
      <div className={panelOuter}>
        <div className={panelInner}>
        <h2 className="text-sm font-extrabold uppercase tracking-wider text-foreground pb-2 mb-3 border-b border-border">Properties</h2>
        <p className="text-xs text-muted-foreground text-center py-4">Click a component or wire trace to edit its properties.</p>
        <div className="mt-4 pt-3 border-t border-border">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-foreground mb-2">Shortcuts</h3>
          <div className="flex flex-col gap-0.5">
            {[
              ['W', 'Wire Paint'],
              ['E', 'Eraser'],
              ['R', 'Resistor'],
              ['C', 'Capacitor'],
              ['F', 'Flip Layer'],
              ['H/ESC', 'Navigate'],
              ['DEL', 'Delete'],
            ].map(([key, label]) => (
              <div key={key} className="text-[10px] text-muted-foreground flex items-center gap-2 py-0.5">
                <kbd className="text-[9px] font-bold text-foreground bg-muted border border-border rounded px-1.5 min-w-[18px] text-center">{key}</kbd>
                {label}
              </div>
            ))}
          </div>
        </div>
        </div>
      </div>
    );
  }

  const meta = COMPONENT_MAP[node.data.componentType as keyof typeof COMPONENT_MAP];
  const facing = (node.data.facing || 'north') as Facing;

  return (
    <div className={panelOuter}>
      <div className={panelInner}>
      <h2 className="text-sm font-extrabold uppercase tracking-wider text-foreground pb-2 mb-3 border-b border-border">Properties</h2>

      <div className="mb-3">
        <Label className="text-[9px] font-semibold uppercase tracking-wider text-foreground mb-1">ID</Label>
        <span className="text-xs text-foreground px-2 py-1 bg-muted rounded inline-block">{node.data.label as string}</span>
      </div>

      <div className="mb-3">
        <Label className="text-[9px] font-semibold uppercase tracking-wider text-foreground mb-1">Type</Label>
        <span className="text-xs text-foreground px-2 py-1 bg-muted rounded inline-block">{meta?.label || node.data.componentType as string}</span>
      </div>

      <div className="mb-3">
        <Label className="text-[9px] font-semibold uppercase tracking-wider text-foreground mb-1">Position</Label>
        <span className="text-xs text-foreground px-2 py-1 bg-muted rounded inline-block">
          ({Math.round(node.position.x / 20)}, {Math.round(node.position.y / 20)})
        </span>
      </div>

      <div className="mb-3">
        <Label className="text-[9px] font-semibold uppercase tracking-wider text-foreground mb-1">Facing (visual only)</Label>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-amber-500 min-w-[50px] text-center">{facing.toUpperCase()}</span>
          <Button variant="outline" size="sm" onClick={() => rotateComponent(node.id)} className="text-[10px]">
            ↻ Rotate
          </Button>
        </div>
      </div>

      {meta?.properties?.map(prop => (
        <div key={prop.id} className="mb-3">
          <Label className="text-[9px] font-semibold uppercase tracking-wider text-foreground mb-1">{prop.label} ({prop.unit})</Label>
          <Input
            type="number"
            value={(node.data.customProperties as Record<string, number>)?.[prop.id] ?? prop.defaultValue}
            onChange={e => {
              const val = parseFloat(e.target.value) || 0;
              updateComponentData(node.id, {
                customProperties: {
                  ...(node.data.customProperties as Record<string, number> || {}),
                  [prop.id]: val
                }
              });
            }}
            min={prop.min}
            max={prop.max}
            step={prop.step || 'any'}
          />
        </div>
      ))}

      <div className="mb-3">
        <Label className="text-[9px] font-semibold uppercase tracking-wider text-foreground mb-1">Label</Label>
        <Input
          type="text"
          value={(node.data.label as string) || ''}
          onChange={e => updateComponentData(node.id, { label: e.target.value })}
        />
      </div>

      <Button variant="destructive" size="sm" onClick={() => removeComponent(node.id)} className="w-full mt-4 text-[10px]">
        🗑 Delete Component
      </Button>
      </div>
    </div>
  );
}
