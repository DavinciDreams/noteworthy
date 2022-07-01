import cloneDeep from 'lodash.clonedeep';
import filter from 'lodash.filter';
import { v1 as uuid } from 'uuid';
import BaseNode from '../components/nodes/BaseNode';
import EndNode from '../components/nodes/EndNode';
import IfNode from '../components/nodes/IfNode';
import InformationNode from '../components/nodes/InformationNode';
import QuestionNode from '../components/nodes/QuestionNode';
import StartNode from '../components/nodes/StartNode';
import BaseEdgeData from '../types/BaseEdgeData';
import BaseNodeComponent from '../types/BaseNodeComponent'; // XXX Use v1 for uniqueness - See https://www.sohamkamani.com/blog/2016/10/05/uuid1-vs-uuid4/
import BaseNodeData from '../types/BaseNodeData';
import { BaseNodeDefaultProps } from '../types/BaseNodeDefaultProps';
import BasePortData from '../types/BasePortData';
import { CanvasDataset } from '../types/CanvasDataset';
import { NewCanvasDatasetMutation } from '../types/CanvasDatasetMutation';
import { GetBaseNodeDefaultProps } from '../types/GetBaseNodeDefaultProps';
import NodeType from '../types/NodeType';
import { createEdge } from './edges';
import {
  getDefaultFromPort,
  getDefaultToPort,
} from './ports';

export type AddNodeAndEdgeThroughPortsResult = {
  nodeMutation: NewCanvasDatasetMutation,
  edgeMutation: NewCanvasDatasetMutation | null
};

export type UpsertNodeThroughPortsResult = NewCanvasDatasetMutation[];

/**
 * Creates a new node and returns it.
 *
 * @param nodeData
 */
export const createNode = (nodeData?: Partial<BaseNodeData>): BaseNodeData => {
  let { id = uuid() } = nodeData || {};

  const newNode = {
    ...nodeData,
    id,
  };
  console.log('createNode newNode', newNode);

  return newNode;
};

/**
 * Creates a new node from the default props and returns it.
 *
 * @param defaultProps
 */
export const createNodeFromDefaultProps = (defaultProps: BaseNodeDefaultProps): BaseNodeData => {
  console.log('createNodeFromDefaultProps', defaultProps);
  const node = {
    text: undefined, // XXX Built-in Reaflow "text", unused in our case because we use complex components and we don't need it
    width: defaultProps.baseWidth,
    height: defaultProps.baseHeight,
    data: {
      type: defaultProps.type,
      baseWidth: defaultProps.baseWidth,
      baseHeight: defaultProps.baseHeight,
      dynHeights: {
        baseHeight: defaultProps.baseHeight,
      },
      dynWidths: {
        baseWidth: defaultProps.baseWidth,
      },
    },
    ports: defaultProps.ports || [],
  };

  return createNode(node);
};

/**
 * Clone an existing node.
 *
 * Keeps all properties, except for the id which is regenerated.
 *
 * @param node
 */
export const cloneNode = (node: BaseNodeData): BaseNodeData => {
  const newNode = cloneDeep(node);
  newNode.id = uuid(); // Force generating a new id for the cloned node

  // Generate new ids for ports (or it'll completely break ELK when it tries to link existing edges to ports)
  newNode?.ports?.map((port: BasePortData) => port.id = uuid());

  return {
    ...createNode(newNode),
  };
};

/**
 * Filter out a node from an array of nodes.
 *
 * @param nodes
 * @param nodeToFilter
 */
export const filterNodeInArray = (nodes: BaseNodeData[], nodeToFilter: BaseNodeData) => {
  return filter(nodes, (node: BaseNodeData) => {
    return node?.id !== nodeToFilter.id;
  });
};

/**
 * Returns the Node Component associated to a given node type.
 *
 * @param nodeType
 */
export const findNodeComponentByType = (nodeType: NodeType): BaseNodeComponent => {
  switch (nodeType) {
    case 'start':
      return StartNode;
    case 'information':
      return InformationNode;
    case 'question':
      // @ts-ignore
      return QuestionNode;
    case 'if':
      return IfNode;
    case 'end':
      return EndNode;
    default:
      throw new Error(`Couldn't find the Node Component to use, using "nodeType=${nodeType}"`);
  }
};

/**
 * Get default props from the Node component related to the nodeType.
 *
 * If the Node component doesn't expose "getDefaultNodeProps", fallbacks to the "getDefaultNodeProps" exposed in BaseNode component.
 *
 * @param nodeType
 */
export const getDefaultNodePropsWithFallback = (nodeType: NodeType): BaseNodeDefaultProps => {
  const NodeComponent = findNodeComponentByType(nodeType);

  if (typeof NodeComponent.getDefaultNodeProps !== 'undefined') {
    return NodeComponent.getDefaultNodeProps({ type: nodeType });
  } else {
    return (BaseNode.getDefaultNodeProps as GetBaseNodeDefaultProps)({ type: nodeType });
  }
};

/**
 * Detects whether a node is reachable.
 *
 * A node that isn't reachable doesn't have any edge coming through its WEST port (left).
 * Except for "start" node which is the entry point, and thus always reachable.
 *
 * @param node
 * @param edges
 */
export const isNodeReachable = (node: BaseNodeData, edges: BaseEdgeData[]) => {
  if (node?.data?.type === 'start') {
    return true;
  }

  const westPort: BasePortData | undefined = node?.ports?.find((port: BasePortData) => port?.side === 'WEST');

  return !!edges?.find((edge: BaseEdgeData) => edge?.toPort === westPort?.id);
};

/**
 * Add a node and optional edge, and automatically link their ports.
 *
 * Automatically connects the fromNode (left node) using its EAST port (right side) to the newNode (right node) using it's WEST port (left side).
 *
 * Similar to reaflow.addNodeAndEdge utility.
 */
export const addNodeAndEdgeThroughPorts = (
  nodes: BaseNodeData[],
  edges: BaseEdgeData[],
  newNode: BaseNodeData,
  fromNode?: BaseNodeData,
  toNode?: BaseNodeData,
  fromPort?: BasePortData,
  toPort?: BasePortData,
): AddNodeAndEdgeThroughPortsResult => {
  // The default destination node is the newly created node
  toNode = toNode || newNode;

  const newEdge: BaseEdgeData = createEdge(
    fromNode,
    toNode,
    getDefaultFromPort(fromNode, fromPort),
    getDefaultToPort(toNode, toPort),
  );

  const nodeMutation: NewCanvasDatasetMutation = {
    operationType: 'add',
    elementId: newNode?.id,
    elementType: 'node',
    changes: newNode,
  };

  let edgeMutation: NewCanvasDatasetMutation | null = null;
  if (fromNode) {
    edgeMutation = {
      operationType: 'add',
      elementId: newEdge?.id,
      elementType: 'edge',
      changes: newEdge,
    };
  }

  return {
    nodeMutation,
    edgeMutation,
  };
};

/**
 * Helper function for upserting a node in a edge (split the edge in 2 and put the node in between), and automatically link their ports.
 *
 * Automatically connects the left edge to the newNode using it's WEST port (left side).
 * Automatically connects the right edge to the newNode using it's EAST port (right side).
 *
 * Similar to reaflow.upsertNode utility.
 */
export const upsertNodeThroughPorts = (
  nodes: BaseNodeData[],
  edges: BaseEdgeData[],
  edge: BaseEdgeData,
  newNode: BaseNodeData,
): UpsertNodeThroughPortsResult => {
  const edgeBeforeNewNode = {
    ...edge,
    id: `${edge.from}-${newNode.id}`,
    to: newNode.id,
  };
  const edgeAfterNewNode = {
    ...edge,
    id: `${newNode.id}-${edge.to}`,
    from: newNode.id,
  };

  if (edge.fromPort && edge.toPort) {
    const fromLeftNodeToWestPort: BasePortData | undefined = newNode?.ports?.find((port: BasePortData) => port?.side === 'WEST');
    const fromRightNodeToEastPort: BasePortData | undefined = newNode?.ports?.find((port: BasePortData) => port?.side === 'EAST');

    edgeBeforeNewNode.fromPort = edge.fromPort;
    edgeBeforeNewNode.toPort = fromLeftNodeToWestPort?.id || `${newNode.id}-to`;

    edgeAfterNewNode.fromPort = fromRightNodeToEastPort?.id || `${newNode.id}-from`;
    edgeAfterNewNode.toPort = edge.toPort;
  }

  const nodeMutation: NewCanvasDatasetMutation = {
    operationType: 'add',
    elementId: newNode?.id,
    elementType: 'node',
    changes: newNode,
  };

  const edgeBeforeNewNodeMutation: NewCanvasDatasetMutation = {
    operationType: 'add',
    elementId: edgeBeforeNewNode?.id,
    elementType: 'edge',
    changes: edgeBeforeNewNode,
  };

  const edgeAfterNewNodeMutation: NewCanvasDatasetMutation = {
    operationType: 'add',
    elementId: edgeAfterNewNode?.id,
    elementType: 'edge',
    changes: edgeAfterNewNode,
  };

  const oldEdgeMutation: NewCanvasDatasetMutation = {
    operationType: 'delete',
    elementId: edge?.id,
    elementType: 'edge',
  };

  return [
    nodeMutation,
    edgeBeforeNewNodeMutation,
    edgeAfterNewNodeMutation,
    oldEdgeMutation,
  ]
};

/**
 * Removes a node between two edges and merges the two edges into one, and automatically link their ports.
 *
 * Similar to reaflow.removeAndUpsertNodes utility.
 *
 * TODO should return mutations too, but I'm lazy (and it's unlikely that it'll ever cause concurrent updates conflicts anyway)
 */
export const removeAndUpsertNodesThroughPorts = (
  nodes: BaseNodeData[],
  edges: BaseEdgeData[],
  removeNodes: BaseNodeData | BaseNodeData[],
  onNodeLinkCheck?: (
    newNodes: BaseNodeData[],
    newEdges: BaseEdgeData[],
    from: BaseNodeData,
    to: BaseNodeData,
    port?: BasePortData,
  ) => undefined | boolean,
): CanvasDataset => {
  if (!Array.isArray(removeNodes)) {
    removeNodes = [removeNodes];
  }

  const nodeIds = removeNodes.map((n) => n.id);
  const newNodes = nodes.filter((n) => !nodeIds.includes(n.id));
  const newEdges = edges.filter(
    (e: BaseEdgeData) => !nodeIds.includes(e?.from as string) && !nodeIds.includes(e?.to as string),
  );

  for (const nodeId of nodeIds) {
    const sourceEdges = edges.filter((e) => e.to === nodeId);
    const targetEdges = edges.filter((e) => e.from === nodeId);

    for (const sourceEdge of sourceEdges) {
      for (const targetEdge of targetEdges) {
        const sourceNode = nodes.find((n) => n.id === sourceEdge.from);
        const targetNode = nodes.find((n) => n.id === targetEdge.to);

        if (sourceNode && targetNode) {
          const canLink = onNodeLinkCheck?.(
            newNodes,
            newEdges,
            sourceNode,
            targetNode,
          );

          if (canLink === undefined || canLink) {
            const fromPort: BasePortData | undefined = sourceNode?.ports?.find((port: BasePortData) => port?.side === 'EAST');
            const toPort: BasePortData | undefined = targetNode?.ports?.find((port: BasePortData) => port?.side === 'WEST');

            newEdges.push({
              id: `${sourceNode.id}-${targetNode.id}`,
              from: sourceNode.id,
              to: targetNode.id,
              parent: sourceNode?.parent,
              fromPort: fromPort?.id,
              toPort: toPort?.id,
            });
          }
        }
      }
    }
  }

  return {
    edges: newEdges,
    nodes: newNodes,
  };
};
