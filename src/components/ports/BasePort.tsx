import classnames from 'classnames';
import cloneDeep from 'lodash.clonedeep';
import now from 'lodash.now';
import React from 'react';
import {
  Port,
  PortChildProps,
  PortSide,
} from 'reaflow';
import {
  DragEvent,
  Position,
} from 'reaflow/dist/utils/useNodeDrag';
import {
  SetterOrUpdater,
  useRecoilState,
  useSetRecoilState,
} from 'recoil';
import settings from '../../settings';
import { blockPickerMenuSelector } from '../../states/blockPickerMenuState';
import { canvasDatasetSelector } from '../../states/canvasDatasetSelector';
import { draggedEdgeFromPortState } from '../../states/draggedEdgeFromPortState';
import { edgesSelector } from '../../states/edgesState';
import { lastCreatedState } from '../../states/lastCreatedState';
import { selectedEdgesSelector } from '../../states/selectedEdgesState';
import { selectedNodesSelector } from '../../states/selectedNodesState';
import BaseEdgeData from '../../types/BaseEdgeData';
import BaseNodeData from '../../types/BaseNodeData';
import BasePortChildProps from '../../types/BasePortChildProps';
import BasePortData from '../../types/BasePortData';
import BasePortProps from '../../types/BasePortProps';
import BlockPickerMenu, { OnBlockClick } from '../../types/BlockPickerMenu';
import { CanvasDataset } from '../../types/CanvasDataset';
import { NewCanvasDatasetMutation } from '../../types/CanvasDatasetMutation';
import { LastCreated } from '../../types/LastCreated';
import NodeType from '../../types/NodeType';
import { translateXYToCanvasPosition } from '../../utils/canvas';
import { createEdge } from '../../utils/edges';
import {
  addNodeAndEdgeThroughPorts,
  AddNodeAndEdgeThroughPortsResult,
  createNodeFromDefaultProps,
  getDefaultNodePropsWithFallback,
} from '../../utils/nodes';
import {
  canConnectToDestinationPort,
  getDefaultToPort,
} from '../../utils/ports';

type Props = BasePortProps;

/**
 * Base port component.
 *
 * This component contains shared business logic common to all ports.
 * It renders a Reaflow <Port> component.
 *
 * The Port is rendered as SVG <g> HTML element wrapper, which contains the <rect> HTML element that displays the port itself.
 *
 * @see https://reaflow.dev/?path=/story/demos-ports
 */
const BasePort: React.FunctionComponent<Props> = (props) => {
  const {
    id,
    properties,
    fromNodeId,
    additionalPortChildProps,
    PortChildComponent,
    onDragStart: onDragStartInternal,
    onDragEnd: onDragEndInternal,
    queueCanvasDatasetMutation,
  } = props;

  const [blockPickerMenu, setBlockPickerMenu] = useRecoilState(blockPickerMenuSelector);
  const [canvasDataset, setCanvasDataset] = useRecoilState(canvasDatasetSelector);
  const [edges, setEdges] = useRecoilState(edgesSelector);
  const { nodes } = canvasDataset;
  const [draggedEdgeFromPort, setDraggedEdgeFromPort] = useRecoilState(draggedEdgeFromPortState);
  const setLastCreatedNode: SetterOrUpdater<LastCreated | undefined> = useSetRecoilState(lastCreatedState);
  const node: BaseNodeData = nodes.find((node: BaseNodeData) => node.id === fromNodeId) as BaseNodeData;
  const port: BasePortData = node?.ports?.find((port: BasePortData) => port.id === id) as BasePortData;
  const { displayedFrom, isDisplayed } = blockPickerMenu;
  const [selectedNodes, setSelectedNodes] = useRecoilState(selectedNodesSelector);
  const [selectedEdges, setSelectedEdges] = useRecoilState(selectedEdgesSelector);

  // Highlight the current port if there is an edge being dragged from another port and if it can connect to the current port
  const isHighlighted = canConnectToDestinationPort(edges, draggedEdgeFromPort?.fromNode, draggedEdgeFromPort?.fromPort, node, port);

  const style = {
    fill: 'white',
    stroke: 'white',
  };

  /**
   * Creates a node based on the block that's been clicked within the BlockPickerMenu.
   *
   * Automatically creates the edge between the source node and the newly created node, and connects them through their ports.
   *
   * @param nodeType
   * @param blockPickerMenu
   */
  const onBlockClick: OnBlockClick = (nodeType: NodeType, blockPickerMenu: BlockPickerMenu | undefined) => {
    console.groupCollapsed('Clicked on block from port, creating new node');
    console.log('onBlockClick (from port)', nodeType, draggedEdgeFromPort, blockPickerMenu);
    const newNode = createNodeFromDefaultProps(getDefaultNodePropsWithFallback(nodeType));
    let newDataset: CanvasDataset;
    let createNodeOnSide: PortSide | undefined;
    let result;

    if (typeof draggedEdgeFromPort === 'undefined') {
      console.log(`typeof draggedEdgeFromPort === 'undefined'`);
      // It was a click on a port which opened the BlockPickerMenu, not a drag from a port
      if (blockPickerMenu?.fromPort?.side) {
        createNodeOnSide = blockPickerMenu?.fromPort?.side;
      }

    } else {
      console.log(`typeof draggedEdgeFromPort !== 'undefined'`);
      // It was a drag from a port which opened the BlockPickerMenu, not a click on a port
      if (draggedEdgeFromPort?.fromPort?.side) {
        createNodeOnSide = draggedEdgeFromPort?.fromPort?.side;
      }
    }

    console.log('createNodeOnSide', createNodeOnSide);
    if (createNodeOnSide === 'EAST') {
      // The drag started from an EAST port, so we must add the new node on the right of existing node
      // The from port is either the port where the node was dragged from, or the port that was clicked on
      const fromPort: BasePortData = (draggedEdgeFromPort?.fromPort || blockPickerMenu?.fromPort) as BasePortData;

      result = addNodeAndEdgeThroughPorts(cloneDeep(nodes), cloneDeep(edges), newNode, node, newNode, fromPort);
    } else {
      // The drag started from a WEST port, so we must add the new node on the left of the existing node
      const fromPort: BasePortData = newNode?.ports?.find((port: BasePortData) => port?.side === 'EAST') as BasePortData;
      const toPort: BasePortData = draggedEdgeFromPort?.fromPort as BasePortData;

      result = addNodeAndEdgeThroughPorts(cloneDeep(nodes), cloneDeep(edges), newNode, newNode, node, fromPort, toPort);
    }
    console.log('addNodeAndEdge fromNode:', newNode, 'toNode:', node, 'result:', result);
    const { nodeMutation, edgeMutation }: AddNodeAndEdgeThroughPortsResult = result;

    console.log('Adding node/edge mutations to the queue', 'node:', nodeMutation, 'edge:', edgeMutation);
    queueCanvasDatasetMutation(nodeMutation);

    // edgeMutation can be null
    if (edgeMutation) {
      queueCanvasDatasetMutation(edgeMutation);
    }

    setLastCreatedNode({ node: newNode, at: now() });
    setSelectedNodes([newNode?.id]);
    setSelectedEdges([]);
    console.groupEnd();
  };

  /**
   * Invoked when clicking on a port.
   *
   * Displays the BlockPickerMenu, which can then be used to select which Block to add to the canvas.
   * If the BlockPickerMenu was already displayed by clicking on the same port, then hides it instead.
   *
   * @param event
   * @param port
   */
  const onPortClick = (event: React.MouseEvent<SVGGElement, MouseEvent>, port: BasePortData) => {
    const [x, y] = translateXYToCanvasPosition(event?.clientX, event.clientY, { top: 60, left: 15 });

    console.log('onPortClick', port);
    setBlockPickerMenu({
      displayedFrom: `port-${port.id}`,
      isDisplayed: displayedFrom === `port-${port.id}` ? !isDisplayed : true,
      onBlockClick,
      // Depending on the position of the canvas, you might need to deduce from x/y some delta
      left: x,
      top: y - settings.layout.nav.height,
      eventTarget: event.target,
      fromPort: port,
    });
  };

  /**
   * Invoked when a port is has started being dragged.
   *
   * Stores the dragged edge in the shared state, to allow other components to know which edge is being dragged.
   *
   * @param event
   * @param fromPosition
   * @param fromPort
   * @param extra
   */
  const onPortDragStart = (event: DragEvent, fromPosition: Position, fromPort: BasePortData, extra: any) => {
    console.log('onDragStart port: ', node, event, fromPosition, fromPort, extra);

    if (typeof onDragStartInternal === 'function') {
      // Runs internal onDragStart (built-in from Reaflow) which does stuff I'm not aware about
      onDragStartInternal(event, fromPosition, fromPort, extra);
    }

    setDraggedEdgeFromPort({
      fromNode: node,
      fromPort: fromPort,
      fromPosition: fromPosition,
    });
  };

  /**
   * Invoked when a port is has been dropped.
   *
   * Displays the BlockPickerMenu at the drop location, which can then be used to select which Block to add to the canvas.
   * Also runs the Reaflow own "onDragEndInternal", which is necessary to avoid leaving ghost edges connected to nothing.
   *
   * @param dragEvent
   * @param initial
   * @param fromPort
   * @param extra
   */
  const onPortDragEnd = (dragEvent: DragEvent, initial: Position, fromPort: BasePortData, extra: any) => {
    console.log('onDragEnd port: ', node, dragEvent, dragEvent.event, initial, fromPort, extra);
    const { xy, distance, event } = dragEvent;
    const target = event?.target as Element;

    // Look up in the DOM to find the closest <foreignObject> element that contains the node's id
    const foreignObject: Element | null | undefined = target?.closest?.('g')?.previousElementSibling;
    const foreignObjectId: string | undefined = foreignObject?.id;
    const toNodeId: string | undefined = foreignObjectId?.replace('node-foreignObject-', '');
    console.log('closest foreignObject:', foreignObject, 'toNodeId:', toNodeId);

    if (toNodeId) {
      // The edge has been dropped into a port
      console.log('found closest node id', toNodeId);
      const {
        fromNode,
      } = draggedEdgeFromPort || {};
      const toNode: BaseNodeData | undefined = nodes.find((node: BaseEdgeData) => node.id === toNodeId);
      const toPort: BasePortData = getDefaultToPort(toNode) as BasePortData;

      if (canConnectToDestinationPort(edges, fromNode, fromPort, toNode, toPort)) {
        const newEdge: BaseEdgeData = createEdge(fromNode, toNode, fromPort, toPort);

        console.log('Linking existing nodes through new edge', newEdge);
        const mutation: NewCanvasDatasetMutation = {
          operationType: 'add',
          elementId: newEdge?.id,
          elementType: 'edge',
          changes: newEdge,
        };

        console.log('Adding edge patch to the queue', 'mutation:', mutation);
        queueCanvasDatasetMutation(mutation);
      } else {
        console.error(`You cannot connect the link to that port.`);
        alert(`You cannot connect the link to that port.`);
      }

      // Hides the block picker menu (it might have been opened before)
      setBlockPickerMenu({
        isDisplayed: false,
      });
    } else {
      // The edge hasn't been dropped into a port (canvas, etc.) - Doesn't matter, we display the block picker menu
      // Converts the x/y position to a Canvas position and apply some margin for the BlockPickerMenu to display on the right bottom of the cursor
      const [x, y] = translateXYToCanvasPosition(...xy, { top: 60, left: 10 });

      // Opens the block picker menu below the clicked element
      setBlockPickerMenu({
        displayedFrom: `port-${fromPort.id}`,
        isDisplayed: true, // Toggle on click XXX change later, should toggle but not easy to test when toggle is on
        onBlockClick,
        // Depending on the position of the canvas, you might need to deduce from x/y some delta
        left: x,
        top: y - settings.layout.nav.height,
        eventTarget: target,
      });
    }

    if (typeof onDragEndInternal === 'function') {
      // Runs internal onDragEnd (built-in from Reaflow) which removes the edge if it doesn't connect to anything
      onDragEndInternal(dragEvent, initial, fromPort, extra);
    }

    // Reset the edge being dragged
    setDraggedEdgeFromPort(undefined);
  };

  /**
   * Invoked when the mouse is enters a port (hover starts).
   *
   * @param event
   * @param port
   */
  const onPortEnter = (event: React.MouseEvent<SVGGElement, MouseEvent>, port: BasePortData) => {
    // console.log('onPortEnter', event.target)
  };

  /**
   * Invoked when the mouse is leaves a port (hover stops).
   *
   * @param event
   * @param port
   */
  const onPortLeave = (event: React.MouseEvent<SVGGElement, MouseEvent>, port: BasePortData) => {
    // console.log('onPortLeave', event.target)
  };

  return (
    <Port
      {...props}
      className={classnames(id, 'port', {
        'is-highlighted': isHighlighted,
      })}
      onClick={onPortClick}
      onDragStart={onPortDragStart}
      onDragEnd={onPortDragEnd}
      onEnter={onPortEnter}
      onLeave={onPortLeave}
      style={style}
      rx={settings.canvas.ports.radius}
      ry={settings.canvas.ports.radius}
    >
      {
        (portChildProps: PortChildProps) => {
          const basePortChildProps: BasePortChildProps = {
            ...portChildProps,
            ...additionalPortChildProps,
          };

          return <PortChildComponent
            {...basePortChildProps}
          />;
        }
      }
    </Port>
  );
};

export default BasePort;
