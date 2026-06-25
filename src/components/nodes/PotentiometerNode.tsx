import { memo } from 'react';
import { type NodeProps } from '@xyflow/react';
import { BaseNodeComponent } from './BaseNode';

const PotentiometerNode = memo(({ ...props }: NodeProps) => (
    <BaseNodeComponent nodeProps={props} svgContent={
        <img style={{ imageRendering: 'pixelated', objectFit: 'contain', width: '100%', height: '100%' }} src="potentiometer.png" alt="Potentiometer" />
    } />
));
PotentiometerNode.displayName = 'PotentiometerNode';
export default PotentiometerNode;
