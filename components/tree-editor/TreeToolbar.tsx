"use client";

import { useState } from "react";
import { useTreeEditorStore } from "@/lib/tree-editor/store";

export function TreeToolbar({ pluginSlug }: { pluginSlug: string }) {
  const { getTreeData, loadTree, clearTree } = useTreeEditorStore();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const saveTree = async () => {
    setSaving(true);
    try {
      const data = getTreeData();
      const res = await fetch(`/api/plugins/${encodeURIComponent(pluginSlug)}/tree`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error(await res.text());
    } finally {
      setSaving(false);
    }
  };

  const loadTreeFromServer = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/plugins/${encodeURIComponent(pluginSlug)}/tree`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      if (data.tree) {
        loadTree(data.tree.nodes ?? [], data.tree.edges ?? []);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={saveTree}
        disabled={saving}
        className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save tree"}
      </button>
      <button
        onClick={loadTreeFromServer}
        disabled={loading}
        className="rounded border px-3 py-1.5 text-xs font-medium disabled:opacity-50"
      >
        {loading ? "Loading..." : "Load tree"}
      </button>
      <button
        onClick={clearTree}
        className="rounded border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
      >
        Clear
      </button>
    </div>
  );
}
