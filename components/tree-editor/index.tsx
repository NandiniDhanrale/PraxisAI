"use client";

import { TreeEditorCanvas } from "./TreeEditorCanvas";
import { NodePalette } from "./NodePalette";
import { NodeEditor } from "./NodeEditor";
import { TreeToolbar } from "./TreeToolbar";

export function TreeEditor({ pluginSlug }: { pluginSlug: string }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <NodePalette />
        <TreeToolbar pluginSlug={pluginSlug} />
      </div>
      <TreeEditorCanvas />
      <NodeEditor />
    </div>
  );
}
