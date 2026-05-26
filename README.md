# PraxisAI

Local dev:

1) Install deps: `npm install`
2) Run dev server: `npm run dev`
3) API endpoint: `POST /api/v1/query`

Environment (optional):

- `OPENAI_API_KEY` to enable real embeddings (otherwise a deterministic fallback embedding is used).
- `OPENAI_EMBEDDING_MODEL` (default: `text-embedding-3-small`)

Knowledge upload:

- Text: `POST /api/plugins/:plugin/documents` (JSON `{ fileName, text }`)
- PDF: `POST /api/plugins/:plugin/documents/pdf` (multipart form field `file`)

SDK:

- Build: `npm run sdk:build`
