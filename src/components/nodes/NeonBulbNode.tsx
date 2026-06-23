import { memo } from 'react';
import { type NodeProps } from '@xyflow/react';
import { BaseNodeComponent } from './BaseNode';

const NeonBulbNode = memo(({ ...props }: NodeProps) => (
    <BaseNodeComponent nodeProps={props} svgContent={
        <img style={{ imageRendering: 'pixelated', objectFit: 'contain', width: '100%', height: '100%' }} src="neon_bulb.png" alt="Neon Bulb" />
    } />
));
NeonBulbNode.displayName = 'NeonBulbNode';
export default NeonBulbNode;
