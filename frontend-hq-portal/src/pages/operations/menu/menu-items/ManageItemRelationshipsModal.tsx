import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, FC } from 'react';
import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Group,
  Modal,
  Paper,
  SegmentedControl,
  Select,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconAlertCircle,
  IconArrowDown,
  IconArrowUp,
  IconArrowsMaximize,
  IconArrowsMinimize,
  IconAdjustments,
  IconChevronRight,
  IconGripVertical,
  IconPlus,
  IconRefresh,
  IconWand,
  IconTrash,
} from '@tabler/icons-react';
import ReactFlow, {
  Background,
  Controls,
  Handle,
  Position,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
  type NodeProps,
  type ReactFlowInstance,
} from 'reactflow';
import dagre from '@dagrejs/dagre';
import 'reactflow/dist/style.css';
import type { ModifierGroupHeader, ModifierGroupPreviewItem } from '../../../../types/modifierGroup';
import {
  type ItemModifierMappingUpsert,
  type ItemRelationshipContext,
  type ItemRelationshipItemSet,
  type ItemRelationshipModifier,
  type ItemRelationshipNode,
  type ItemRelationshipTree,
  type MenuItemSummary,
  type UpdateItemRelationshipTreePayload,
} from '../../../../types/menuItem';
import menuItemService from '../../../../services/menuItemService';
import { CenterLoader } from '../../../../components/CenterLoader';
import { NodePropertiesDrawer, type NodePropertiesDrawerState } from './NodePropertiesDrawer';

const MODE_NEW_MODIFIER = 'NEW_MODIFIER_MODE';
const CONTEXT_OPTIONS: Array<{ value: 'inStore' | 'online'; label: string }> = [
  { value: 'inStore', label: 'In-store POS' },
  { value: 'online', label: 'Online ordering' },
];

const REACT_FLOW_NODE_WIDTH = 230;
const REACT_FLOW_NODE_HEIGHT = 130;
const ITEM_SET_EDGE_STYLE = { stroke: '#12b886', strokeWidth: 3 } as const;
const MODIFIER_EDGE_STYLE = { stroke: '#845ef7', strokeWidth: 3 } as const;

type FlowNodeKind = 'item' | 'modifier' | 'set';

interface FlowNodeData {
  kind: FlowNodeKind;
  context: 'inStore' | 'online';
  itemNode?: ItemRelationshipNode;
  modifier?: ItemRelationshipModifier;
  itemSet?: ItemRelationshipItemSet;
  parentItemId?: number;
  onAddModifier?: (
    itemId: number,
    context: 'inStore' | 'online',
    insertAfterGroupHeaderId?: number | null,
  ) => void;
  onAddItemSet?: (
    itemId: number,
    context: 'inStore' | 'online',
    insertAfterGroupHeaderId?: number | null,
  ) => void;
  onRemoveModifier?: (itemId: number, groupHeaderId: number, context: 'inStore' | 'online') => void;
  onMoveModifier?: (
    itemId: number,
    groupHeaderId: number,
    context: 'inStore' | 'online',
    direction: -1 | 1,
  ) => void;
  onRemoveItemSet?: (itemId: number, groupHeaderId: number, context: 'inStore' | 'online') => void;
  onMoveItemSet?: (
    itemId: number,
    groupHeaderId: number,
    context: 'inStore' | 'online',
    direction: -1 | 1,
  ) => void;
  disabled?: boolean;
  onOpenProperties?: (state: NodePropertiesDrawerState) => void;
}

interface ManageItemRelationshipsModalProps {
  opened: boolean;
  onClose: () => void;
  brandId: number | null;
  item: MenuItemSummary | null;
  modifierGroups: ModifierGroupHeader[] | null;
  onSaved: (hasModifier: boolean) => void;
}

interface GroupSelectionState {
  mode: 'modifier' | 'set';
  context: 'inStore' | 'online';
  itemId: number;
  insertAfterGroupHeaderId: number | null;
}

interface PendingFocusRequest {
  kind: 'modifier' | 'item-set';
  itemId: number;
  groupHeaderId: number;
  context: 'inStore' | 'online';
}

type PendingViewportAction = 'fit-view' | 'center-root';

const cloneModifier = (modifier: ItemRelationshipModifier): ItemRelationshipModifier => ({
  ...modifier,
  group: { ...modifier.group },
});

const cloneItemSet = (itemSet: ItemRelationshipItemSet): ItemRelationshipItemSet => ({
  ...itemSet,
  group: { ...itemSet.group },
  children: itemSet.children.map(cloneItemNode),
});

const cloneContext = (context: ItemRelationshipContext): ItemRelationshipContext => ({
  modifiers: context.modifiers.map(cloneModifier),
  itemSets: context.itemSets.map(cloneItemSet),
});

function cloneItemNode(node: ItemRelationshipNode): ItemRelationshipNode {
  return {
    item: { ...node.item },
    inStore: cloneContext(node.inStore),
    online: cloneContext(node.online),
  };
}

function resyncModifierSequences(context: ItemRelationshipContext) {
  context.modifiers.forEach((modifier, index) => {
    modifier.sequence = index + 1;
  });
}

function resyncItemSetSequences(context: ItemRelationshipContext) {
  context.itemSets.forEach((itemSet, index) => {
    itemSet.sequence = index + 1;
  });
}

function buildUpdatePayload(root: ItemRelationshipNode): UpdateItemRelationshipTreePayload {
  const toPayload = (node: ItemRelationshipNode): UpdateItemRelationshipTreePayload['root'] => ({
    itemId: node.item.itemId,
    inStore: {
      modifiers: node.inStore.modifiers.map<ItemModifierMappingUpsert>((modifier, index) => ({
        groupHeaderId: modifier.groupHeaderId,
        sequence: modifier.sequence ?? index + 1,
      })),
      itemSets: node.inStore.itemSets.map((itemSet, index) => ({
        itemSetId: itemSet.itemSetId ?? null,
        groupHeaderId: itemSet.groupHeaderId,
        sequence: itemSet.sequence ?? index + 1,
        children: itemSet.children.map(toPayload),
      })),
    },
    online: {
      modifiers: node.online.modifiers.map<ItemModifierMappingUpsert>((modifier, index) => ({
        groupHeaderId: modifier.groupHeaderId,
        sequence: modifier.sequence ?? index + 1,
      })),
      itemSets: node.online.itemSets.map((itemSet, index) => ({
        itemSetId: itemSet.itemSetId ?? null,
        groupHeaderId: itemSet.groupHeaderId,
        sequence: itemSet.sequence ?? index + 1,
        children: itemSet.children.map(toPayload),
      })),
    },
  });

  return { root: toPayload(root) };
}

function getHasModifierFlag(node: ItemRelationshipNode): boolean {
  if (node.inStore.modifiers.length > 0 || node.online.modifiers.length > 0) {
    return true;
  }

  return node.inStore.itemSets.some((set) => set.children.some(getHasModifierFlag)) ||
    node.online.itemSets.some((set) => set.children.some(getHasModifierFlag));
}

const ITEM_SET_CHILD_GAP = 32;
const ITEM_SET_HORIZONTAL_OFFSET = 40;
const ITEM_SET_HORIZONTAL_GAP = 60;

type ChildEdgeLink = { targetId: string; edge: Edge };

function shiftSubtree(
  nodeId: string,
  deltaX: number,
  deltaY: number,
  nodeMap: Map<string, Node<FlowNodeData>>,
  childMap: Map<string, string[]>,
  visited: Set<string>,
) {
  if (visited.has(nodeId)) {
    return;
  }
  visited.add(nodeId);

  const node = nodeMap.get(nodeId);
  if (node) {
    node.position = {
      x: node.position.x + deltaX,
      y: node.position.y + deltaY,
    };
  }

  const children = childMap.get(nodeId);
  if (!children) {
    return;
  }

  children.forEach((childId) => {
    shiftSubtree(childId, deltaX, deltaY, nodeMap, childMap, visited);
  });
}

function getSubtreeBounds(
  nodeId: string,
  nodeMap: Map<string, Node<FlowNodeData>>,
  childMap: Map<string, string[]>,
  childEdgesMap: Map<string, ChildEdgeLink[]>,
  visited: Set<string>,
  options: { excludeItemSetChains?: boolean } = {},
): { minX: number; maxX: number } {
  if (visited.has(nodeId)) {
    return { minX: Number.POSITIVE_INFINITY, maxX: Number.NEGATIVE_INFINITY };
  }

  visited.add(nodeId);
  const node = nodeMap.get(nodeId);
  if (!node) {
    return { minX: Number.POSITIVE_INFINITY, maxX: Number.NEGATIVE_INFINITY };
  }

  let minX = node.position.x;
  let maxX = node.position.x + REACT_FLOW_NODE_WIDTH;

  const childEdges = childEdgesMap.get(nodeId);
  if (childEdges && childEdges.length > 0) {
    childEdges.forEach(({ targetId, edge }) => {
      if (
        options.excludeItemSetChains &&
        (edge.sourceHandle === 'item-set-chain' ||
          edge.sourceHandle === 'item-sets' ||
          (edge.data && typeof edge.data === 'object' && (edge.data as { kind?: string }).kind === 'item-set'))
      ) {
        return;
      }

      const bounds = getSubtreeBounds(targetId, nodeMap, childMap, childEdgesMap, visited, options);
      minX = Math.min(minX, bounds.minX);
      maxX = Math.max(maxX, bounds.maxX);
    });
  } else {
    const children = childMap.get(nodeId);
    if (children) {
      children.forEach((childId) => {
        const bounds = getSubtreeBounds(childId, nodeMap, childMap, childEdgesMap, visited, options);
        minX = Math.min(minX, bounds.minX);
        maxX = Math.max(maxX, bounds.maxX);
      });
    }
  }

  return { minX, maxX };
}

function alignItemSetChildren(
  setNodeId: string,
  nodeMap: Map<string, Node<FlowNodeData>>,
  childMap: Map<string, string[]>,
  childEdgesMap: Map<string, ChildEdgeLink[]>,
) {
  const parentNode = nodeMap.get(setNodeId);
  if (!parentNode) {
    return;
  }

  const childEntries = childEdgesMap
    .get(setNodeId)
    ?.filter((entry) => entry.edge.sourceHandle === 'item-set-children');

  if (!childEntries || childEntries.length === 0) {
    return;
  }

  const adjustedBounds: Array<{ id: string; minX: number; maxX: number }> = [];
  let cursor = Number.NEGATIVE_INFINITY;

  childEntries.forEach((entry) => {
    let bounds = getSubtreeBounds(entry.targetId, nodeMap, childMap, childEdgesMap, new Set());
    if (!Number.isFinite(bounds.minX) || !Number.isFinite(bounds.maxX)) {
      adjustedBounds.push({ id: entry.targetId, minX: bounds.minX, maxX: bounds.maxX });
      return;
    }

    if (cursor !== Number.NEGATIVE_INFINITY) {
      const desiredMin = cursor + ITEM_SET_CHILD_GAP;
      if (bounds.minX < desiredMin) {
        const delta = desiredMin - bounds.minX;
        shiftSubtree(entry.targetId, delta, 0, nodeMap, childMap, new Set());
        bounds = getSubtreeBounds(entry.targetId, nodeMap, childMap, childEdgesMap, new Set());
      }
    }

    adjustedBounds.push({ id: entry.targetId, minX: bounds.minX, maxX: bounds.maxX });
    cursor = bounds.maxX;
  });

  const validBounds = adjustedBounds.filter(
    (bounds) => Number.isFinite(bounds.minX) && Number.isFinite(bounds.maxX),
  );
  if (validBounds.length === 0) {
    return;
  }

  const groupMin = validBounds.reduce((acc, bounds) => Math.min(acc, bounds.minX), Number.POSITIVE_INFINITY);
  const groupMax = validBounds.reduce((acc, bounds) => Math.max(acc, bounds.maxX), Number.NEGATIVE_INFINITY);
  const groupCenter = (groupMin + groupMax) / 2;
  const parentCenter = parentNode.position.x + REACT_FLOW_NODE_WIDTH / 2;
  const shift = parentCenter - groupCenter;

  if (Math.abs(shift) > 0.5) {
    childEntries.forEach((entry) => {
      shiftSubtree(entry.targetId, shift, 0, nodeMap, childMap, new Set());
    });
  }
}

function layoutItemSetSubtrees(
  nodeId: string,
  nodeMap: Map<string, Node<FlowNodeData>>,
  childMap: Map<string, string[]>,
  childEdgesMap: Map<string, ChildEdgeLink[]>,
  visited: Set<string>,
) {
  if (visited.has(nodeId)) {
    return;
  }
  visited.add(nodeId);

  const childEdges = childEdgesMap.get(nodeId);
  if (!childEdges || childEdges.length === 0) {
    return;
  }

  childEdges
    .filter(
      ({ edge }) =>
        (edge.data && typeof edge.data === 'object' && (edge.data as { kind?: string }).kind === 'item-set') ||
        edge.sourceHandle === 'item-set-chain' ||
        edge.sourceHandle === 'item-sets',
    )
    .forEach(({ targetId }) => {
      layoutItemSetSubtrees(targetId, nodeMap, childMap, childEdgesMap, visited);
    });

  childEdges
    .filter((entry) => entry.edge.sourceHandle === 'item-set-children')
    .forEach(({ targetId }) => {
      layoutItemSetSubtrees(targetId, nodeMap, childMap, childEdgesMap, visited);
    });

  const node = nodeMap.get(nodeId);
  if (node?.data?.kind === 'set') {
    alignItemSetChildren(nodeId, nodeMap, childMap, childEdgesMap);
  }
}

const ItemFlowNode: FC<NodeProps<FlowNodeData>> = ({ data }) => {
  const itemName = data.itemNode?.item.itemName ?? data.itemNode?.item.itemCode ?? 'Item';

  return (
    <Paper
      withBorder
      radius="md"
      shadow="sm"
      p="sm"
      style={{
        width: REACT_FLOW_NODE_WIDTH - 20,
        paddingRight: '2.5rem',
        position: 'relative',
        overflow: 'visible',
      }}
    >
      <Tooltip label="Open properties" withArrow>
        <ActionIcon
          variant="subtle"
          color="gray"
          size="sm"
          disabled={data.disabled}
          onClick={() =>
            data.onOpenProperties?.({
              kind: 'item',
              itemId: data.itemNode!.item.itemId,
            })
          }
          style={{ position: 'absolute', top: 6, right: 6 }}
        >
          <IconAdjustments size={16} />
        </ActionIcon>
      </Tooltip>
      <Handle type="target" position={Position.Top} id="modifier-parent" />
      <Stack gap={8}>
        <Stack gap={2} style={{ flex: '1 1 auto' }}>
          <Text fw={600} size="sm" lineClamp={2}>
            {itemName}
          </Text>
          <Text size="xs" c="dimmed">
            {data.itemNode?.item.itemCode}
          </Text>
        </Stack>
        <Badge size="xs" variant="light" color={data.context === 'inStore' ? 'indigo' : 'gray'}>
          {data.context === 'inStore' ? 'POS flow' : 'Online flow'}
        </Badge>
      </Stack>
      <Handle
        type="source"
        position={Position.Bottom}
        id="modifiers"
        style={{
          bottom: -8,
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: '#845ef7',
          border: '2px solid #e0d4ff',
          boxShadow: '0 0 0 2px rgba(132, 94, 247, 0.25)',
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="item-sets"
        style={{
          right: -8,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: 'var(--mantine-color-teal-5)',
          border: '2px solid var(--mantine-color-teal-2)',
          boxShadow: '0 0 0 2px rgba(24, 144, 255, 0.25)',
          zIndex: 5,
        }}
        isConnectable={!data.disabled}
      />
      <Tooltip label="Add modifier group" withArrow>
        <ActionIcon
          variant="light"
          color="indigo"
          size="sm"
          disabled={data.disabled}
          onClick={() => data.onAddModifier?.(data.itemNode!.item.itemId, data.context, null)}
          style={{
            position: 'absolute',
            bottom: -28,
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        >
          <IconPlus size={14} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label="Add item set group" withArrow>
        <ActionIcon
          variant="light"
          color="teal"
          size="sm"
          disabled={data.disabled}
          onClick={() => data.onAddItemSet?.(data.itemNode!.item.itemId, data.context, null)}
          style={{
            position: 'absolute',
            top: '50%',
            right: -32,
            transform: 'translateY(-50%)',
          }}
        >
          <IconPlus size={14} />
        </ActionIcon>
      </Tooltip>
    </Paper>
  );
};

const ModifierFlowNode: FC<NodeProps<FlowNodeData>> = ({ data }) => {
  const modifier = data.modifier!;
  return (
    <Paper
      withBorder
      radius="md"
      shadow="sm"
      p="sm"
      style={{
        width: REACT_FLOW_NODE_WIDTH - 20,
        paddingRight: '2.5rem',
        position: 'relative',
        overflow: 'visible',
      }}
    >
      <Tooltip label="Open properties" withArrow>
        <ActionIcon
          variant="subtle"
          color="gray"
          size="sm"
          disabled={data.disabled}
          onClick={() =>
            data.onOpenProperties?.({
              kind: 'modifier',
              itemId: data.parentItemId!,
              groupHeaderId: modifier.groupHeaderId,
              originContext: data.context,
            })
          }
          style={{ position: 'absolute', top: 6, right: 6 }}
        >
          <IconAdjustments size={16} />
        </ActionIcon>
      </Tooltip>
      <Handle type="target" position={Position.Top} />
      <Stack gap={8}>
        <Group justify="flex-start" align="flex-start" gap={6} wrap="nowrap">
          <IconGripVertical size={16} color="var(--mantine-color-gray-6)" />
          <Stack gap={2} style={{ flex: '1 1 auto', minWidth: 0 }}>
            <Text fw={600} size="sm" lineClamp={2} style={{ minWidth: 0 }}>
              {modifier.group.groupBatchName}
            </Text>
            {modifier.group.groupBatchNameAlt && (
              <Text size="xs" c="dimmed" lineClamp={1} style={{ minWidth: 0 }}>
                {modifier.group.groupBatchNameAlt}
              </Text>
            )}
          </Stack>
        </Group>
        <Badge size="xs" variant="light">
          Sequence {modifier.sequence}
        </Badge>
        <Group justify="flex-end" gap={4} wrap="nowrap">
          <Tooltip label="Move up" withArrow>
            <ActionIcon
              variant="light"
              size="sm"
              disabled={data.disabled}
              onClick={() =>
                data.onMoveModifier?.(data.parentItemId!, modifier.groupHeaderId, data.context, -1)
              }
            >
              <IconArrowUp size={14} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Move down" withArrow>
            <ActionIcon
              variant="light"
              size="sm"
              disabled={data.disabled}
              onClick={() =>
                data.onMoveModifier?.(data.parentItemId!, modifier.groupHeaderId, data.context, 1)
              }
            >
              <IconArrowDown size={14} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Remove" withArrow>
            <ActionIcon
              variant="light"
              color="red"
              size="sm"
              disabled={data.disabled}
              onClick={() =>
                data.onRemoveModifier?.(data.parentItemId!, modifier.groupHeaderId, data.context)
              }
            >
              <IconTrash size={14} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Stack>
      <Handle
        type="source"
        position={Position.Bottom}
        id="modifier-chain"
        isConnectable={!data.disabled}
        style={{
          bottom: -8,
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: '#845ef7',
          border: '2px solid #e0d4ff',
          boxShadow: '0 0 0 2px rgba(132, 94, 247, 0.25)',
        }}
      />
      <Tooltip label="Add modifier group" withArrow>
        <ActionIcon
          variant="light"
          color="indigo"
          size="sm"
          disabled={data.disabled}
          onClick={() =>
            data.onAddModifier?.(data.parentItemId!, data.context, data.modifier?.groupHeaderId ?? null)
          }
          style={{
            position: 'absolute',
            bottom: -28,
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        >
          <IconPlus size={14} />
        </ActionIcon>
      </Tooltip>
    </Paper>
  );
};

const ItemSetFlowNode: FC<NodeProps<FlowNodeData>> = ({ data }) => {
  const itemSet = data.itemSet!;
  return (
    <Paper
      withBorder
      radius="md"
      shadow="sm"
      p="sm"
      style={{
        width: REACT_FLOW_NODE_WIDTH - 20,
        paddingRight: '2.5rem',
        position: 'relative',
        overflow: 'visible',
      }}
    >
      <Tooltip label="Open properties" withArrow>
        <ActionIcon
          variant="subtle"
          color="gray"
          size="sm"
          disabled={data.disabled}
          onClick={() =>
            data.onOpenProperties?.({
              kind: 'item-set',
              itemId: data.parentItemId!,
              groupHeaderId: itemSet.groupHeaderId,
              originContext: data.context,
            })
          }
          style={{ position: 'absolute', top: 6, right: 6 }}
        >
          <IconAdjustments size={16} />
        </ActionIcon>
      </Tooltip>
      <Handle
        type="target"
        position={Position.Left}
        id="item-set-parent"
        isConnectable={!data.disabled}
        style={{
          left: -8,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: 'var(--mantine-color-gray-2)',
          border: '2px solid var(--mantine-color-teal-2)',
          boxShadow: '0 0 0 2px rgba(24, 144, 255, 0.25)',
          zIndex: 5,
        }}
      />
      <Stack gap={8}>
        <Group justify="flex-start" align="flex-start" gap={6} wrap="nowrap">
          <IconChevronRight size={16} color="var(--mantine-color-gray-6)" />
          <Stack gap={2} style={{ flex: '1 1 auto', minWidth: 0 }}>
            <Text fw={600} size="sm" lineClamp={2} style={{ minWidth: 0 }}>
              {itemSet.group.groupBatchName}
            </Text>
            {itemSet.group.groupBatchNameAlt && (
              <Text size="xs" c="dimmed" lineClamp={1} style={{ minWidth: 0 }}>
                {itemSet.group.groupBatchNameAlt}
              </Text>
            )}
          </Stack>
        </Group>
        <Badge size="xs" variant="light" color="teal">
          {itemSet.children.length} items
        </Badge>
        <Group justify="flex-end" gap={4} wrap="nowrap">
          <Tooltip label="Move up" withArrow>
            <ActionIcon
              variant="light"
              size="sm"
              disabled={data.disabled}
              onClick={() =>
                data.onMoveItemSet?.(data.parentItemId!, itemSet.groupHeaderId, data.context, -1)
              }
            >
              <IconArrowUp size={14} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Move down" withArrow>
            <ActionIcon
              variant="light"
              size="sm"
              disabled={data.disabled}
              onClick={() =>
                data.onMoveItemSet?.(data.parentItemId!, itemSet.groupHeaderId, data.context, 1)
              }
            >
              <IconArrowDown size={14} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Remove" withArrow>
            <ActionIcon
              variant="light"
              color="red"
              size="sm"
              disabled={data.disabled}
              onClick={() =>
                data.onRemoveItemSet?.(data.parentItemId!, itemSet.groupHeaderId, data.context)
              }
            >
              <IconTrash size={14} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Stack>
      <Handle
        type="source"
        position={Position.Right}
        id="item-set-chain"
        isConnectable={!data.disabled}
        style={{
          right: -8,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: 'var(--mantine-color-teal-5)',
          border: '2px solid var(--mantine-color-teal-2)',
          boxShadow: '0 0 0 2px rgba(24, 144, 255, 0.25)',
          zIndex: 5,
        }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="item-set-children"
        isConnectable={!data.disabled}
        style={{ bottom: -6 }}
      />
      <Tooltip label="Add item set group" withArrow>
        <ActionIcon
          variant="light"
          color="teal"
          size="sm"
          disabled={data.disabled}
          onClick={() =>
            data.onAddItemSet?.(data.parentItemId!, data.context, data.itemSet?.groupHeaderId ?? null)
          }
          style={{
            position: 'absolute',
            top: '50%',
            right: -32,
            transform: 'translateY(-50%)',
          }}
        >
          <IconPlus size={14} />
        </ActionIcon>
      </Tooltip>
    </Paper>
  );
};

const nodeTypes = {
  item: ItemFlowNode,
  modifier: ModifierFlowNode,
  itemset: ItemSetFlowNode,
};

function layoutGraph(nodes: Node<FlowNodeData>[], edges: Edge[]): { nodes: Node[]; edges: Edge[] } {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: 'TB', ranksep: 90, nodesep: 70 });

  nodes.forEach((node) => {
    graph.setNode(node.id, { width: REACT_FLOW_NODE_WIDTH, height: REACT_FLOW_NODE_HEIGHT });
  });

  edges.forEach((edge) => {
    graph.setEdge(edge.source, edge.target);
  });

  dagre.layout(graph);

  const positionedNodes = nodes.map((node) => {
    const position = graph.node(node.id);
    const flowData = node.data;
    let sourcePosition = Position.Bottom;
    let targetPosition = Position.Top;

    if (flowData?.kind === 'item') {
      sourcePosition = Position.Bottom;
      targetPosition = Position.Top;
    } else if (flowData?.kind === 'set') {
      sourcePosition = Position.Bottom;
      targetPosition = Position.Left;
    }

    return {
      ...node,
      position: {
        x: position.x - REACT_FLOW_NODE_WIDTH / 2,
        y: position.y - REACT_FLOW_NODE_HEIGHT / 2,
      },
      sourcePosition,
      targetPosition,
    };
  });

  const nodeMap = new Map(positionedNodes.map((node) => [node.id, node]));
  const childMap = new Map<string, string[]>();
  const childEdgesMap = new Map<string, ChildEdgeLink[]>();
  const incomingCounts = new Map<string, number>();

  edges.forEach((edge) => {
    if (!childMap.has(edge.source)) {
      childMap.set(edge.source, []);
    }
    childMap.get(edge.source)!.push(edge.target);

    if (!childEdgesMap.has(edge.source)) {
      childEdgesMap.set(edge.source, []);
    }
    childEdgesMap.get(edge.source)!.push({ targetId: edge.target, edge });

    incomingCounts.set(edge.target, (incomingCounts.get(edge.target) ?? 0) + 1);
  });

  const rootItems = positionedNodes.filter(
    (node) => node.data?.kind === 'item' && (incomingCounts.get(node.id) ?? 0) === 0,
  );

  const visitedSubtrees = new Set<string>();
  rootItems.forEach((root) => {
    layoutItemSetSubtrees(root.id, nodeMap, childMap, childEdgesMap, visitedSubtrees);
  });

  const itemSetEdgesByAnchor = new Map<string, Array<{ edge: Edge; order: number }>>();

  edges.forEach((edge) => {
    if (edge.data && typeof edge.data === 'object' && (edge.data as { kind?: string }).kind === 'item-set') {
      const edgeData = edge.data as { kind: string; order?: number; anchor?: string };
      const anchor = edgeData.anchor ?? edge.source;
      if (!itemSetEdgesByAnchor.has(anchor)) {
        itemSetEdgesByAnchor.set(anchor, []);
      }
      itemSetEdgesByAnchor.get(anchor)!.push({ edge, order: edgeData.order ?? 0 });
    }
  });

  itemSetEdgesByAnchor.forEach((edgeList, anchorId) => {
    const parentNode = nodeMap.get(anchorId);
    if (!parentNode) {
      return;
    }

    const sortedEdges = edgeList.sort((a, b) => a.order - b.order);
    let cursorX = parentNode.position.x + REACT_FLOW_NODE_WIDTH + ITEM_SET_HORIZONTAL_OFFSET;

    sortedEdges.forEach(({ edge }) => {
      const targetId = edge.target;
      let bounds = getSubtreeBounds(targetId, nodeMap, childMap, childEdgesMap, new Set(), {
        excludeItemSetChains: true,
      });
      if (!Number.isFinite(bounds.minX) || !Number.isFinite(bounds.maxX)) {
        return;
      }

      const desiredMin = cursorX;
      const delta = desiredMin - bounds.minX;
      if (Math.abs(delta) > 0.5) {
        shiftSubtree(targetId, delta, 0, nodeMap, childMap, new Set());
        bounds = getSubtreeBounds(targetId, nodeMap, childMap, childEdgesMap, new Set(), {
          excludeItemSetChains: true,
        });
        if (!Number.isFinite(bounds.minX) || !Number.isFinite(bounds.maxX)) {
          return;
        }
      }

      const updatedChildNode = nodeMap.get(targetId);
      if (updatedChildNode) {
        updatedChildNode.position = {
          ...updatedChildNode.position,
          y: parentNode.position.y,
        };
      }

      cursorX = bounds.maxX + ITEM_SET_HORIZONTAL_GAP;
    });
  });

  rootItems.forEach((root) => {
    const itemSetChildren = childEdgesMap
      .get(root.id)
      ?.filter(
        ({ edge }) =>
          edge.sourceHandle === 'item-sets' ||
          edge.sourceHandle === 'item-set-chain' ||
          (edge.data && typeof edge.data === 'object' && (edge.data as { kind?: string }).kind === 'item-set'),
      )
      .map(({ targetId }) => targetId);

    if (!itemSetChildren || itemSetChildren.length === 0) {
      return;
    }

    let minSubtreeX = Number.POSITIVE_INFINITY;
    let maxSubtreeX = Number.NEGATIVE_INFINITY;
    let minAnchorX = Number.POSITIVE_INFINITY;
    let maxAnchorX = Number.NEGATIVE_INFINITY;

    itemSetChildren.forEach((childId) => {
      const bounds = getSubtreeBounds(childId, nodeMap, childMap, childEdgesMap, new Set(), {
        excludeItemSetChains: true,
      });
      if (Number.isFinite(bounds.minX)) {
        minSubtreeX = Math.min(minSubtreeX, bounds.minX);
      }
      if (Number.isFinite(bounds.maxX)) {
        maxSubtreeX = Math.max(maxSubtreeX, bounds.maxX);
      }

      const childNode = nodeMap.get(childId);
      if (childNode) {
        minAnchorX = Math.min(minAnchorX, childNode.position.x);
        maxAnchorX = Math.max(maxAnchorX, childNode.position.x + REACT_FLOW_NODE_WIDTH);
      }
    });

    if (
      !Number.isFinite(minSubtreeX) ||
      !Number.isFinite(maxSubtreeX) ||
      !Number.isFinite(minAnchorX) ||
      !Number.isFinite(maxAnchorX)
    ) {
      return;
    }

    const effectiveMin = Math.max(minSubtreeX, minAnchorX);
    const effectiveMax = Math.max(maxSubtreeX, maxAnchorX);
    if (effectiveMin > effectiveMax) {
      return;
    }

    const desiredCenter = (effectiveMin + effectiveMax) / 2;
    const maxAllowedCenter = effectiveMin - (ITEM_SET_HORIZONTAL_OFFSET + REACT_FLOW_NODE_WIDTH / 2);
    const targetCenter = Math.min(desiredCenter, maxAllowedCenter);
    const targetX = targetCenter - REACT_FLOW_NODE_WIDTH / 2;
    const deltaX = targetX - root.position.x;

    if (Math.abs(deltaX) > 0.5) {
      root.position = {
        ...root.position,
        x: root.position.x + deltaX,
      };

      itemSetChildren.forEach((childId) => {
        shiftSubtree(childId, deltaX, 0, nodeMap, childMap, new Set());
      });
    }
  });

  return { nodes: positionedNodes, edges };
}

interface FlowGraphHandlers {
  onAddModifier: (
    itemId: number,
    context: 'inStore' | 'online',
    insertAfterGroupHeaderId?: number | null,
  ) => void;
  onAddItemSet: (
    itemId: number,
    context: 'inStore' | 'online',
    insertAfterGroupHeaderId?: number | null,
  ) => void;
  onRemoveModifier: (itemId: number, groupHeaderId: number, context: 'inStore' | 'online') => void;
  onMoveModifier: (
    itemId: number,
    groupHeaderId: number,
    context: 'inStore' | 'online',
    direction: -1 | 1,
  ) => void;
  onRemoveItemSet: (itemId: number, groupHeaderId: number, context: 'inStore' | 'online') => void;
  onMoveItemSet: (
    itemId: number,
    groupHeaderId: number,
    context: 'inStore' | 'online',
    direction: -1 | 1,
  ) => void;
  disabled: boolean;
  onOpenProperties: (state: NodePropertiesDrawerState) => void;
}

function findNodeById(node: ItemRelationshipNode, itemId: number): ItemRelationshipNode | null {
  if (node.item.itemId === itemId) {
    return node;
  }

  for (const set of node.inStore.itemSets) {
    for (const child of set.children) {
      const match = findNodeById(child, itemId);
      if (match) {
        return match;
      }
    }
  }

  for (const set of node.online.itemSets) {
    for (const child of set.children) {
      const match = findNodeById(child, itemId);
      if (match) {
        return match;
      }
    }
  }

  return null;
}

interface ParentLinkContext {
  nodeId: string;
  itemId: number;
  sourceHandle?: string;
  targetHandle?: string;
}

function normalizeModifierSourceHandle(handle?: string): string {
  if (!handle) {
    return 'modifiers';
  }

  if (handle === 'item-set-children') {
    return 'modifiers';
  }

  return handle;
}

function buildFlowGraph(
  node: ItemRelationshipNode,
  context: 'inStore' | 'online',
  handlers: FlowGraphHandlers,
  path = 'root',
  parent?: ParentLinkContext,
): { nodes: Node<FlowNodeData>[]; edges: Edge[] } {
  const nodes: Node<FlowNodeData>[] = [];
  const edges: Edge[] = [];

  const itemNodeId = `${context}-item-${path}`;
  nodes.push({
    id: itemNodeId,
    type: 'item',
    data: {
      kind: 'item',
      context,
      itemNode: node,
      onAddModifier: handlers.onAddModifier,
      onAddItemSet: handlers.onAddItemSet,
      disabled: handlers.disabled,
      onOpenProperties: handlers.onOpenProperties,
    },
    position: { x: 0, y: 0 },
  });

  const parentChainHandle = normalizeModifierSourceHandle(parent?.sourceHandle);

  if (parent) {
    const parentEdgeStyle =
      parent.sourceHandle === 'item-set-children'
        ? { ...ITEM_SET_EDGE_STYLE }
        : parentChainHandle === 'modifiers'
          ? { ...MODIFIER_EDGE_STYLE }
          : undefined;

    edges.push({
      id: `${parent.nodeId}-${itemNodeId}`,
      source: parent.nodeId,
      target: itemNodeId,
      sourceHandle: parent.sourceHandle,
      targetHandle: parent.targetHandle,
      data:
        parent.sourceHandle === 'item-set-children'
          ? undefined
          : parentChainHandle === 'modifiers'
            ? { kind: 'modifier' }
            : undefined,
      style: parent.sourceHandle === 'item-set-children' ? undefined : parentEdgeStyle,
    });
  }

  const ctx = context === 'inStore' ? node.inStore : node.online;
  let previousModifierNodeId = itemNodeId;

  ctx.modifiers.forEach((modifier, index) => {
    const modifierId = `${itemNodeId}-mod-${index}-${modifier.groupHeaderId}`;
    nodes.push({
      id: modifierId,
      type: 'modifier',
      data: {
        kind: 'modifier',
        context,
        modifier,
        parentItemId: node.item.itemId,
        onRemoveModifier: handlers.onRemoveModifier,
        onMoveModifier: handlers.onMoveModifier,
        onAddModifier: handlers.onAddModifier,
        disabled: handlers.disabled,
        onOpenProperties: handlers.onOpenProperties,
      },
      position: { x: 0, y: 0 },
    });

    const sourceHandleForEdge =
      previousModifierNodeId === itemNodeId ? parentChainHandle : 'modifier-chain';

    const modifierEdge: Edge = {
      id: `${previousModifierNodeId}-${modifierId}`,
      source: previousModifierNodeId,
      target: modifierId,
      sourceHandle: sourceHandleForEdge,
      targetHandle: 'modifier-parent',
      data: { kind: 'modifier' },
      style: { ...MODIFIER_EDGE_STYLE },
    };
    edges.push(modifierEdge);

    previousModifierNodeId = modifierId;
  });

  let previousSetNodeId = itemNodeId;

  ctx.itemSets.forEach((itemSet, index) => {
    const setId = `${itemNodeId}-set-${index}-${itemSet.groupHeaderId}`;
    nodes.push({
      id: setId,
      type: 'itemset',
      data: {
        kind: 'set',
        context,
        itemSet,
        parentItemId: node.item.itemId,
        onRemoveItemSet: handlers.onRemoveItemSet,
        onMoveItemSet: handlers.onMoveItemSet,
        onAddItemSet: handlers.onAddItemSet,
        disabled: handlers.disabled,
        onOpenProperties: handlers.onOpenProperties,
      },
      position: { x: 0, y: 0 },
    });

    const edgeSourceId = previousSetNodeId;
    const sourceHandle = previousSetNodeId === itemNodeId ? 'item-sets' : 'item-set-chain';

    edges.push({
      id: `${edgeSourceId}-set-${index}-${itemSet.groupHeaderId}`,
      source: edgeSourceId,
      sourceHandle,
      target: setId,
      targetHandle: 'item-set-parent',
      data: { kind: 'item-set', order: index, anchor: itemNodeId },
      style: { ...ITEM_SET_EDGE_STYLE },
    });

    previousSetNodeId = setId;

    itemSet.children.forEach((child, childIndex) => {
      const childPath = `${path}-set${index}-child${childIndex}-${child.item.itemId}`;
      const childGraph = buildFlowGraph(
        child,
        context,
        handlers,
        childPath,
        {
          nodeId: setId,
          itemId: child.item.itemId,
          sourceHandle: 'item-set-children',
        },
      );
      nodes.push(...childGraph.nodes);
      edges.push(...childGraph.edges);
    });
  });

  return { nodes, edges };
}

export const ManageItemRelationshipsModal: FC<ManageItemRelationshipsModalProps> = ({
  opened,
  onClose,
  brandId,
  item,
  modifierGroups,
  onSaved,
}) => {
  const [activeContext, setActiveContext] = useState<'inStore' | 'online'>('inStore');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [relationship, setRelationship] = useState<ItemRelationshipTree | null>(null);
  const [groupSelection, setGroupSelection] = useState<GroupSelectionState | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [pendingViewportAction, setPendingViewportAction] = useState<PendingViewportAction | null>(null);
  const [propertiesDrawer, setPropertiesDrawer] = useState<NodePropertiesDrawerState | null>(null);
  const [groupLookups, setGroupLookups] = useState<ModifierGroupHeader[]>(modifierGroups ?? []);
  const [pendingFocus, setPendingFocus] = useState<PendingFocusRequest | null>(null);
  const flowContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (modifierGroups) {
      setGroupLookups(modifierGroups);
    } else {
      setGroupLookups([]);
    }
  }, [modifierGroups]);

  const itemAccountId = item?.accountId ?? null;
  const itemCategoryId = item?.categoryId ?? null;
  const itemDepartmentId = item?.departmentId ?? null;

  const childRelationshipCache = useRef<Map<number, ItemRelationshipNode>>(new Map());

  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

  const availableGroups = groupLookups;

  const visibleNodeCount = useMemo(
    () => nodes.filter((node) => !node.hidden).length,
    [nodes],
  );

  const fitViewPadding = visibleNodeCount <= 1 ? 1.6 : 0.8;
  const fitViewOptions = useMemo(
    () => ({
      padding: fitViewPadding,
      duration: 200,
    }),
    [fitViewPadding],
  );

  const loadRelationships = useCallback(async () => {
    if (!brandId || !item) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const tree = await menuItemService.getItemRelationships(brandId, item.itemId);
      setRelationship(tree);
    } catch (err) {
      console.error('Failed to load item relationships', err);
      setError('Unable to load item relationships. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [brandId, item]);

  useEffect(() => {
    if (opened) {
      void loadRelationships();
    } else {
      setRelationship(null);
      setError(null);
      setGroupSelection(null);
      setSelectedGroupId(null);
      setPropertiesDrawer(null);
      childRelationshipCache.current.clear();
      setIsMaximized(false);
      setPendingViewportAction(null);
    }
  }, [opened, loadRelationships]);

  const ensureChildNode = useCallback(
    async (childItemId: number): Promise<ItemRelationshipNode | null> => {
      if (!brandId) {
        return null;
      }

      const cache = childRelationshipCache.current;
      if (cache.has(childItemId)) {
        return cloneItemNode(cache.get(childItemId)!);
      }

      try {
        const tree = await menuItemService.getItemRelationships(brandId, childItemId);
        cache.set(childItemId, tree.root);
        return cloneItemNode(tree.root);
      } catch (err) {
        console.error(`Failed to load relationships for child item ${childItemId}`, err);
        notifications.show({
          color: 'red',
          title: 'Unable to load child item',
          message: 'Modifier data for the child item could not be loaded.',
        });
        return null;
      }
    },
    [brandId],
  );

  const handleModifierGroupUpdated = useCallback((header: ModifierGroupHeader) => {
    setGroupLookups((prev) => {
      const next = [...prev.filter((group) => group.groupHeaderId !== header.groupHeaderId), header];
      next.sort((a, b) => a.groupBatchName.localeCompare(b.groupBatchName));
      return next;
    });
  }, []);

  const updateNode = useCallback(
    (targetItemId: number, updater: (node: ItemRelationshipNode) => void) => {
      setRelationship((prev) => {
        if (!prev) {
          return prev;
        }

        const visit = (current: ItemRelationshipNode): [ItemRelationshipNode, boolean] => {
          if (current.item.itemId === targetItemId) {
            const clone = cloneItemNode(current);
            updater(clone);
            return [clone, true];
          }

          let changed = false;

          const inStoreSets = current.inStore.itemSets.map((set) => {
            const updatedChildren = set.children.map((child) => {
              const [updatedChild, wasChanged] = visit(child);
              if (wasChanged) {
                changed = true;
              }
              return updatedChild;
            });

            if (changed) {
              return { ...set, children: updatedChildren };
            }
            return set;
          });

          const onlineSets = current.online.itemSets.map((set) => {
            const updatedChildren = set.children.map((child) => {
              const [updatedChild, wasChanged] = visit(child);
              if (wasChanged) {
                changed = true;
              }
              return updatedChild;
            });

            if (changed) {
              return { ...set, children: updatedChildren };
            }
            return set;
          });

          if (!changed) {
            return [current, false];
          }

          return [
            {
              item: { ...current.item },
              inStore: {
                modifiers: current.inStore.modifiers.map(cloneModifier),
                itemSets: inStoreSets,
              },
              online: {
                modifiers: current.online.modifiers.map(cloneModifier),
                itemSets: onlineSets,
              },
            },
            true,
          ];
        };

        const [nextRoot, wasChanged] = visit(prev.root);
        if (!wasChanged) {
          return prev;
        }

        return { root: nextRoot };
      });
    },
    [],
  );

  const handleRemoveModifier = useCallback(
    (itemId: number, groupHeaderId: number, context: 'inStore' | 'online') => {
      updateNode(itemId, (node) => {
        const ctx = context === 'inStore' ? node.inStore : node.online;
        ctx.modifiers = ctx.modifiers.filter((modifier) => modifier.groupHeaderId !== groupHeaderId);
        resyncModifierSequences(ctx);
      });
    },
    [updateNode],
  );

  const handleMoveModifier = useCallback(
    (
      itemId: number,
      groupHeaderId: number,
      context: 'inStore' | 'online',
      direction: -1 | 1,
    ) => {
      updateNode(itemId, (node) => {
        const ctx = context === 'inStore' ? node.inStore : node.online;
        const index = ctx.modifiers.findIndex((modifier) => modifier.groupHeaderId === groupHeaderId);
        if (index === -1) return;
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= ctx.modifiers.length) return;
        const reordered = [...ctx.modifiers];
        const [moved] = reordered.splice(index, 1);
        reordered.splice(targetIndex, 0, moved);
        ctx.modifiers = reordered;
        resyncModifierSequences(ctx);
      });
    },
    [updateNode],
  );

  const handleRemoveItemSet = useCallback(
    (itemId: number, groupHeaderId: number, context: 'inStore' | 'online') => {
      updateNode(itemId, (node) => {
        const ctx = context === 'inStore' ? node.inStore : node.online;
        ctx.itemSets = ctx.itemSets.filter((set) => set.groupHeaderId !== groupHeaderId);
        resyncItemSetSequences(ctx);
      });
    },
    [updateNode],
  );

  const handleMoveItemSet = useCallback(
    (
      itemId: number,
      groupHeaderId: number,
      context: 'inStore' | 'online',
      direction: -1 | 1,
    ) => {
      updateNode(itemId, (node) => {
        const ctx = context === 'inStore' ? node.inStore : node.online;
        const index = ctx.itemSets.findIndex((set) => set.groupHeaderId === groupHeaderId);
        if (index === -1) return;
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= ctx.itemSets.length) return;
        const reordered = [...ctx.itemSets];
        const [moved] = reordered.splice(index, 1);
        reordered.splice(targetIndex, 0, moved);
        ctx.itemSets = reordered;
        resyncItemSetSequences(ctx);
      });
    },
    [updateNode],
  );

  const handleAddModifier = useCallback(
    (
      itemId: number,
      context: 'inStore' | 'online',
      insertAfterGroupHeaderId: number | null = null,
    ) => {
      setGroupSelection({
        mode: 'modifier',
        itemId,
        context,
        insertAfterGroupHeaderId,
      });
    },
    [],
  );

  const handleAddItemSet = useCallback(
    (
      itemId: number,
      context: 'inStore' | 'online',
      insertAfterGroupHeaderId: number | null = null,
    ) => {
      setGroupSelection({
        mode: 'set',
        itemId,
        context,
        insertAfterGroupHeaderId,
      });
    },
    [],
  );

  const addModifierGroupToNode = useCallback(
    (
      itemId: number,
      context: 'inStore' | 'online',
      group: ModifierGroupHeader,
      insertAfterGroupHeaderId: number | null,
    ): boolean => {
      let added = false;
      updateNode(itemId, (node) => {
        const ctx = context === 'inStore' ? node.inStore : node.online;
        if (ctx.modifiers.some((modifier) => modifier.groupHeaderId === group.groupHeaderId)) {
          notifications.show({
            color: 'yellow',
            title: 'Modifier already linked',
            message: `${group.groupBatchName} is already linked to this item.`,
          });
          return;
        }

        const anchorIndex =
          insertAfterGroupHeaderId == null
            ? -1
            : ctx.modifiers.findIndex((modifier) => modifier.groupHeaderId === insertAfterGroupHeaderId);

        const insertIndex =
          insertAfterGroupHeaderId == null
            ? 0
            : anchorIndex === -1
              ? ctx.modifiers.length
              : anchorIndex + 1;

        const nextModifiers = [...ctx.modifiers];
        nextModifiers.splice(insertIndex, 0, {
          groupHeaderId: group.groupHeaderId,
          sequence: insertIndex + 1,
          linkType: context === 'inStore' ? MODE_NEW_MODIFIER : null,
          group: { ...group },
        });

        ctx.modifiers = nextModifiers;
        resyncModifierSequences(ctx);
        added = true;
      });
      if (added) {
        setPendingFocus({
          kind: 'modifier',
          itemId,
          groupHeaderId: group.groupHeaderId,
          context,
        });
      }
      return added;
    },
    [updateNode],
  );

  const addItemSetToNode = useCallback(
    async (
      itemId: number,
      context: 'inStore' | 'online',
      group: ModifierGroupHeader,
      insertAfterGroupHeaderId: number | null,
    ): Promise<boolean> => {
      if (!brandId) {
        return false;
      }

      setSaving(true);
      try {
        const preview = await menuItemService.getModifierGroupPreview(brandId, group.groupHeaderId);
        const children: ItemRelationshipNode[] = [];

        for (const previewItem of preview.items as ModifierGroupPreviewItem[]) {
          const existing = await ensureChildNode(previewItem.itemId);
          if (existing) {
            children.push(existing);
            continue;
          }

          children.push({
            item: {
              itemId: previewItem.itemId,
              accountId: itemAccountId ?? 0,
              categoryId: itemCategoryId ?? 0,
              departmentId: itemDepartmentId ?? 0,
              itemCode: previewItem.itemCode,
              itemName: previewItem.itemName ?? undefined,
              enabled: previewItem.enabled,
              isItemShow: true,
              isPriceShow: true,
              hasModifier: false,
              isModifier: false,
              isFollowSet: false,
              isFollowSetDynamic: false,
              isFollowSetStandard: false,
              isPromoItem: false,
              isManualPrice: false,
              isManualName: false,
              isNonDiscountItem: false,
              isNonServiceChargeItem: false,
              displayIndex: previewItem.displayIndex,
              itemPublicDisplayName: previewItem.itemName ?? previewItem.itemCode,
            },
            inStore: { modifiers: [], itemSets: [] },
            online: { modifiers: [], itemSets: [] },
          });
        }

        let added = false;
        updateNode(itemId, (node) => {
          const ctx = context === 'inStore' ? node.inStore : node.online;
        if (ctx.itemSets.some((set) => set.groupHeaderId === group.groupHeaderId)) {
          notifications.show({
            color: 'yellow',
            title: 'Item set already linked',
            message: `${group.groupBatchName} is already linked to this item.`,
          });
          return;
        }

          const anchorIndex =
            insertAfterGroupHeaderId == null
              ? -1
              : ctx.itemSets.findIndex((set) => set.groupHeaderId === insertAfterGroupHeaderId);
          const insertIndex =
            insertAfterGroupHeaderId == null
              ? 0
              : anchorIndex === -1
                ? ctx.itemSets.length
                : anchorIndex + 1;

          const nextItemSets = [...ctx.itemSets];
          nextItemSets.splice(insertIndex, 0, {
            itemSetId: null,
            groupHeaderId: group.groupHeaderId,
            sequence: insertIndex + 1,
            linkType: context === 'inStore' ? MODE_NEW_MODIFIER : null,
            group: { ...group },
            children,
          });

          ctx.itemSets = nextItemSets;
          resyncItemSetSequences(ctx);
          added = true;
        });
        if (added) {
          setPendingFocus({
            kind: 'item-set',
            itemId,
            groupHeaderId: group.groupHeaderId,
            context,
          });
        }
        return added;
      } catch (err) {
        console.error('Failed to add item set', err);
        notifications.show({
          color: 'red',
          title: 'Unable to add item set group',
          message: 'An error occurred while adding the item set group. Please try again.',
        });
        return false;
      } finally {
        setSaving(false);
      }
    },
    [brandId, ensureChildNode, itemAccountId, itemCategoryId, itemDepartmentId, updateNode],
  );

  useEffect(() => {
    if (!groupSelection) {
      setSelectedGroupId(null);
    }
  }, [groupSelection]);

  const selectionOptions = useMemo(() => {
    if (!groupSelection || !relationship) {
      return [];
    }

    const shouldMatchFollowSet = groupSelection.mode === 'set';

    const node = findNodeById(relationship.root, groupSelection.itemId);
    const existingIds = new Set<number>();

    if (node) {
      const ctx = groupSelection.context === 'inStore' ? node.inStore : node.online;
      if (groupSelection.mode === 'modifier') {
        ctx.modifiers.forEach((modifier) => existingIds.add(modifier.groupHeaderId));
      } else {
        ctx.itemSets.forEach((set) => existingIds.add(set.groupHeaderId));
      }
    }

    return availableGroups
      .filter((group) => group.isFollowSet === shouldMatchFollowSet)
      .filter((group) => !existingIds.has(group.groupHeaderId))
      .map((group) => ({
        value: String(group.groupHeaderId),
        label: group.groupBatchName,
      }));
  }, [groupSelection, relationship, availableGroups]);

  const handleGroupSelectionConfirm = useCallback(async () => {
    if (!groupSelection || !selectedGroupId) {
      return;
    }

    const group = availableGroups.find((candidate) => candidate.groupHeaderId === Number(selectedGroupId));
    if (!group) {
      notifications.show({
        color: 'red',
        title: 'Group not found',
        message: 'The selected group is no longer available.',
      });
      return;
    }

    let added = false;
    if (groupSelection.mode === 'modifier') {
      added = addModifierGroupToNode(
        groupSelection.itemId,
        groupSelection.context,
        group,
        groupSelection.insertAfterGroupHeaderId,
      );
    } else {
      added = await addItemSetToNode(
        groupSelection.itemId,
        groupSelection.context,
        group,
        groupSelection.insertAfterGroupHeaderId,
      );
    }

    if (added) {
      setGroupSelection(null);
      setSelectedGroupId(null);
    }
  }, [
    addItemSetToNode,
    addModifierGroupToNode,
    availableGroups,
    groupSelection,
    selectedGroupId,
  ]);

  const handleOpenProperties = useCallback((drawerState: NodePropertiesDrawerState) => {
    setPropertiesDrawer(drawerState);
  }, []);

  const rebuildGraph = useCallback(() => {
    if (!relationship) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const graph = buildFlowGraph(relationship.root, activeContext, {
      onAddModifier: handleAddModifier,
      onAddItemSet: handleAddItemSet,
      onRemoveModifier: handleRemoveModifier,
      onMoveModifier: handleMoveModifier,
      onRemoveItemSet: handleRemoveItemSet,
      onMoveItemSet: handleMoveItemSet,
      disabled: saving,
      onOpenProperties: handleOpenProperties,
    });

    const layouted = layoutGraph(graph.nodes, graph.edges);
    if (import.meta.env.DEV) {
      // expose latest graph for debugging when running locally
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__menuItemRelationshipGraph = { nodes: layouted.nodes, edges: layouted.edges };
    }
    setNodes(layouted.nodes);
    setEdges(layouted.edges);
    setPendingViewportAction('center-root');
  }, [
    relationship,
    activeContext,
    handleAddModifier,
    handleAddItemSet,
    handleRemoveModifier,
    handleMoveModifier,
    handleRemoveItemSet,
    handleMoveItemSet,
    handleOpenProperties,
    saving,
    setEdges,
    setNodes,
  ]);

  useEffect(() => {
    rebuildGraph();
  }, [
    rebuildGraph,
  ]);

  useEffect(() => {
    if (!reactFlowInstance || nodes.length === 0) {
      return;
    }

    if (pendingFocus) {
      const targetNode = nodes.find((node) => {
        if (!node.data) {
          return false;
        }
        if (pendingFocus.kind === 'modifier') {
          return (
            node.data.kind === 'modifier' &&
            node.data.context === pendingFocus.context &&
            node.data.parentItemId === pendingFocus.itemId &&
            node.data.modifier?.groupHeaderId === pendingFocus.groupHeaderId
          );
        }

        return (
          node.data.kind === 'set' &&
          node.data.context === pendingFocus.context &&
          node.data.parentItemId === pendingFocus.itemId &&
          node.data.itemSet?.groupHeaderId === pendingFocus.groupHeaderId
        );
      });

      if (!targetNode) {
        return;
      }

      const width =
        typeof targetNode.width === 'number' && Number.isFinite(targetNode.width)
          ? targetNode.width
          : REACT_FLOW_NODE_WIDTH;
      const height =
        typeof targetNode.height === 'number' && Number.isFinite(targetNode.height)
          ? targetNode.height
          : REACT_FLOW_NODE_HEIGHT;

      const containerEl = flowContainerRef.current;
      if (containerEl) {
        const { width: containerWidth, height: containerHeight } = containerEl.getBoundingClientRect();
        if (containerWidth > 0 && containerHeight > 0) {
          const topLeft = reactFlowInstance.project({ x: 0, y: 0 });
          const bottomRight = reactFlowInstance.project({ x: containerWidth, y: containerHeight });

          const visibleMinX = Math.min(topLeft.x, bottomRight.x);
          const visibleMaxX = Math.max(topLeft.x, bottomRight.x);
          const visibleMinY = Math.min(topLeft.y, bottomRight.y);
          const visibleMaxY = Math.max(topLeft.y, bottomRight.y);

          const nodeMinX = targetNode.position.x;
          const nodeMaxX = targetNode.position.x + width;
          const nodeMinY = targetNode.position.y;
          const nodeMaxY = targetNode.position.y + height;

          if (
            nodeMinX >= visibleMinX &&
            nodeMaxX <= visibleMaxX &&
            nodeMinY >= visibleMinY &&
            nodeMaxY <= visibleMaxY
          ) {
            setPendingFocus(null);
            if (pendingViewportAction) {
              setPendingViewportAction(null);
            }
            return;
          }
        }
      }

      const centerX = targetNode.position.x + width / 2;
      const centerY = targetNode.position.y + height / 2;

      reactFlowInstance.setCenter(centerX, centerY, {
        duration: 260,
        zoom: reactFlowInstance.getZoom(),
      });
      setPendingFocus(null);
      if (pendingViewportAction) {
        setPendingViewportAction(null);
      }
      return;
    }

    if (pendingViewportAction === 'center-root') {
      const rootNodeId = `${activeContext}-item-root`;
      const rootNode = nodes.find((node) => node.id === rootNodeId);

      if (rootNode) {
        const width =
          typeof rootNode.width === 'number' && Number.isFinite(rootNode.width)
            ? rootNode.width
            : REACT_FLOW_NODE_WIDTH;
        const height =
          typeof rootNode.height === 'number' && Number.isFinite(rootNode.height)
            ? rootNode.height
            : REACT_FLOW_NODE_HEIGHT;

        const centerX = rootNode.position.x + width / 2;
        const centerY = rootNode.position.y + height / 2;

        reactFlowInstance.setCenter(centerX, centerY, {
          duration: 260,
          zoom: reactFlowInstance.getZoom(),
        });
      } else {
        reactFlowInstance.fitView(fitViewOptions);
      }

      setPendingViewportAction(null);
      return;
    }

    if (pendingViewportAction === 'fit-view') {
      reactFlowInstance.fitView(fitViewOptions);
      setPendingViewportAction(null);
    }
  }, [activeContext, fitViewOptions, nodes, pendingFocus, pendingViewportAction, reactFlowInstance]);

  const handleSave = useCallback(async () => {
    if (!relationship || !brandId || !item) {
      return;
    }

    setSaving(true);
    try {
      const payload = buildUpdatePayload(relationship.root);
      const updated = await menuItemService.updateItemRelationships(brandId, item.itemId, payload);
      setRelationship(updated);
      onSaved(getHasModifierFlag(updated.root));
      notifications.show({
        color: 'green',
        title: 'Relationships saved',
        message: 'Modifier relationships updated successfully.',
      });
    } catch (err) {
      console.error('Failed to save relationships', err);
      notifications.show({
        color: 'red',
        title: 'Unable to save changes',
        message: 'An error occurred while saving. Please try again.',
      });
    } finally {
      setSaving(false);
    }
  }, [relationship, brandId, item, onSaved]);

  const handleCloseModal = useCallback(() => {
    if (!saving) {
      setPropertiesDrawer(null);
      onClose();
    }
  }, [onClose, saving]);

  const handleRetry = useCallback(() => {
    void loadRelationships();
  }, [loadRelationships]);

  const refreshRelationships = useCallback(async () => {
    if (!brandId || !item) {
      return;
    }

    try {
      const tree = await menuItemService.getItemRelationships(brandId, item.itemId);
      childRelationshipCache.current.clear();
      setRelationship(tree);
      setPendingViewportAction('center-root');
    } catch (err) {
      console.error('Failed to refresh item relationships', err);
      notifications.show({
        color: 'red',
        title: 'Unable to refresh relationships',
        message: 'An error occurred while refreshing the relationships graph.',
      });
    }
  }, [brandId, item]);

  const selectionTitle =
    groupSelection?.mode === 'modifier' ? 'Add modifier group' : 'Add item set group';

  const handleToggleMaximize = useCallback(() => {
    if (!reactFlowInstance || !flowContainerRef.current) {
      setIsMaximized((prev) => !prev);
      setPendingViewportAction('center-root');
      return;
    }

    const { viewport } = reactFlowInstance.toObject();
    const prevRect = flowContainerRef.current.getBoundingClientRect();
    const zoom = viewport?.zoom ?? 1;
    const currentCenterX = (-viewport?.x + prevRect.width / 2) / zoom;
    const currentCenterY = (-viewport?.y + prevRect.height / 2) / zoom;

    setIsMaximized((prev) => !prev);

    const applyViewport = () => {
      const containerEl = flowContainerRef.current;
      if (!containerEl) {
        return;
      }
      const nextRect = containerEl.getBoundingClientRect();
      const nextX = -(currentCenterX * zoom - nextRect.width / 2);
      const nextY = -(currentCenterY * zoom - nextRect.height / 2);
      reactFlowInstance.setViewport({ x: nextX, y: nextY, zoom });
    };

    requestAnimationFrame(() => {
      requestAnimationFrame(applyViewport);
    });
  }, [reactFlowInstance]);

  const handleAutoLayout = useCallback(() => {
    rebuildGraph();
  }, [rebuildGraph]);

  const flowContainerStyles = useMemo<CSSProperties>(() => {
    if (isMaximized) {
      return {
        flexGrow: 1,
        flexShrink: 1,
        minHeight: 0,
        minWidth: 0,
        overflow: 'hidden',
        display: 'flex',
        height: '100%',
      };
    }

    return {
      flexGrow: 1,
      flexShrink: 1,
      minHeight: 360,
      maxHeight: '60vh',
      height: 'min(60vh, 520px)',
      minWidth: 0,
      overflow: 'hidden',
      display: 'flex',
    };
  }, [isMaximized]);

  return (
    <>
      <Modal
        opened={opened}
        onClose={handleCloseModal}
        size={isMaximized ? '100%' : 'xl'}
        centered
        fullScreen={isMaximized}
        title={
          <Stack gap={4} style={{ minWidth: 0 }}>
            <Text fw={600}>Manage item relationships</Text>
            {item && (
              <Text size="sm" c="dimmed">
                {item.itemName ?? item.itemCode}
              </Text>
            )}
          </Stack>
        }
        styles={{
          content: {
            display: 'flex',
            flexDirection: 'column',
            ...(isMaximized ? { height: '100%' } : {}),
          },
          body: {
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0,
            height: isMaximized ? '100%' : 'auto',
            padding: 'var(--mantine-spacing-md)',
          },
        }}
        overlayProps={{ opacity: 0.15 }}
      >
        {loading ? (
          <CenterLoader message="Loading item relationships" />
        ) : error ? (
          <Stack gap="sm">
            <Alert color="red" icon={<IconAlertCircle size={16} />}>
              {error}
            </Alert>
            <Group justify="flex-end">
              <Button
                variant="light"
                leftSection={<IconRefresh size={16} />}
                onClick={handleRetry}
              >
                Retry
              </Button>
            </Group>
          </Stack>
        ) : relationship ? (
          <Stack
            gap="md"
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
            }}
          >
            <Group justify="space-between" align="center">
              <SegmentedControl
                data={CONTEXT_OPTIONS}
                value={activeContext}
                onChange={(value) => setActiveContext(value as 'inStore' | 'online')}
                disabled={saving}
              />
              <Group gap="xs">
                <Tooltip label="Auto layout" withArrow>
                  <ActionIcon
                    variant="light"
                    color="gray"
                    onClick={handleAutoLayout}
                    disabled={saving || !relationship}
                    aria-label="Run auto layout"
                  >
                    <IconWand size={16} />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label={isMaximized ? 'Exit full screen' : 'Maximize'} withArrow>
                  <ActionIcon
                    variant="light"
                    color="gray"
                    onClick={handleToggleMaximize}
                    disabled={saving}
                    aria-label={isMaximized ? 'Exit full screen' : 'Maximize modal'}
                  >
                    {isMaximized ? <IconArrowsMinimize size={16} /> : <IconArrowsMaximize size={16} />}
                  </ActionIcon>
                </Tooltip>
                <Button
                  variant="light"
                  color="gray"
                  leftSection={<IconRefresh size={16} />}
                  onClick={handleRetry}
                  disabled={saving}
                >
                  Reload
                </Button>
              </Group>
            </Group>
            <Box
              ref={flowContainerRef}
              style={flowContainerStyles}
            >
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                proOptions={{ hideAttribution: true }}
                onInit={setReactFlowInstance}
                fitViewOptions={fitViewOptions}
                style={{ flexGrow: 1, minHeight: 0, width: '100%', height: '100%' }}
              >
                <Background gap={16} size={1} />
                <Controls position="bottom-right" showInteractive={false} />
              </ReactFlow>
            </Box>
            <Group
              justify="space-between"
              style={{ marginTop: 'auto', paddingBottom: 'var(--mantine-spacing-sm)' }}
            >
              <Button variant="subtle" onClick={handleCloseModal} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={() => void handleSave()} loading={saving} disabled={saving}>
                Save changes
              </Button>
            </Group>
          </Stack>
        ) : (
          <CenterLoader message="Loading item relationships" />
        )}
      </Modal>
      <Modal
        opened={groupSelection !== null}
        onClose={() => {
          if (!saving) {
            setGroupSelection(null);
            setSelectedGroupId(null);
          }
        }}
        title={selectionTitle}
        centered
        size="md"
      >
        <Stack gap="sm">
          {selectionOptions.length === 0 ? (
            <Alert color="yellow" icon={<IconAlertCircle size={16} />}>
              {groupSelection?.mode === 'modifier'
                ? 'All modifier groups for this context are already linked.'
                : 'All item set groups for this context are already linked.'}
            </Alert>
          ) : (
            <Select
              data={selectionOptions}
              label={groupSelection?.mode === 'modifier' ? 'Modifier group' : 'Item set group'}
              placeholder="Select a group"
              searchable
              nothingFoundMessage="No groups available"
              value={selectedGroupId ?? undefined}
              onChange={(value) => setSelectedGroupId(value)}
            />
          )}
          <Group justify="flex-end">
            <Button
              variant="subtle"
              onClick={() => {
                if (!saving) {
                  setGroupSelection(null);
                  setSelectedGroupId(null);
                }
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleGroupSelectionConfirm()}
              disabled={selectionOptions.length === 0 || !selectedGroupId || saving}
            >
              Add
            </Button>
          </Group>
        </Stack>
      </Modal>
      <NodePropertiesDrawer
        state={propertiesDrawer}
        brandId={brandId}
        onClose={() => setPropertiesDrawer(null)}
        onAfterSave={refreshRelationships}
        onModifierGroupUpdated={handleModifierGroupUpdated}
      />
    </>
  );
};
