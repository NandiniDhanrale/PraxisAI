import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      <nav className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-xl font-bold tracking-tight">PraxisAI</span>
          <div className="flex items-center gap-4">
            <Link href="/sandbox" className="text-sm text-gray-600 hover:text-gray-900">
              Sandbox
            </Link>
            <Link href="/analytics" className="text-sm text-gray-600 hover:text-gray-900">
              Dashboard
            </Link>
          </div>
        </div>
      </nav>

      <section className="mx-auto max-w-4xl px-6 py-24 text-center">
        <h1 className="text-5xl font-bold tracking-tight text-gray-900">
          Expert Brains for AI Agents
        </h1>
        <p className="mt-6 text-lg text-gray-600">
          Turn a generalist AI into a verified specialist in seconds. Upload domain knowledge,
          build expert reasoning, and get cited answers with one line of code.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link
            href="/sandbox"
            className="rounded-lg bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-gray-800"
          >
            Try the Sandbox
          </Link>
          <a
            href="https://github.com/NandiniDhanrale/PraxisAI"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-gray-300 px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            View on GitHub
          </a>
        </div>
      </section>

      <section className="border-t bg-gray-50">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-2xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="rounded-lg border bg-white p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold">
                1
              </div>
              <h3 className="mt-4 font-semibold">Upload Knowledge</h3>
              <p className="mt-2 text-sm text-gray-600">
                Upload PDFs or text documents. They get chunked, embedded, and indexed for
                vector search automatically.
              </p>
            </div>
            <div className="rounded-lg border bg-white p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-purple-600 font-bold">
                2
              </div>
              <h3 className="mt-4 font-semibold">Build Reasoning</h3>
              <p className="mt-2 text-sm text-gray-600">
                Use the visual decision tree editor to define expert reasoning logic.
                Condition, question, and action nodes.
              </p>
            </div>
            <div className="rounded-lg border bg-white p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600 font-bold">
                3
              </div>
              <h3 className="mt-4 font-semibold">Query with Citations</h3>
              <p className="mt-2 text-sm text-gray-600">
                One API call. Get expert-level answers with page-number citations and
                confidence scores. No hallucinations.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-2xl font-bold text-center mb-8">Core Features</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {[
              { title: "Hot-Swap Plugins", desc: "Change one string to swap your AI expert. No retraining." },
              { title: "RAG Pipeline", desc: "PDF ingestion, chunking, embeddings, and vector search built in." },
              { title: "Decision Trees", desc: "Visual flowchart editor for expert reasoning logic." },
              { title: "Citation Engine", desc: "Every answer cites its sources with page numbers." },
              { title: "Hallucination Guard", desc: "Refuses to answer when no real sources are found." },
              { title: "Multi-Expert Collaboration", desc: "Debate, consensus, and review modes across experts." }
            ].map((f) => (
              <div key={f.title} className="rounded-lg border p-4">
                <h3 className="font-medium">{f.title}</h3>
                <p className="mt-1 text-sm text-gray-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t bg-gray-900 text-white">
        <div className="mx-auto max-w-4xl px-6 py-16 text-center">
          <h2 className="text-2xl font-bold">One Line of Code</h2>
          <pre className="mt-6 rounded-lg bg-gray-800 p-4 text-left text-sm overflow-x-auto">
{`import { PraxisClient } from "@praxisai/sdk";

const lexic = new PraxisClient({ baseUrl: "https://your-app.com" });

const answer = await lexic.query({
  plugin: "structural-eng-v1",
  query: "What's the minimum concrete cover?"
});

console.log(answer.citations);
// → [{ document: "IS 456:2000", page: 47, section: "26.4.2" }]`}
          </pre>
        </div>
      </section>

      <footer className="border-t py-8 text-center text-sm text-gray-500">
        Built at HackX 2026
      </footer>
    </main>
  );
}
