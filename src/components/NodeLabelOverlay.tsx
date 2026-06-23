import { useStore } from '@xyflow/react';
import { useCircuitStore } from '../store/circuitStore';
import { COMPONENT_MAP, type Facing, type ComponentType } from '../types/circuit';

export default function NodeLabelOverlay() {
  const nodes = useCircuitStore(s => s.nodes);
  const hoveredNodeId = useCircuitStore(s => s.hoveredNodeId);
  const selectedNodeId = useCircuitStore(s => s.selectedNodeId);

  const transform = useStore(s => s.transform);
  const [tx, ty, zoom] = transform;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1000,
        overflow: 'visible',
      }}
    >
      <div style={{ transform: `translate(${tx}px, ${ty}px) scale(${zoom})`, transformOrigin: '0 0' }}>
        {nodes.map(node => {
          const meta = COMPONENT_MAP[node.data.componentType as ComponentType];
          if (!meta) return null;

          const w = node.width || meta.width || 40;
          const h = node.height || meta.height || 40;
          const cx = w / 2;
          const cy = h / 2;
          const isHovered = node.id === hoveredNodeId;
          const isSelected = node.id === selectedNodeId;

          const rotatedPins = (meta.pins || []).map(pin => {
            const dx = pin.x - cx;
            const dy = pin.y - cy;
            let rx = dx, ry = dy;
            const facing = (node.data.facing as Facing) || 'north';
            switch (facing) {
              case 'east': rx = -dy; ry = dx; break;
              case 'south': rx = -dx; ry = -dy; break;
              case 'west': rx = dy; ry = -dx; break;
            }
            return { ...pin, x: cx + rx, y: cy + ry };
          });

          return (
            <div key={node.id}>
              {/* Node ID label below the component */}
              <div
                className="circuit-node-label"
                style={{
                  position: 'absolute',
                  left: node.position.x + w / 2,
                  top: node.position.y + h + 2,
                  transform: 'translateX(-50%)',
                }}
              >
                {node.data.label as string}
              </div>

              {/* Pin labels */}
              {rotatedPins.map(pin => (
                <span
                  key={`${node.id}-${pin.id}`}
                  className="pin-annotation"
                  style={{
                    position: 'absolute',
                    left: node.position.x + pin.x,
                    top: node.position.y + pin.y - 8,
                    transform: 'translate(-50%, -100%)',
                    opacity: isHovered || isSelected ? 1 : 0,
                  }}
                >
                  {pin.label}
                </span>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
