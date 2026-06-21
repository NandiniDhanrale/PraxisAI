"use client";

import { useTreeEditorStore, type EditorNodeType } from "@/lib/tree-editor/store";

export function NodePalette() {
  const addNode = useTreeEditorStore((s) => s.addNode);

  const nodeTypes: Array<{ type: EditorNodeType; label: string; color: string; icon: string }> = [
    { type: "condition", label: "Condition", color: "#3b82f6", icon: "?" },
    { type: "question", label: "Question", color: "#8b5cf6", icon: "Q" },
    { type: "action", label: "Action", color: "#10b981", icon: "!" }
  ];

  return (
    <div className="flex gap-2">
      {nodeTypes.map((nt) => (
        <button
          key={nt.type}
          onClick={() => addNode(nt.type, { x: 250 + Math.random() * 200, y: 100 + Math.random() * 200 })}
          className="flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-80"
          style={{ backgroundColor: nt.color }}
        >
          <span className="font-bold">{nt.icon}</span>
          {nt.label}
        </button>
      ))}
    </div>
  );
}
