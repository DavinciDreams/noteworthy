import { css } from '@emotion/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React, { Fragment } from 'react';
import settings from '../../settings';
import BaseNodeComponent from '../../types/BaseNodeComponent';
import { BaseNodeDefaultProps } from '../../types/BaseNodeDefaultProps';
import BaseNodeProps from '../../types/BaseNodeProps';
import BasePortData from '../../types/BasePortData';
import { SpecializedNodeProps } from '../../types/nodes/SpecializedNodeProps';
import { StartNodeData } from '../../types/nodes/StartNodeData';
import NodeType from '../../types/NodeType';
import { createPort } from '../../utils/ports';
import BaseNode from './BaseNode';

type Props = {} & BaseNodeProps<StartNodeData>;

const nodeType: NodeType = 'start';
const baseWidth = 100;
const baseHeight = 100;

/**
 * Start node.
 *
 * Used to define the workflow's entry point.
 * Is unique, there can be only one StartNode, and it's required and must always be present.
 *
 * Displays a start icon.
 * Has only one east port.
 */
const StartNode: BaseNodeComponent<Props> = (props) => {
  return (
    <BaseNode
      hasCloneAction={false}
      hasDeleteAction={false}
      baseWidth={baseWidth}
      baseHeight={baseHeight}
      {...props}
    >
      {
        (nodeProps: SpecializedNodeProps<StartNodeData>) => {
          return (
            <Fragment>
              <div
                className={`node-content ${nodeType}-content`}
                css={css`
                  svg {
                    margin: 20px;
                    color: #2EC52B;
                  }
                `}
              >
                <FontAwesomeIcon
                  icon={['fas', 'play']}
                  size={'2x'}
                />
              </div>
            </Fragment>
          );
        }
      }
    </BaseNode>
  );
};

StartNode.getDefaultPorts = (): BasePortData[] => {
  return [
    createPort({
      height: settings.canvas.ports.radius,
      width: settings.canvas.ports.radius,
      alignment: 'CENTER',
      side: 'EAST',
    }),
  ];
};

StartNode.getDefaultNodeProps = (): BaseNodeDefaultProps => {
  return {
    type: nodeType,
    baseWidth: baseWidth,
    baseHeight: baseHeight,
    // @ts-ignore
    ports: StartNode.getDefaultPorts(),
  };
};

export default StartNode;
