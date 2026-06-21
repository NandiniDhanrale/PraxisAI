"use client";

import { useState } from "react";
import { useTreeEditorStore } from "@/lib/tree-editor/store";

export function NodeEditor() {
  const { nodes, selectedNodeId, updateNode, removeNode } = useTreeEditorStore();
  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  if (!selectedNode) {
    return (
      <div className="rounded-lg border p-4 text-sm text-gray-500">
        Select a node to edit its properties.
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Edit Node</h3>
        <button
          onClick={() => removeNode(selectedNode.id)}
          className="text-xs text-red-500 hover:text-red-700"
        >
          Delete
        </button>
      </div>

      <div>
        <label className="block text-xs text-gray-600">Label</label>
        <input
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
          value={selectedNode.label}
          onChange={(e) => updateNode(selectedNode.id, { label: e.target.value })}
        />
      </div>

      <div>
        <label className="block text-xs text-gray-600">Type</label>
        <select
          className="mt-1 w-full rounded border px-2 py-1 text-sm"
          value={selectedNode.type}
          onChange={(e) => updateNode(selectedNode.id, { type: e.target.value as any })}
        >
          <option value="condition">Condition</option>
          <option value="question">Question</option>
          <option value="action">Action</option>
        </select>
      </div>

      {selectedNode.type === "condition" && (
        <div>
          <label className="block text-xs text-gray-600">Condition Key</label>
          <input
            className="mt-1 w-full rounded border px-2 py-1 text-sm"
            value={(selectedNode.config.conditionKey as string) ?? ""}
            onChange={(e) =>
              updateNode(selectedNode.id, {
                config: { ...selectedNode.config, conditionKey: e.target.value }
              })
            }
          />
        </div>
      )}

      {selectedNode.type === "question" && (
        <div>
          <label className="block text-xs text-gray-600">Search Terms (comma-separated)</label>
          <input
            className="mt-1 w-full rounded border px-2 py-1 text-sm"
            value={((selectedNode.config.searchTerms as string[]) ?? []).join(", ")}
            onChange={(e) =>
              updateNode(selectedNode.id, {
                config: { ...selectedNode.config, searchTerms: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) }
              })
            }
          />
        </div>
      )}

      {selectedNode.type === "action" && (
        <>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="ragSearch"
              checked={(selectedNode.config.ragSearch as boolean) ?? true}
              onChange={(e) =>
                updateNode(selectedNode.id, {
                  config: { ...selectedNode.config, ragSearch: e.target.checked }
                })
              }
              className="rounded"
            />
            <label htmlFor="ragSearch" className="text-xs text-gray-600">
              Enable RAG search
            </label>
          </div>
          <div>
            <label className="block text-xs text-gray-600">Response Template</label>
            <textarea
              className="mt-1 w-full rounded border px-2 py-1 text-sm"
              rows={3}
              value={(selectedNode.config.responseTemplate as string) ?? ""}
              onChange={(e) =>
                updateNode(selectedNode.id, {
                  config: { ...selectedNode.config, responseTemplate: e.target.value }
                })
              }
            />
          </div>
        </>
      )}
    </div>
  );
}
