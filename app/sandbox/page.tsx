"use client";

import { useMemo, useRef, useState } from "react";

type MetricPoint = { t: number; acceptedDraftTokens?: number };

export default function SandboxPage() {
  const [plugin, setPlugin] = useState("demo-v1");
  const [fileName, setFileName] = useState("demo.txt");
  const [docText, setDocText] = useState("Put reference text here.\n\nThis becomes your knowledge base.");
  const [prompt, setPrompt] = useState("What does the document say?");
  const [output, setOutput] = useState("");
  const [citations, setCitations] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<MetricPoint[]>([]);
  const [busy, setBusy] = useState(false);
  const outputRef = useRef("");

  const endpoint = useMemo(() => "/api/v1/query", []);

  const uploadDoc = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/plugins/${encodeURIComponent(plugin)}/documents`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fileName, text: docText })
      });
      if (!res.ok) throw new Error(await res.text());
    } finally {
      setBusy(false);
    }
  };

  const runStream = async () => {
    setBusy(true);
    setOutput("");
    outputRef.current = "";
    setCitations([]);
    setMetrics([]);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "text/event-stream" },
        body: JSON.stringify({ plugin, query: prompt, stream: true })
      });
      if (!res.ok || !res.body) throw new Error(await res.text());

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      const emit = (evt: string, data: any) => {
        if (evt === "token") {
          outputRef.current += data.text;
          setOutput(outputRef.current);
          setMetrics((prev) => [...prev, { t: Date.now(), acceptedDraftTokens: data.metrics?.accepted_draft_tokens }]);
        } else if (evt === "final") {
          setCitations(data.citations ?? []);
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        while (true) {
          const idx = buf.indexOf("\n\n");
          if (idx === -1) break;
          const frame = buf.slice(0, idx);
          buf = buf.slice(idx + 2);
          let evt = "message";
          let dataStr = "";
          for (const line of frame.split("\n")) {
            if (line.startsWith("event:")) evt = line.slice("event:".length).trim();
            if (line.startsWith("data:")) dataStr += line.slice("data:".length).trim();
          }
          if (dataStr) emit(evt, JSON.parse(dataStr));
        }
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-2xl font-semibold">PraxisAI Sandbox</h1>
      <p className="mt-2 text-sm text-neutral-700">
        Upload a text document into a plugin knowledge base, then query it with SSE streaming.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <section className="rounded-lg border p-4">
          <h2 className="font-medium">Knowledge</h2>
          <label className="mt-3 block text-xs text-neutral-600">Plugin slug</label>
          <input className="mt-1 w-full rounded border px-3 py-2 text-sm" value={plugin} onChange={(e) => setPlugin(e.target.value)} />
          <label className="mt-3 block text-xs text-neutral-600">File name</label>
          <input className="mt-1 w-full rounded border px-3 py-2 text-sm" value={fileName} onChange={(e) => setFileName(e.target.value)} />
          <label className="mt-3 block text-xs text-neutral-600">Document text</label>
          <textarea className="mt-1 h-40 w-full rounded border px-3 py-2 text-sm" value={docText} onChange={(e) => setDocText(e.target.value)} />
          <button disabled={busy} className="mt-3 rounded bg-black px-3 py-2 text-sm text-white disabled:opacity-50" onClick={uploadDoc}>
            Upload document
          </button>
        </section>

        <section className="rounded-lg border p-4">
          <h2 className="font-medium">Query</h2>
          <label className="mt-3 block text-xs text-neutral-600">Prompt</label>
          <textarea className="mt-1 h-24 w-full rounded border px-3 py-2 text-sm" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
          <button disabled={busy} className="mt-3 rounded bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-50" onClick={runStream}>
            Stream answer
          </button>
          <div className="mt-4 rounded border bg-neutral-50 p-3">
            <div className="text-xs font-medium text-neutral-600">Output</div>
            <pre className="mt-2 whitespace-pre-wrap text-sm">{output}</pre>
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-lg border p-4">
        <h2 className="font-medium">Citations</h2>
        <pre className="mt-2 overflow-auto text-xs">{JSON.stringify(citations, null, 2)}</pre>
      </section>

      <section className="mt-6 rounded-lg border p-4">
        <h2 className="font-medium">Metrics (raw)</h2>
        <pre className="mt-2 overflow-auto text-xs">{JSON.stringify(metrics.slice(-50), null, 2)}</pre>
      </section>
    </main>
  );
}
