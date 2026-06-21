"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { getNodeColor } from "@/lib/tree-editor/transform";

type CustomNodeProps = {
  data: {
    label: string;
    nodeType: string;
    config: Record<string, unknown>;
  };
  selected?: boolean;
};

function CustomNodeComponent({ data, selected }: CustomNodeProps) {
  const color = getNodeColor(data.nodeType);
  const isAction = data.nodeType === "action";

  return (
    <div
      className={`rounded-lg border-2 bg-white px-4 py-3 shadow-md transition-all ${
        selected ? "shadow-lg scale-105" : ""
      }`}
      style={{ borderColor: color, minWidth: 140 }}
    >
      {!isAction && <Handle type="target" position={Position.Top} className="!bg-gray-400" />}
      <div className="flex items-center gap-2">
        <span
          className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white"
          style={{ backgroundColor: color }}
        >
          {data.nodeType === "condition" ? "?" : data.nodeType === "question" ? "Q" : "!"}
        </span>
        <span className="text-sm font-medium">{data.label}</span>
      </div>
      {data.nodeType === "condition" && (
        <div className="mt-1 text-xs text-gray-500">
          Key: {(data.config.conditionKey as string) ?? "default"}
        </div>
      )}
      {data.nodeType === "question" && (
        <div className="mt-1 text-xs text-gray-500">
          Terms: {((data.config.searchTerms as string[]) ?? []).join(", ") || "none"}
        </div>
      )}
      {isAction && (
        <div className="mt-1 text-xs text-gray-500">
          RAG: {(data.config.ragSearch as boolean) ?? true ? "on" : "off"}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-gray-400" />
    </div>
  );
}

export const CustomNode = memo(CustomNodeComponent);
