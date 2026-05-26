export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-3xl font-semibold tracking-tight">PraxisAI</h1>
      <p className="mt-3 text-neutral-700">
        Turn a generalist AI into a verified specialist in seconds.
      </p>
      <div className="mt-6 rounded-lg border p-4 text-sm">
        <p className="font-medium">API</p>
        <p className="mt-1">
          POST <code className="rounded bg-neutral-100 px-1">/api/v1/query</code>
        </p>
      </div>
      <div className="mt-4 text-sm">
        <a className="underline" href="/sandbox">
          Open sandbox
        </a>
      </div>
    </main>
  );
}
