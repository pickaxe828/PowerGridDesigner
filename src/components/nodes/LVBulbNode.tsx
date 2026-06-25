import { memo } from 'react';
import { type NodeProps } from '@xyflow/react';
import { BaseNodeComponent } from './BaseNode';

const LVBulbNode = memo(({ ...props }: NodeProps) => (
    <BaseNodeComponent nodeProps={props} svgContent={
        <img style={{ imageRendering: 'pixelated', objectFit: 'contain', width: '100%', height: '100%' }} src="lv_bulb.png" alt="LV Bulb" />
    } />
));
LVBulbNode.displayName = 'LVBulbNode';
export default LVBulbNode;
