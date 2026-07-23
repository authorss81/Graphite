# Manual Work Required

## Phase 10 — Real Engine Implementations

### 10.2 — Real AI Embeddings (transformers.js)
- **Status**: Code implemented, package installed (`@xenova/transformers`)
- **What it does**: Replaces hash-based fake embeddings with real `Xenova/all-MiniLM-L6-v2` transformer model
- **Manual work**: First load will download ~23MB model weights (cached in IndexedDB after first use)
- **Note**: Falls back to hash-based embedding if WASM/WebGPU unavailable

### 10.3 — Real AI Assistant (LLM streaming + RAG)
- **Status**: Code implemented with streaming via `AsyncGenerator`
- **For full functionality**: Install [Ollama](https://ollama.ai) locally:
  1. Run `ollama pull llama3` (or any model)
  2. Ensure Ollama runs on `localhost:11434`
  3. The AI panel will auto-detect and stream responses from Ollama
- **Fallback**: Keyword-based response engine when no LLM server available

### 10.5 — Real Git Diff Viewer
- **Status**: Code implemented (`getGitDiff` in aiService.ts)
- **Limitation**: Current implementation does file content comparison across commits rather than real git diff algorithm
- **To make fully real**: Verify isomorphic-git's `diff` API works in your isomorphic-git version

### 10.11 — Real Mermaid/KaTeX Rendering
- **Status**: Installed `mermaid` and `katex` packages
- **Manual work needed**: Add KaTeX CSS import for proper rendering:
  ```tsx
  // In App.tsx or index.tsx:
  import "katex/dist/katex.min.css";
  ```
  Or add to `index.html`:
  ```html
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
  ```
- **Mermaid**: Uses dynamic import, works out of the box with dark theme

### 10.9 — Interactive Slash Embeds
- **Status**: Mermaid/KaTeX blocks now render live (see 10.11)
- **Manual work**: Test all slash commands in the editor to ensure they work

### 10.10 — Real Publish/Share (Server)
- **Status**: Requires Supabase backend setup
- **Manual work**:
  1. Create a `published_documents` table in Supabase:
     ```sql
     CREATE TABLE published_documents (
       id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
       doc_id TEXT NOT NULL,
       title TEXT NOT NULL,
       content TEXT NOT NULL,
       created_at TIMESTAMPTZ DEFAULT now(),
       views INTEGER DEFAULT 0
     );
     ```
  2. Enable RLS with public read policy
  3. Update `PUBLISH_URL` in the publish modal to point to your hosting

### Phase 10 Summary
| Item | Status | Manual Steps |
|------|--------|-------------|
| 10.1 Yjs | ✅ Already done (Phase 18.5) | — |
| 10.2 Embeddings | ✅ Code + package | Model downloads on first use |
| 10.3 AI streaming | ✅ Code | Install Ollama for full functionality |
| 10.4 Git always-on | ✅ Code | — |
| 10.5 Git diff | ⚠️ Partial | Verify isomorphic-git diff API |
| 10.6 Team Workspace | ❌ Server-side | Requires Supabase RLS + backend |
| 10.7 Plugin Marketplace | ❌ Major effort | Sandboxed iframe plugin API needed |
| 10.8 Kanban | ✅ Code | — |
| 10.9 Slash Embeds | ✅ Code | Test all slash commands |
| 10.10 Publish/Share | ❌ Server-side | Requires Supabase table + endpoint |
| 10.11 Mermaid/KaTeX | ✅ Code + packages | Add KaTeX CSS import |
| 10.12 Audio Recording | ✅ Code | — |
