import { useState } from 'react';
import { COMPONENT_REGISTRY, type ToolType } from '../types/circuit';
import { useCircuitStore } from '../store/circuitStore';

/** Tool-selector component palette sidebar */
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
    <div className="component-palette">
        <h2 className="palette-title">Tools</h2>
        {/* Built-in tools */}
        <div className="palette-category">
          <h3 className="palette-category-label">🖱 General</h3>
          <div className="palette-items">
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
        {/* Component tools */}
        <h2 className="palette-title">Components</h2>
        {categories.map(cat => {
          const items = COMPONENT_REGISTRY.filter(c => c.category === cat.key);
          if (!items.length) return null;
          const isCollapsed = collapsed[cat.key] ?? false;
          return (
            <div key={cat.key} className="palette-category">
              <button
                className="palette-category-header"
                onClick={() => setCollapsed(prev => ({ ...prev, [cat.key]: !prev[cat.key] }))}
              >
                <span className={`palette-category-chevron ${isCollapsed ? '' : 'open'}`}>▶</span>
                <h3 className="palette-category-label">{cat.label}</h3>
              </button>
              {!isCollapsed && (
                <div className="palette-items">
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
    <button
      className={`palette-item ${active ? 'active' : ''}`}
      onClick={onSelect}
      style={{ '--accent': color } as React.CSSProperties}
    >
      <div className={`palette-item-icon ${matIcon ? 'palette-item-icon-symbol' : ''}`}>
        {iconSrc ? (
          <img
            src={iconSrc}
            alt={label}
            style={{ imageRendering: 'pixelated', width: '100%', height: '100%', objectFit: 'contain' }}
          />
        ) : matIcon ? (
          <span className="material-symbols-outlined palette-item-symbol">{matIcon}</span>
        ) : (
          <span className="palette-item-dot" style={{ backgroundColor: color }} />
        )}
      </div>
      <span className="palette-item-label">{label}</span>
      {shortcut && <kbd className="palette-shortcut">{shortcut}</kbd>}
    </button>
  );
}
