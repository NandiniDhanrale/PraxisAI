"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Textarea, Badge } from "@/components/ui";

type ExpertResponse = {
  expert: string;
  response: string;
  round: number;
};

type CollaborationResult = {
  mode: string;
  rounds: ExpertResponse[];
  consensus?: string;
  finalAnswer: string;
};

export default function CollaborationPage() {
  const [query, setQuery] = useState("What is the minimum concrete cover for severe exposure?");
  const [experts, setExperts] = useState("structural-eng-v1, material-science-v1");
  const [mode, setMode] = useState<"debate" | "consensus" | "review">("consensus");
  const [result, setResult] = useState<CollaborationResult | null>(null);
  const [busy, setBusy] = useState(false);

  const runCollaboration = async () => {
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/v1/collaborate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          query,
          experts: experts.split(",").map((s) => s.trim()).filter(Boolean),
          mode
        })
      });
      if (res.ok) {
        setResult(await res.json());
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Multi-Expert Collaboration</h1>
        <p className="text-sm text-gray-500">Put multiple expert plugins in a room to debate, reach consensus, or review.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Setup</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-w-2xl">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Query</label>
              <Textarea value={query} onChange={setQuery} rows={2} />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Expert slugs (comma-separated)</label>
              <Input value={experts} onChange={setExperts} placeholder="expert-1, expert-2" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Mode</label>
              <div className="flex gap-2">
                {(["debate", "consensus", "review"] as const).map((m) => (
                  <Button
                    key={m}
                    variant={mode === m ? "default" : "outline"}
                    onClick={() => setMode(m)}
                  >
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
            <Button onClick={runCollaboration} disabled={busy}>
              {busy ? "Running..." : "Run Collaboration"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Result ({result.mode} mode)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {result.rounds.map((r, i) => (
                <div key={i} className="rounded border p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge>{r.expert}</Badge>
                    <span className="text-xs text-gray-500">Round {r.round}</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{r.response}</p>
                </div>
              ))}
              {result.consensus && (
                <div className="rounded-lg border-2 border-green-200 bg-green-50 p-4">
                  <h3 className="font-medium text-green-800 mb-2">Consensus</h3>
                  <p className="text-sm whitespace-pre-wrap">{result.consensus}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Modes Explained</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded border p-3">
              <h4 className="font-medium">Debate</h4>
              <p className="text-xs text-gray-600 mt-1">Experts argue across multiple rounds, revise positions based on each other&apos;s input.</p>
            </div>
            <div className="rounded border p-3">
              <h4 className="font-medium">Consensus</h4>
              <p className="text-xs text-gray-600 mt-1">All experts answer once, a moderator synthesizes the final response.</p>
            </div>
            <div className="rounded border p-3">
              <h4 className="font-medium">Review</h4>
              <p className="text-xs text-gray-600 mt-1">Lead expert answers, others critique and improve the response.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
