import { css } from '@emotion/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import classnames from 'classnames';
import cloneDeep from 'lodash.clonedeep';
import now from 'lodash.now';
import React from 'react';
import {
  Edge,
  EdgeChildProps,
} from 'reaflow';
import {
  SetterOrUpdater,
  useRecoilState,
  useSetRecoilState,
} from 'recoil';
import { absoluteLabelEditorState } from '../../states/absoluteLabelEditorStateState';
import { blockPickerMenuSelector } from '../../states/blockPickerMenuState';
import { canvasDatasetSelector } from '../../states/canvasDatasetSelector';
import { edgesSelector } from '../../states/edgesState';
import { lastCreatedState } from '../../states/lastCreatedState';
import { selectedEdgesSelector } from '../../states/selectedEdgesState';
import { selectedNodesSelector } from '../../states/selectedNodesState';
import BaseEdgeData from '../../types/BaseEdgeData';
import BaseEdgeProps, { PatchCurrentEdge } from '../../types/BaseEdgeProps';
import BaseNodeData from '../../types/BaseNodeData';
import BasePortData from '../../types/BasePortData';
import BlockPickerMenu, { OnBlockClick } from '../../types/BlockPickerMenu';
import { NewCanvasDatasetMutation } from '../../types/CanvasDatasetMutation';
import { LastCreated } from '../../types/LastCreated';
import NodeType from '../../types/NodeType';
import { translateXYToCanvasPosition } from '../../utils/canvas';
import {
  createNodeFromDefaultProps,
  getDefaultNodePropsWithFallback,
  upsertNodeThroughPorts,
} from '../../utils/nodes';
import Label from './Label';

type Props = {} & BaseEdgeProps;

/**
 * Base edge component.
 *
 * This component contains shared business logic common to all edges.
 * It renders a Reaflow <Edge> component.
 *
 * The Edge renders itself as SVG <g> HTML element wrapper, which contains the <path> HTML element that displays the link itself.
 *
 * @see https://reaflow.dev/?path=/story/demos-edges
 */
const BaseEdge: React.FunctionComponent<Props> = (props) => {
  const {
    id,
    source: sourceNodeId,
    sourcePort: sourcePortId,
    target: targetNodeId,
    targetPort: targetPortId,
    queueCanvasDatasetMutation,
  } = props;
  // console.log('props', props)

  const [blockPickerMenu, setBlockPickerMenu] = useRecoilState<BlockPickerMenu>(blockPickerMenuSelector);
  const [canvasDataset, setCanvasDataset] = useRecoilState(canvasDatasetSelector);
  const [edges, setEdges] = useRecoilState(edgesSelector);
  const { nodes } = canvasDataset;
  const setLastCreatedNode: SetterOrUpdater<LastCreated | undefined> = useSetRecoilState(lastCreatedState);
  const { displayedFrom, isDisplayed } = blockPickerMenu;
  const edge: BaseEdgeData = edges.find((edge: BaseEdgeData) => edge?.id === id) as BaseEdgeData;
  const [selectedEdges, setSelectedEdges] = useRecoilState(selectedEdgesSelector);
  const [selectedNodes, setSelectedNodes] = useRecoilState(selectedNodesSelector);
  const setAbsoluteLabelEditor = useSetRecoilState(absoluteLabelEditorState);

  if (typeof edge === 'undefined') {
    return null;
  }

  // Resolve instances of connected nodes and ports
  const sourceNode: BaseNodeData | undefined = nodes.find((node: BaseNodeData) => node.id === sourceNodeId);
  const sourcePort: BasePortData | undefined = sourceNode?.ports?.find((port: BasePortData) => port.id === sourcePortId);
  const targetNode: BaseNodeData | undefined = nodes.find((node: BaseNodeData) => node.id === targetNodeId);
  const targetPort: BasePortData | undefined = targetNode?.ports?.find((port: BasePortData) => port.id === targetPortId);
  const isSelected = !!selectedEdges?.find((selectedEdge: string) => selectedEdge === edge.id);

  // console.log('edgeProps', props);

  /**
   * Invoked when clicking on the "+" of the edge.
   *
   * Displays the BlockPickerMenu, which can then be used to select which Block to add to the canvas.
   * If the BlockPickerMenu was already displayed, hides it if it was opened from the same edge.
   *
   * When a block is clicked, the "onBlockClick" function is invoked and creates (upserts) the node
   * by splitting the edge in two parts and adding the new node in between.
   *
   * @param event
   */
  const onAddIconClick = (event: React.MouseEvent<SVGGElement, MouseEvent>): void => {
    /**
     * Executed when clicking on a block.
     * Creates a new node corresponding to the selected block.
     *
     * @param nodeType
     */
    const onBlockClick: OnBlockClick = (nodeType: NodeType) => {
      console.groupCollapsed('Clicked on block from edge, upserting new node');
      const newNode: BaseNodeData = createNodeFromDefaultProps(getDefaultNodePropsWithFallback(nodeType));
      const mutations: NewCanvasDatasetMutation[] = upsertNodeThroughPorts(cloneDeep(nodes), cloneDeep(edges), edge, newNode);

      // Apply all mutations
      mutations.map((mutation) => queueCanvasDatasetMutation(mutation));

      setLastCreatedNode({ node: newNode, at: now() });
      setSelectedNodes([newNode?.id]);
      setSelectedEdges([]);
      console.groupEnd();
    };

    // Converts the x/y position to a Canvas position and apply some margin for the BlockPickerMenu to display on the right bottom of the cursor
    const [x, y] = translateXYToCanvasPosition(event.clientX, event.clientY, { left: 15, top: 15 });

    setBlockPickerMenu({
      displayedFrom: `edge-${edge.id}`,
      // Toggles on click if the source is the same, otherwise update
      isDisplayed: displayedFrom === `edge-${edge.id}` ? !isDisplayed : true,
      onBlockClick,
      eventTarget: event.target,
      top: y,
      left: x,
    });
  };

  /**
   * Invoked when clicking on the "-" of the edge.
   *
   * Removes the selected edge.
   *
   * @param event
   */
  const onRemoveIconClick = (event: React.MouseEvent<SVGGElement, MouseEvent>): void => {
    console.log('onRemoveIconClick', event, edge);
    const mutation: NewCanvasDatasetMutation = {
      operationType: 'delete',
      elementId: edge?.id,
      elementType: 'edge',
    };

    console.log('Adding edge patch to the queue', 'mutation:', mutation);
    queueCanvasDatasetMutation(mutation);
  };

  /**
   * Selects the edge when clicking on it.
   *
   * XXX We're resolving the "edge" ourselves, instead of relying on the 2nd argument (edgeData),
   *  which doesn't contain all the expected properties. It is more reliable to use the current edge, which already known.
   *
   * @param event
   * @param data_DO_NOT_USE
   */
  const onEdgeClick = (event: React.MouseEvent<SVGGElement, MouseEvent>, data_DO_NOT_USE: BaseEdgeData) => {
    console.log('onEdgeClick', event, edge);
    setSelectedEdges([edge.id]);
  };

  /**
   * Patches the properties of the current edge.
   *
   * Only updates the provided properties, doesn't update other properties.
   * Will use deep merge of properties.
   *
   * @param patch
   * @param stateUpdateDelay
   */
  const patchCurrentEdge: PatchCurrentEdge = (patch: Partial<BaseEdgeData>, stateUpdateDelay = 0): void => {
    const mutation: NewCanvasDatasetMutation = {
      operationType: 'patch',
      elementId: edge?.id,
      elementType: 'edge',
      changes: patch,
    };

    console.log('Adding edge patch to the queue', 'patch:', patch, 'mutation:', mutation);
    queueCanvasDatasetMutation(mutation, stateUpdateDelay);
  };

  return (
    <Edge
      {...props}
      label={<Label />}
      className={classnames(`edge-svg-graph`, { 'is-selected': isSelected })}
      onClick={onEdgeClick}
    >
      {
        (edgeChildProps: EdgeChildProps) => {
          const {
            center,
          } = edgeChildProps;

          // Improve centering (because we have 3 icons), and position the foreignObject children above the line
          const x = (center?.x || 0) - 25;
          const y = (center?.y || 0) - 25;

          /**
           * Triggered when the label has been modified.
           *
           * @param value
           */
          const onLabelSubmit = (value: string) => {
            console.log('value', value);

            patchCurrentEdge({
              text: value || ' ', // Use a space as default, to increase the distance between nodes, which ease edge's selection
            });
          };

          const onStartLabelEditing = (event: React.MouseEvent<SVGGElement, MouseEvent>) => {
            setAbsoluteLabelEditor({
              x: window.innerWidth / 2,
              y: 0,
              defaultValue: edge?.text,
              onSubmit: onLabelSubmit,
              isDisplayed: true,
            });
          };

          return (
            <foreignObject
              id={`edge-foreignObject-${edge.id}`}
              className={classnames(`edge-container`, {
                'is-selected': isSelected,
              })}
              width={100} // Content width will be limited by the width of the foreignObject
              height={60}
              x={x}
              y={y}
              css={css`
                position: relative;
                color: black;
                z-index: 1;

                // Disabling pointer-events on top-level container, because the foreignObject is displayed on top (above) the edge line itself and blocks selection
                pointer-events: none;

                .edge {
                  // XXX Elements within a <foreignObject> that are using the CSS "position" attribute won't be shown properly, 
                  //  unless they're wrapped into a container using a "fixed" position.
                  //  Solves the display of React Select element.
                  // See https://github.com/chakra-ui/chakra-ui/issues/3288#issuecomment-776316200
                  position: fixed;

                  // Enable pointer events for elements within the edge
                  pointer-events: auto;
                }

                .svg-inline--fa {
                  cursor: pointer;
                  margin: 4px;
                }
              `}
            >
              {
                isSelected && (
                  <div className={'edge'}>
                    <FontAwesomeIcon
                      color={'#0028FF'}
                      icon={['fas', 'plus-circle']}
                      onClick={onAddIconClick}
                    />

                    <FontAwesomeIcon
                      color={'#F9694A'}
                      icon={['fas', 'times-circle']}
                      onClick={onRemoveIconClick}
                    />

                    <FontAwesomeIcon
                      icon={['fas', 'edit']}
                      onClick={onStartLabelEditing}
                    />
                  </div>
                )
              }
            </foreignObject>
          );
        }
      }
    </Edge>
  );
};

export default BaseEdge;
