"use client";

import { useCallback, useMemo } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { CustomNode } from "./nodes/CustomNode";
import { useTreeEditorStore } from "@/lib/tree-editor/store";
import { editorToFlow, flowToEditor } from "@/lib/tree-editor/transform";

const nodeTypes = { custom: CustomNode };

export function TreeEditorCanvas() {
  const { nodes: editorNodes, edges: editorEdges, addEdge: storeAddEdge, selectNode } = useTreeEditorStore();

  const { flowNodes, flowEdges } = useMemo(
    () => editorToFlow(editorNodes, editorEdges),
    [editorNodes, editorEdges]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(flowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowEdges);

  const onConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target) {
        storeAddEdge(connection.source, connection.target);
        setEdges((eds) => addEdge({ ...connection, animated: false, style: { strokeWidth: 2 } }, eds));
      }
    },
    [storeAddEdge, setEdges]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: { id: string }) => {
      selectNode(node.id);
    },
    [selectNode]
  );

  const onPaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  return (
    <div className="h-[500px] w-full rounded-lg border bg-gray-50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        className="bg-gray-50"
      >
        <Controls />
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
      </ReactFlow>
    </div>
  );
}
