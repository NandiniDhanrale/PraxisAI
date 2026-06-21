"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Textarea } from "@/components/ui";
import { TreeEditor } from "@/components/tree-editor";

type Plugin = {
  id: string;
  name: string;
  slug: string;
  domain: string;
  systemPrompt: string;
  citationMode: string;
};

export default function PluginsPage() {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [domain, setDomain] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("You are a helpful expert assistant.");
  const [activeTab, setActiveTab] = useState<"list" | "create" | "tree">("list");

  const createPlugin = async () => {
    const res = await fetch("/api/plugins", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, slug, domain, systemPrompt, userId: "local-user" })
    });
    if (res.ok) {
      const data = await res.json();
      setPlugins([...plugins, { id: data.id, name, slug, domain, systemPrompt, citationMode: "strict" }]);
      setName("");
      setSlug("");
      setDomain("");
      setActiveTab("list");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Plugins</h1>
        <p className="text-sm text-gray-500">Create and manage expert plugins.</p>
      </div>

      <div className="flex gap-2">
        <Button variant={activeTab === "list" ? "default" : "outline"} onClick={() => setActiveTab("list")}>
          All Plugins
        </Button>
        <Button variant={activeTab === "create" ? "default" : "outline"} onClick={() => setActiveTab("create")}>
          Create Plugin
        </Button>
        {selectedPlugin && (
          <Button variant={activeTab === "tree" ? "default" : "outline"} onClick={() => setActiveTab("tree")}>
            Edit Tree: {selectedPlugin.name}
          </Button>
        )}
      </div>

      {activeTab === "list" && (
        <div className="space-y-3">
          {plugins.length === 0 ? (
            <Card>
              <CardContent>
                <p className="text-sm text-gray-500">No plugins yet. Create one to get started.</p>
              </CardContent>
            </Card>
          ) : (
            plugins.map((p) => (
              <Card key={p.id}>
                <CardHeader>
                  <CardTitle>{p.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Slug: {p.slug}</p>
                      <p className="text-sm text-gray-600">Domain: {p.domain || "General"}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedPlugin(p);
                        setActiveTab("tree");
                      }}
                    >
                      Edit Tree
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {activeTab === "create" && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Plugin</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-w-md">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Name</label>
                <Input placeholder="Structural Engineering" value={name} onChange={setName} />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Slug</label>
                <Input placeholder="structural-eng-v1" value={slug} onChange={setSlug} />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Domain</label>
                <Input placeholder="Civil Engineering" value={domain} onChange={setDomain} />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">System Prompt</label>
                <Textarea value={systemPrompt} onChange={setSystemPrompt} rows={4} />
              </div>
              <Button onClick={createPlugin}>Create Plugin</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "tree" && selectedPlugin && (
        <Card>
          <CardHeader>
            <CardTitle>Decision Tree: {selectedPlugin.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <TreeEditor pluginSlug={selectedPlugin.slug} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
