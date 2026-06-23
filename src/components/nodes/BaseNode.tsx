import { memo } from 'react';
import { type NodeProps } from '@xyflow/react';
import { useCircuitStore, facingToDeg } from '../../store/circuitStore';
import { COMPONENT_MAP, type Facing } from '../../types/circuit';

interface BaseNodeData {
  label: string;
  facing: Facing;
  componentType: string;
  value?: number;
  unit?: string;
  color: string;
  [key: string]: unknown;
}

interface BaseNodeProps {
  nodeProps: NodeProps;
  svgContent: React.ReactNode;
  width?: number;
  height?: number;
}

/**
 * Shared base component for all circuit node types.
 *
 * NODE SIZE: 40x40 (2×2 grid cells at 20px).
 * STATIC PINS: Handles are edge-aligned.
 * Only the SVG body rotates.
 */
function BaseNodeComponent({ nodeProps, svgContent, width: propsWidth, height: propsHeight }: BaseNodeProps) {
  const data = nodeProps.data as unknown as BaseNodeData;
  const meta = COMPONENT_MAP[data.componentType as keyof typeof COMPONENT_MAP];
  const width = propsWidth || meta?.width || 40;
  const height = propsHeight || meta?.height || 40;

  const activeTool = useCircuitStore(s => s.activeTool);
  const nearbyNodeIds = useCircuitStore(s => s.nearbyNodeIds);
  const selectedNodeId = useCircuitStore(s => s.selectedNodeId);
  const isNearbyInWireMode = activeTool === 'wire' && nearbyNodeIds.has(nodeProps.id);
  const deg = facingToDeg(data.facing || 'north');

  const cx = width / 2;
  const cy = height / 2;
  const rotatedPins = (meta?.pins || []).map(pin => {
    const dx = pin.x - cx;
    const dy = pin.y - cy;
    let rx = dx, ry = dy;

    switch (data.facing) {
      case 'east': rx = -dy; ry = dx; break;
      case 'south': rx = -dx; ry = -dy; break;
      case 'west': rx = dy; ry = -dx; break;
    }
    return { ...pin, x: cx + rx, y: cy + ry };
  });

  return (
    <div
      className="circuit-node"
      style={{ width: `${width}px`, height: `${height}px` }}
      data-selected={selectedNodeId === nodeProps.id ? 'true' : undefined}
      data-nearby={isNearbyInWireMode ? 'true' : undefined}
    >
      {/* SVG body — ONLY this rotates */}
      <div
        className="circuit-node-body"
        style={{ transform: `rotate(${deg}deg)`, width: `${width}px`, height: `${height}px` }}
        onDragStart={(e) => e.preventDefault()}
      >
        {svgContent}
      </div>

      {/* Pin dots overlay */}
      <div className="circuit-pins">
        {rotatedPins.map(pin => (
          <div
            key={pin.id}
            className="pin-marker"
            style={{ left: pin.x, top: pin.y }}
          >
            <div className="pin-dot" style={{ backgroundColor: meta?.color || '#38bdf8' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function formatValue(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
  if (v < 0.001) return `${(v * 1_000_000).toFixed(1)}µ`;
  if (v < 1) return `${(v * 1000).toFixed(1)}m`;
  return v.toString();
}

export default memo(BaseNodeComponent);
export { BaseNodeComponent, formatValue };
export type { BaseNodeData };
