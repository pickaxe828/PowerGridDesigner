import { useState } from 'react';
import { COMPONENT_REGISTRY, type ToolType } from '../types/circuit';
import { useCircuitStore } from '../store/circuitStore';
import { Button } from '@/components/ui/button';

export default function ComponentPalette() {
  const activeTool = useCircuitStore(s => s.activeTool);
  const setActiveTool = useCircuitStore(s => s.setActiveTool);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const categories = [
    { key: 'passive', label: '🔧 Passive' },
    { key: 'active', label: '💡 Active' },
    { key: 'switching', label: '🔀 Switching' },
  ] as const;

  return (
    <div className="w-[200px] bg-card border-r border-border flex-shrink-0 flex flex-col">
      <div className="flex-1 overflow-y-auto p-3 pl-3.5">
      <h2 className="text-sm font-extrabold uppercase tracking-wider text-foreground pb-2 mb-2 border-b border-border">Tools</h2>

      <div className="mb-1">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-foreground py-1">🖱 General</h3>
        <div className="flex flex-col gap-0.5">
          <ToolItem
            tool="select"
            label="Navigate"
            shortcut="H"
            color="#5294f2"
            active={activeTool === 'select'}
            onSelect={() => setActiveTool('select')}
          />
          <ToolItem
            tool="wire"
            label="Wire Paint"
            shortcut="W"
            color="#f59e0b"
            active={activeTool === 'wire'}
            onSelect={() => setActiveTool('wire')}
          />
          <ToolItem
            tool="eraser"
            label="Eraser"
            shortcut="E"
            color="#f43f5e"
            active={activeTool === 'eraser'}
            onSelect={() => setActiveTool('eraser')}
          />
        </div>
      </div>

      <h2 className="text-sm font-extrabold uppercase tracking-wider text-foreground pb-2 mb-2 border-b border-border">Components</h2>

      {categories.map(cat => {
        const items = COMPONENT_REGISTRY.filter(c => c.category === cat.key);
        if (!items.length) return null;
        const isCollapsed = collapsed[cat.key] ?? false;
        return (
          <div key={cat.key} className="mb-1">
            <Button
              variant="ghost"
              className="flex items-center gap-1 w-full justify-start px-3 py-1 h-auto text-[10px] font-bold uppercase tracking-wider text-foreground"
              onClick={() => setCollapsed(prev => ({ ...prev, [cat.key]: !prev[cat.key] }))}
            >
              {cat.label}
              <span className={`text-[8px] text-muted-foreground flex-shrink-0 ml-auto transition-transform duration-150 ${isCollapsed ? '' : 'rotate-90'}`}>
                ▶
              </span>
            </Button>
            {!isCollapsed && (
              <div className="flex flex-col gap-0.5">
                {items.map(comp => (
                  <ToolItem
                    key={comp.type}
                    tool={comp.type}
                    label={comp.label}
                    shortcut={comp.shortcutKey?.toUpperCase()}
                    color={comp.color}
                    active={activeTool === comp.type}
                    onSelect={() => setActiveTool(comp.type as ToolType)}
                  />
                ))}
              </div>
            )}
          </div>
        );
        })}
      </div>
    </div>
  );
}

const ICON_MAP: Record<string, string> = {
  resistor: 'resistor.png',
  capacitor: 'capacitor.png',
  diode: 'diode.png',
  varistor: 'varistor.png',
  barretter_tube: 'barretter_tube.png',
  neon_bulb: 'neon_bulb.png',
  regulator_tube: 'regulator_tube.png',
  inductor: 'copper_coil.png',
  potentiometer: 'potentiometer.png',
  bjt_pnp: 'bjt_pnp.png',
  bjt_npn: 'bjt_npn.png',
  static_induction_transistor: 'vfet.png',
  relay_dpdt: 'relay_dpdt.png',
  relay_spdt: 'relay.png',
  lv_bulb: 'lv_bulb.png',
  electron_tube: 'electron_tube.png',
};

const MATERIAL_ICONS: Record<string, string> = {
  select: 'drag_pan',
  wire: 'draw',
  eraser: 'ink_eraser',
  connector: 'outbound',
  via: 'circle_circle',
};

function ToolItem({ tool, label, shortcut, color, active, onSelect }: {
  tool: string;
  label: string;
  shortcut?: string;
  color: string;
  active: boolean;
  onSelect: () => void;
}) {
  const iconSrc = ICON_MAP[tool];
  const matIcon = MATERIAL_ICONS[tool];

  return (
    <Button
      variant={active ? 'secondary' : 'ghost'}
      className="flex items-center gap-2 px-2 py-1.5 h-auto w-full justify-start text-xs font-bold text-muted-foreground"
      style={active ? { borderColor: color, boxShadow: `0 0 8px ${color}40` } : undefined}
      onClick={onSelect}
    >
      <div className={`w-7 h-7 flex items-center justify-center rounded flex-shrink-0 ${matIcon ? 'bg-muted border border-border' : ''}`}>
        {iconSrc ? (
          <img
            src={iconSrc}
            alt={label}
            style={{ imageRendering: 'pixelated', width: '100%', height: '100%', objectFit: 'contain' }}
          />
        ) : matIcon ? (
          <span
            className="material-symbols-outlined text-[18px] leading-none"
            style={{
              fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 20",
              color: active ? color : 'var(--tw-color-foreground)',
              lineHeight: 1,
            }}
          >
            {matIcon}
          </span>
        ) : (
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
        )}
      </div>
      <span className="flex-1 text-left">{label}</span>
      {shortcut && (
        <kbd className="text-[9px] font-bold text-foreground bg-muted border border-border rounded px-1.5 min-w-[18px] text-center">
          {shortcut}
        </kbd>
      )}
    </Button>
  );
}
