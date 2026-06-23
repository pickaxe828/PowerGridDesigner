import { memo } from 'react';
import { type NodeProps } from '@xyflow/react';
import { BaseNodeComponent } from './BaseNode';

const ElectronTubeNode = memo(({ ...props }: NodeProps) => (
    <BaseNodeComponent nodeProps={props} svgContent={
        <img style={{ imageRendering: 'pixelated', objectFit: 'contain', width: '100%', height: '100%' }} src="electron_tube.png" alt="Electron Tube" />
    } />
));
ElectronTubeNode.displayName = 'Electron Tube';
export default ElectronTubeNode;
