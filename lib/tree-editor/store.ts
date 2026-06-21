import { create } from "zustand";

export type EditorNodeType = "condition" | "question" | "action";

export type EditorNode = {
  id: string;
  type: EditorNodeType;
  label: string;
  config: Record<string, unknown>;
  position: { x: number; y: number };
};

export type EditorEdge = {
  id: string;
  source: string;
  target: string;
  label?: string;
};

type TreeEditorState = {
  nodes: EditorNode[];
  edges: EditorEdge[];
  selectedNodeId: string | null;
  addNode: (type: EditorNodeType, position: { x: number; y: number }) => void;
  updateNode: (id: string, updates: Partial<EditorNode>) => void;
  removeNode: (id: string) => void;
  addEdge: (source: string, target: string, label?: string) => void;
  removeEdge: (id: string) => void;
  selectNode: (id: string | null) => void;
  loadTree: (nodes: EditorNode[], edges: EditorEdge[]) => void;
  clearTree: () => void;
  getTreeData: () => { nodes: EditorNode[]; edges: EditorEdge[] };
};

let nodeCounter = 0;

export const useTreeEditorStore = create<TreeEditorState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,

  addNode: (type, position) => {
    const id = `node-${Date.now()}-${++nodeCounter}`;
    const defaults: Record<EditorNodeType, { label: string; config: Record<string, unknown> }> = {
      condition: { label: "New Condition", config: { conditionKey: "default" } },
      question: { label: "New Question", config: { searchTerms: [] } },
      action: { label: "New Action", config: { ragSearch: true, responseTemplate: "" } }
    };

    set((state) => ({
      nodes: [...state.nodes, { id, type, label: defaults[type].label, config: defaults[type].config, position }]
    }));
  },

  updateNode: (id, updates) => {
    set((state) => ({
      nodes: state.nodes.map((n) => (n.id === id ? { ...n, ...updates } : n))
    }));
  },

  removeNode: (id) => {
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== id),
      edges: state.edges.filter((e) => e.source !== id && e.target !== id),
      selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId
    }));
  },

  addEdge: (source, target, label) => {
    const id = `edge-${Date.now()}-${++nodeCounter}`;
    set((state) => ({
      edges: [...state.edges.filter((e) => !(e.source === source && e.label === label)), { id, source, target, label }]
    }));
  },

  removeEdge: (id) => {
    set((state) => ({
      edges: state.edges.filter((e) => e.id !== id)
    }));
  },

  selectNode: (id) => {
    set({ selectedNodeId: id });
  },

  loadTree: (nodes, edges) => {
    set({ nodes, edges, selectedNodeId: null });
  },

  clearTree: () => {
    set({ nodes: [], edges: [], selectedNodeId: null });
  },

  getTreeData: () => {
    const { nodes, edges } = get();
    return { nodes, edges };
  }
}));
