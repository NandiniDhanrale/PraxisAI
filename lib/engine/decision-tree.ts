import { loadDecisionTree } from "./knowledge-store";

export type TreeNode = {
  id: string;
  type: "condition" | "question" | "action";
  label: string;
  config: Record<string, unknown>;
};

export type TreeEdge = {
  id: string;
  source: string;
  target: string;
  label?: string;
};

export type TreeData = {
  nodes: TreeNode[];
  edges: TreeEdge[];
};

export type DecisionPathStep = {
  step: number;
  node: string;
  label: string;
  result: string;
};

export async function runDecisionTree(args: {
  plugin: string;
  query: string;
  parameters?: Record<string, string>;
}): Promise<{ decisionPath: DecisionPathStep[]; actionNode?: TreeNode }> {
  const tree = await loadDecisionTree(args.plugin);
  if (!tree || tree.nodes.length === 0) {
    return {
      decisionPath: [{ step: 1, node: "start", label: "Start", result: "no tree configured" }]
    };
  }

  const decisionPath: DecisionPathStep[] = [];
  let currentNodeId = findRootNode(tree);
  let step = 1;

  while (currentNodeId) {
    const node = tree.nodes.find((n) => n.id === currentNodeId);
    if (!node) break;

    if (node.type === "action") {
      decisionPath.push({
        step,
        node: node.id,
        label: node.label,
        result: "action reached"
      });
      return { decisionPath, actionNode: node };
    }

    if (node.type === "condition") {
      const conditionKey = (node.config.conditionKey as string) ?? "default";
      const paramValue = args.parameters?.[conditionKey] ?? extractFromQuery(args.query, conditionKey);
      const nextEdge = tree.edges.find(
        (e) => e.source === node.id && (!e.label || e.label.toLowerCase() === paramValue.toLowerCase())
      );

      decisionPath.push({
        step,
        node: node.id,
        label: node.label,
        result: paramValue || "default"
      });

      currentNodeId = nextEdge?.target ?? findDefaultEdge(tree, node.id);
      step++;
    } else if (node.type === "question") {
      const searchTerms = (node.config.searchTerms as string[]) ?? [];
      const matched = searchTerms.some((term) =>
        args.query.toLowerCase().includes(term.toLowerCase())
      );

      decisionPath.push({
        step,
        node: node.id,
        label: node.label,
        result: matched ? "matched" : "not matched"
      });

      const nextEdge = tree.edges.find(
        (e) => e.source === node.id && (matched ? e.label === "yes" : e.label === "no")
      );
      currentNodeId = nextEdge?.target ?? findDefaultEdge(tree, node.id);
      step++;
    } else {
      break;
    }
  }

  return { decisionPath };
}

function findRootNode(tree: TreeData): string | null {
  const targetIds = new Set(tree.edges.map((e) => e.target));
  const root = tree.nodes.find((n) => !targetIds.has(n.id));
  return root?.id ?? tree.nodes[0]?.id ?? null;
}

function findDefaultEdge(tree: TreeData, nodeId: string): string | null {
  return tree.edges.find((e) => e.source === nodeId && (!e.label || e.label === "default"))?.target ?? null;
}

function extractFromQuery(query: string, key: string): string {
  const keywords: Record<string, string[]> = {
    exposure: ["severe", "moderate", "mild", "aggressive", " benign"],
    load: ["dead", "live", "wind", "seismic", "dynamic"],
    type: ["beam", "column", "slab", "footing", "wall"],
    material: ["concrete", "steel", "timber", "masonry"]
  };

  const terms = keywords[key.toLowerCase()] ?? [];
  for (const term of terms) {
    if (query.toLowerCase().includes(term)) return term.trim();
  }
  return "";
}
