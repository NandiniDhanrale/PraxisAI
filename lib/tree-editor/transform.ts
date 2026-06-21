import type { EditorNode, EditorEdge } from "./store";

type FlowNode = {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    nodeType: string;
    config: Record<string, unknown>;
  };
};

type FlowEdge = {
  id: string;
  source: string;
  target: string;
  label?: string;
  animated?: boolean;
  style?: Record<string, unknown>;
};

export function editorToFlow(nodes: EditorNode[], edges: EditorEdge[]): { flowNodes: FlowNode[]; flowEdges: FlowEdge[] } {
  const flowNodes: FlowNode[] = nodes.map((n) => ({
    id: n.id,
    type: "custom",
    position: n.position,
    data: {
      label: n.label,
      nodeType: n.type,
      config: n.config
    }
  }));

  const flowEdges: FlowEdge[] = edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label,
    animated: false,
    style: { strokeWidth: 2 }
  }));

  return { flowNodes, flowEdges };
}

export function flowToEditor(flowNodes: FlowNode[], flowEdges: FlowEdge[]): { nodes: EditorNode[]; edges: EditorEdge[] } {
  const nodes: EditorNode[] = flowNodes.map((n) => ({
    id: n.id,
    type: (n.data.nodeType as EditorNode["type"]) ?? "condition",
    label: n.data.label,
    config: n.data.config ?? {},
    position: n.position
  }));

  const edges: EditorEdge[] = flowEdges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label
  }));

  return { nodes, edges };
}

export function getNodeColor(type: string): string {
  switch (type) {
    case "condition": return "#3b82f6";
    case "question": return "#8b5cf6";
    case "action": return "#10b981";
    default: return "#6b7280";
  }
}

export function getNodeIcon(type: string): string {
  switch (type) {
    case "condition": return "?";
    case "question": return "Q";
    case "action": return "!";
    default: return "O";
  }
}
