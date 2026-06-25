import { memo } from 'react';
import { type NodeProps } from '@xyflow/react';
import { BaseNodeComponent } from './BaseNode';

const RegulatorTubeNode = memo(({ ...props }: NodeProps) => (
    <BaseNodeComponent nodeProps={props} svgContent={
        <img style={{ imageRendering: 'pixelated', objectFit: 'contain', width: '100%', height: '100%' }} src="regulator_tube.png" alt="Regulator Tube" />
    } />
));
RegulatorTubeNode.displayName = 'RegulatorTubeNode';
export default RegulatorTubeNode;
