"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { TreeEditor } from "@/components/tree-editor";

type MetricPoint = { t: number };
type UploadedDoc = { documentId: string; fileName: string; chunks?: number };

export default function SandboxPage() {
  const [plugin, setPlugin] = useState("demo-v1");
  const [fileName, setFileName] = useState("demo.txt");
  const [docText, setDocText] = useState("");
  const [prompt, setPrompt] = useState("What does the document say?");
  const [output, setOutput] = useState("");
  const [citations, setCitations] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<MetricPoint[]>([]);
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState<"query" | "tree">("query");
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const outputRef = useRef("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  const endpoint = useMemo(() => "/api/v1/query", []);

  const showStatus = (type: "success" | "error", message: string) => {
    setStatus({ type, message });
    setTimeout(() => setStatus(null), 4000);
  };

  const fetchDocs = useCallback(async () => {
    try {
      const res = await fetch(`/api/plugins/${encodeURIComponent(plugin)}/documents`);
      if (res.ok) {
        const data = await res.json();
        setUploadedDocs(data.documents ?? []);
      }
    } catch {}
  }, [plugin]);

  const uploadText = async () => {
    if (!docText.trim()) {
      showStatus("error", "Please enter some text to upload.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/plugins/${encodeURIComponent(plugin)}/documents`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fileName, text: docText })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      showStatus("success", `Uploaded "${fileName}" — ${data.chunks} chunks created.`);
      setDocText("");
      setFileName("document.txt");
      fetchDocs();
    } catch (err: any) {
      showStatus("error", err.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const uploadFile = async (file: File) => {
    setBusy(true);
    try {
      if (file.name.endsWith(".pdf")) {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch(`/api/plugins/${encodeURIComponent(plugin)}/documents/pdf`, {
          method: "POST",
          body: form
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "PDF upload failed");
        showStatus("success", `Uploaded "${file.name}" — ${data.chunks} chunks created.`);
      } else {
        const text = await file.text();
        const res = await fetch(`/api/plugins/${encodeURIComponent(plugin)}/documents`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ fileName: file.name, text })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload failed");
        showStatus("success", `Uploaded "${file.name}" — ${data.chunks} chunks created.`);
      }
      fetchDocs();
    } catch (err: any) {
      showStatus("error", err.message || "File upload failed");
    } finally {
      setBusy(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  const deleteDoc = async (docId: string) => {
    try {
      await fetch(`/api/plugins/${encodeURIComponent(plugin)}/documents?documentId=${docId}`, {
        method: "DELETE"
      });
      fetchDocs();
      showStatus("success", "Document deleted.");
    } catch {
      showStatus("error", "Failed to delete document.");
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
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(err.error || "Query failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      const emit = (evt: string, data: any) => {
        if (evt === "token") {
          outputRef.current += data.text;
          setOutput(outputRef.current);
          setMetrics((prev) => [...prev, { t: Date.now() }]);
        } else if (evt === "final") {
          setCitations(data.citations ?? []);
        } else if (evt === "error") {
          showStatus("error", data.message || "Query error");
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
    } catch (err: any) {
      showStatus("error", err.message || "Stream failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-lg font-bold">PraxisAI Sandbox</h1>
            <p className="text-xs text-gray-500">Upload knowledge, build reasoning trees, and query.</p>
          </div>
          <a href="/" className="text-sm text-gray-600 hover:text-gray-900">Home</a>
        </div>
      </div>

      <div className="mx-auto max-w-6xl p-6">
        {status && (
          <div className={`mb-4 rounded-lg border p-3 text-sm ${
            status.type === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}>
            {status.message}
          </div>
        )}

        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setActiveTab("query")}
            className={`rounded-md px-4 py-2 text-sm font-medium ${
              activeTab === "query" ? "bg-gray-900 text-white" : "bg-white text-gray-600 border hover:bg-gray-50"
            }`}
          >
            Query
          </button>
          <button
            onClick={() => setActiveTab("tree")}
            className={`rounded-md px-4 py-2 text-sm font-medium ${
              activeTab === "tree" ? "bg-gray-900 text-white" : "bg-white text-gray-600 border hover:bg-gray-50"
            }`}
          >
            Decision Tree
          </button>
        </div>

        {activeTab === "query" ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Knowledge Upload */}
            <section className="rounded-lg border bg-white p-4">
              <h2 className="font-medium">Knowledge</h2>
              <label className="mt-3 block text-xs text-gray-600">Plugin slug</label>
              <input
                className="mt-1 w-full rounded border px-3 py-2 text-sm"
                value={plugin}
                onChange={(e) => setPlugin(e.target.value)}
                onBlur={fetchDocs}
              />

              {/* File Upload Area */}
              <div
                className={`mt-4 flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition ${
                  dragOver ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-gray-400"
                }`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
              >
                <svg className="mb-2 h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-sm text-gray-600">Drop a file here or</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 rounded bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200"
                  disabled={busy}
                >
                  Browse files
                </button>
                <p className="mt-1 text-xs text-gray-400">Supports .txt and .pdf</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.pdf,.md,.csv"
                  className="hidden"
                  onChange={onFileChange}
                />
              </div>

              {/* Text Upload */}
              <div className="mt-4 border-t pt-4">
                <p className="mb-2 text-xs font-medium text-gray-600">Or paste text directly:</p>
                <label className="block text-xs text-gray-600">File name</label>
                <input
                  ref={textInputRef}
                  className="mt-1 w-full rounded border px-3 py-2 text-sm"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                />
                <label className="mt-2 block text-xs text-gray-600">Document text</label>
                <textarea
                  className="mt-1 h-32 w-full rounded border px-3 py-2 text-sm"
                  value={docText}
                  onChange={(e) => setDocText(e.target.value)}
                  placeholder="Paste your document text here..."
                />
                <button
                  disabled={busy || !docText.trim()}
                  className="mt-2 rounded bg-black px-3 py-2 text-sm text-white disabled:opacity-50"
                  onClick={uploadText}
                >
                  {busy ? "Uploading..." : "Upload text"}
                </button>
              </div>

              {/* Uploaded Documents List */}
              <div className="mt-4 border-t pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-medium text-gray-600">Uploaded Documents</h3>
                  <button onClick={fetchDocs} className="text-xs text-blue-600 hover:text-blue-800">Refresh</button>
                </div>
                {uploadedDocs.length === 0 ? (
                  <p className="mt-2 text-xs text-gray-400">No documents uploaded yet.</p>
                ) : (
                  <div className="mt-2 space-y-1">
                    {uploadedDocs.map((d) => (
                      <div key={d.documentId} className="flex items-center justify-between rounded border px-2 py-1.5 text-xs">
                        <span className="truncate">{d.fileName}</span>
                        <button
                          onClick={() => deleteDoc(d.documentId)}
                          className="ml-2 shrink-0 text-red-400 hover:text-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Query */}
            <section className="rounded-lg border bg-white p-4">
              <h2 className="font-medium">Query</h2>
              <label className="mt-3 block text-xs text-gray-600">Prompt</label>
              <textarea
                className="mt-1 h-24 w-full rounded border px-3 py-2 text-sm"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ask a question about your knowledge base..."
              />
              <button
                disabled={busy}
                className="mt-3 rounded bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-50"
                onClick={runStream}
              >
                {busy ? "Processing..." : "Stream answer"}
              </button>
              <div className="mt-4 rounded border bg-gray-50 p-3">
                <div className="text-xs font-medium text-gray-600">Output</div>
                <pre className="mt-2 whitespace-pre-wrap text-sm min-h-[60px]">
                  {output || <span className="text-gray-400">Response will appear here...</span>}
                </pre>
              </div>
            </section>

            {/* Citations */}
            <section className="md:col-span-2 rounded-lg border bg-white p-4">
              <h2 className="font-medium">Citations</h2>
              {citations.length === 0 ? (
                <p className="mt-2 text-xs text-gray-500">No citations yet.</p>
              ) : (
                <div className="mt-2 space-y-2">
                  {citations.map((c: any, i: number) => (
                    <div key={i} className="rounded border p-2 text-xs">
                      <span className="font-medium">{c.document}</span>
                      {c.page && <span className="ml-2 text-gray-500">p. {c.page}</span>}
                      {c.section && <span className="ml-2 text-gray-500">{c.section}</span>}
                      {c.score != null && (
                        <span className="ml-2 rounded bg-blue-100 px-1.5 py-0.5 text-blue-700">
                          {(c.score * 100).toFixed(1)}%
                        </span>
                      )}
                      {c.excerpt && <p className="mt-1 text-gray-600">{c.excerpt}</p>}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : (
          <div className="rounded-lg border bg-white p-6">
            <TreeEditor pluginSlug={plugin} />
          </div>
        )}
      </div>
    </main>
  );
}
