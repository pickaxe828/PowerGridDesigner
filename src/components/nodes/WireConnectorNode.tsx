import { memo } from 'react';
import { type NodeProps } from '@xyflow/react';
import { BaseNodeComponent } from './BaseNode';

const WireConnectorNode = memo(({ ...props }: NodeProps) => (
    <BaseNodeComponent nodeProps={props} width={40} height={40} svgContent={
        <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="60" height="60" fill="#0a0a0f00" />
            <circle cx="30" cy="30" r="24" stroke="#3b82f6" strokeWidth="2" />
            <circle cx="30" cy="30" r="6" fill="#3b82f6" />
        </svg>
    } />
));
WireConnectorNode.displayName = 'Wire Connector';
export default WireConnectorNode;
