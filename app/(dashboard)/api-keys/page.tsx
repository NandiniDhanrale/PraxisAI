"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Badge } from "@/components/ui";

type ApiKey = {
  id: string;
  name: string;
  keyPrefix: string;
  isActive: boolean;
  createdAt: string;
  lastUsedAt?: string;
};

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [name, setName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const userId = "local-user";

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    const res = await fetch(`/api/api-keys?userId=${userId}`);
    if (res.ok) {
      const data = await res.json();
      setKeys(data.keys ?? []);
    }
  };

  const createKey = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId, name })
      });
      if (res.ok) {
        const data = await res.json();
        setNewKey(data.key);
        setName("");
        fetchKeys();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">API Keys</h1>
        <p className="text-sm text-gray-500">Manage your API keys for programmatic access.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create New Key</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 max-w-md">
            <Input placeholder="My App Key" value={name} onChange={setName} />
            <Button onClick={createKey} disabled={loading || !name}>
              Generate
            </Button>
          </div>
          {newKey && (
            <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4">
              <p className="text-sm font-medium text-green-800">Your API key (save it now, it won't be shown again):</p>
              <code className="mt-2 block rounded bg-white p-2 text-sm font-mono break-all">{newKey}</code>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Keys</CardTitle>
        </CardHeader>
        <CardContent>
          {keys.length === 0 ? (
            <p className="text-sm text-gray-500">No API keys yet.</p>
          ) : (
            <div className="space-y-3">
              {keys.map((k) => (
                <div key={k.id} className="flex items-center justify-between rounded border p-3">
                  <div>
                    <p className="font-medium">{k.name}</p>
                    <p className="text-xs text-gray-500">
                      {k.keyPrefix}... &middot; Created {new Date(k.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant={k.isActive ? "success" : "destructive"}>
                    {k.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>SDK Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="rounded-lg bg-gray-900 p-4 text-sm text-white overflow-x-auto">
{`import { PraxisClient } from "@praxisai/sdk";

const client = new PraxisClient({
  baseUrl: "https://your-app.com",
  apiKey: "pxai_..."
});

const result = await client.query({
  plugin: "structural-eng-v1",
  query: "What's the minimum concrete cover?"
});

console.log(result.answer);
console.log(result.citations);`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
