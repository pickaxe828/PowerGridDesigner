import { memo } from 'react';
import { type NodeProps } from '@xyflow/react';
import { BaseNodeComponent } from './BaseNode';

const NpnBjtNode = memo(({ ...props }: NodeProps) => (
    <BaseNodeComponent nodeProps={props} svgContent={
        <img style={{ imageRendering: 'pixelated', objectFit: 'contain', width: '100%', height: '100%' }} src="bjt_npn.png" alt="NPN BJT" />
    } />
));
NpnBjtNode.displayName = 'NpnBjtNode';
export default NpnBjtNode;
