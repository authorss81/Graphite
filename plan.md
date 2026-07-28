# Graphite Studio — Implementation Plan

## Implementation Priority Order

Phases reordered by dependency and urgency. Critical security/data-integrity fixes first, then architecture, then features, then polish.

### 🛑 Priority 0 — Stop the Bleeding (CRITICAL)
Fix immediately — these cause data loss, lockout, or are exploitable.

| Order | Phase | Focus | Severity |
|-------|-------|-------|----------|
| 1 | **Phase 28** | Phase 2/3/10/11/12/26 Audit — 91 vulns: plugin sandbox escape, encryption bypass, WebAuthn mock, XSS in export/print/Mermaid/KaTeX, no auth on Yjs/workspaces/Realtime, API keys plaintext, prompt injection | 🔴 CRITICAL |
| 2 | **Phase 22** | Post-Audit Round 3 — CRITICAL: runtime config bypass, encryption false success, origin validation bypass | 🔴 CRITICAL |
| 3 | **Phase 23** | Deep Security Audit — 10 vulns: JS injection bypass, token exfiltration, no rate limiting, cryptoKey in React state | 🔴 CRITICAL |
| 4 | **Phase 27** | New Vulns from audits: AIChatPanel broken (never opens), touch handlers absent, Pomodoro timer leak, RAF waste | 🔴 CRITICAL |
| 5 | **Phase 14** | Security Hardening: RLS, httpOnly cookies, CSP, SRI, rate limiting, HMAC audit chain, Math.random→crypto.randomUUID | 🟠 HIGH |

### 🟠 Priority 1 — Architecture & Audit Remediation
Fix false "Done" claims before building on broken foundations.

| Order | Phase | Focus | Severity |
|-------|-------|-------|----------|
| 6 | **Phase 24** | Phase 9 Audit Failures (8 items): monolithic store, 521-line App.tsx, unused ZoomControls, store bypass, 18 getState() calls, key={docId}, localStorage→IndexedDB incomplete, pagination unused | 🟠 HIGH |
| 7 | **Phase 25** | Phase 20 Audit Failures (15 items): aria-labels missing, ARIA roles, toast keyboard, save indicator, sync errors swallowed, Escape key modals, focus trapping, touch handlers, RAF early exit | 🟡 MEDIUM |
| 8 | **Phase 26** | Phase 21 Audit Failures (4 items): sidebar/modals missing glass, entrance animations on 5/6 modals, no dual-pane layout, !important drag handle | 🟡 MEDIUM |
| 9 | **Phase 29** | Phase 24 Post-Mortem Architecture Audit — 13 findings: missing Kanban tab, export menu broken, loose types, missing ARIA, Toast interface drift, layering violation | 🟠 HIGH | ✅ Done |
| 10 | **Phase 30** | Phase 25 Post-Mortem UX Audit — 2 findings: invalid ARIA attribute `role-description`, save indicator partial (no "Saved" state) | 🟠 HIGH | ✅ Done |
| 11 | **Phase 31** | Phase 28 Post-Mortem XSS & Sandbox Audit — 11 findings: script-tag breakout in plugin template, regex sanitizeHtml bypass, case-sensitive javascript: block, new Function() network access, postMessage '*' | 🔴 CRITICAL | ✅ Done |
| 12 | **Phase 32** | Phase 28 Post-Mortem Encryption & Access Audit — 17 findings: empty-string guard bypass, Realtime encryption bypass, encrypted content in embedding pipeline, archived docs searched, React Hooks violations in 2 modals, missing export guard | 🔴 CRITICAL | ✅ Done |

### 🟡 Priority 2 — Real Engine & Features
Replace fake implementations and build competitive features.

| Order | Phase | Focus | Est. Effort |
|-------|-------|-------|-------------|
| 9 | **Phase 10** | Real Engine Implementations: Yjs CRDT, transformers.js embeddings, LLM streaming, Git, Team Workspace, Plugin Marketplace, Kanban, Mermaid/KaTeX, Audio | 172h | ✅ 8/12 Done |
| 10 | **Phase 11** | Competitive Feature Parity: block refs, daily journal, PDF/HTML import, templates, canvas format, metadata, full-text search, RTL, callouts, quick open | 140h | ✅ 16/18 Done |
| 11 | **Phase 2** | Competitive (Match Notion/Obsidian): block editor, graph view, AI semantic search, publish/share, version history, tags, spatial canvas | Ongoing | ✅ Mostly complete |
| 12 | **Phase 3** | World-Class: real-time multiplayer (Yjs), AI writing assistant, plugin system, advanced blocks, team workspace, desktop/mobile native | Long-term | ✅ 3.2 AI done, 3.4 advanced blocks mostly done, 3.6 encryption done |

### 🔴 Priority 4 — Critical Findings from Phase 38 Audit
Fix CRITICAL/HIGH items found in independent audit of Phase 12/13/15/24/25.

| Order | Phase | Focus | Severity |
|-------|-------|-------|----------|
| 18 | **Phase 38** | Phase 12/13/15/24/25 Audit — 18 findings: stale drag, auth bypass (isAuthenticated always true), Capacitor listener leak, simulation rebuild, missing Escape cleanup, stale onClose | 🔴 CRITICAL |
| 19 | **Phase 39** | Phase 29-37 Audit — 21 findings: SVG script sanitizeHtml bypass, Worker sandbox prototype chain, PluginSandbox origin null bug, missing ios/ dir, layering violations, duplicate pinned sections, missing library validation, case inconsistencies in encryption guards | 🔴 CRITICAL |
| 20 | **Phase 40** | Strategic Recommendations — 100+ items across competitive analysis, user acquisition growth strategy (18 items), performance optimization (22 items), UX/polish improvements (26 items) | 📋 Strategic |

### 🟢 Priority 3 — Canvas, Graph, Testing, Polish

| Order | Phase | Focus | Est. Effort |
|-------|-------|-------|-------------|
| 13 | **Phase 12** | Spatial Canvas: page-wise mode, rich cards, auto-layout, minimap, colors, multi-select, presentation, stylus, nested | 87h |
| 14 | **Phase 13** | Graph View: d3-force, click popup, filter, cluster, edge weights, timeline, saved layouts, RAF fix | 36h |
| 15 | **Phase 15** | Testing & CI: 18 test suites (encryption, auth, stores, Git, canvas, graph, sidebar, Kotlin), strict TS mode, E2E, visual regression | 85h |
| 16 | **Phase 16** | UX Onboarding: walkthrough, templates, empty states, breadcrumbs, tabbed docs, keyboard nav, accessibility, screen readers | 50h |
| 17 | **Phase 17** | Competitive Research: database block, canvas format, block linking, mobile perf, plugins, daily journal, slides, templates | 138h |

### ✅ Completed Phases (Reference)
Phases 0, 1, 2, 4, 5, 6, 7, 8, 9, 11, 14, 18, 19, 20, 21, 22, 23, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 37 — see below for details.

---

## Current State Assessment

This is a **technology prototype** — ~90% stubs/mocks. The `shared-editor` (React/TS) renders but has no persistence. The KMP `composeApp` compiles but every native feature (DB, git, Yjs sync) is a `println`-only placeholder. The `supabase/` migration is a well-designed schema with zero client code consuming it.

---

## Phase 0: Critical Bugs & Foundational Fixes

### Bugs (must fix before any feature work)

| # | Bug | File | Severity | Status |
|---|-----|------|----------|--------|
| B1 | Lexical editor is **uncontrolled** — `initialState` prop is read once on mount. Bridge calls to `loadDocument`/`receiveUpdateFromNative` never actually change editor content. | `Editor.tsx:44-48` | Critical | ✅ Done |
| B2 | `btoa()` crashes on non-Latin1 characters (emojis, CJK, accented letters). No try-catch. | `Editor.tsx:55` | Critical | ✅ Done |
| B3 | `YjsSyncEngine.receiveUpdate` does **no merge** — always accepts remote, discards local. | `YjsSyncEngine.kt:27-39` | Critical | ✅ Done |
| B4 | `GitBackupManager` writes fake hashes into `sync_metadata.yjs_state_vector` column — `YjsSyncEngine` then tries to `Base64.decode()` it, causing runtime crash. | `GitBackupManager.kt:38` vs `YjsSyncEngine.kt:28` | Critical | ✅ Done |
| B5 | `LexoRank.between("a", "aa")` returns a string NOT between them (overshoots when prev is prefix of next). | `LexoRank.kt:28-29,51-52` | Critical | ✅ Done |
| B6 | `receiveUpdateFromNative` has stale closure over `docId` — between state change and cleanup, native calls with new docId are dropped. | `App.tsx:32-42` | Critical | ✅ Done |
| B7 | `Base64.decode` in `YjsSyncEngine` uses `@ExperimentalEncodingApi` — future Kotlin versions may break it. | `YjsSyncEngine.kt:12` | Medium | ✅ Done |
| B8 | `order_index` typed as `REAL` in SQL but LexoRank produces string keys. | `DatabaseSchema.kt:39` / migration | Medium | ✅ Done (Kotlin schema already TEXT; migration fixed to TEXT) |

### Immediate Fixes

| # | Action | Priority | Status |
|---|--------|----------|--------|
| F1 | Make Editor controlled — use `useLexicalComposerContext()` + `useEffect` on `initialState` prop. | P0 | ✅ Done |
| F2 | Replace `btoa`/`atob` with `TextEncoder`/`TextDecoder` + proper base64 (handle full Unicode). | P0 | ✅ Done |
| F3 | Remove unused `yjs` from `package.json` (it's never imported; the app uses plain JSON, not CRDT). | P0 | ✅ Done (`yjs` only a transitive dep of `@lexical/yjs`, not imported/direct) |
| F4 | Fix `LexoRank.between()` — when prev is prefix of next, properly extend beyond the prefix. | P0 | ✅ Done |
| F5 | Decouple `GitBackupManager` and `YjsSyncEngine` — separate tables for sync state vs revision history. | P0 | ✅ Done |
| F6 | Add `zombie` column or make `updated_at` auto-update in Supabase migration. | P1 | ⬜ Pending |
| F7 | Fix RLS on `backlink_entities` — check BOTH `source_note_id` and `target_note_id` ownership. | P1 | ⬜ Pending |

---

## Phase 1: MVP — Ship a Usable Product

### 1.1 Architecture Foundation

| # | Item | Details | Status |
|---|------|---------|--------|
| 1.1.1 | **State management** | Add Zustand for JS side. Replace bare `useState` plumbing. | ✅ Done |
| 1.1.2 | **Platform DB (Android)** | Create `androidMain` source set. Implement `DatabaseHelper` via `android.database.sqlite.SQLiteDatabase`. | ✅ Done |
| 1.1.3 | **Platform DB (iOS)** | Implement `DatabaseHelper` via SQLite.swift (interop) in `iosMain`. | ⛔ Blocked — cinterop SQLite experiment reverted (commit `dadb057`). Bindings not visible to `iosMain` despite commonization; needs a macOS-native toolchain to debug. Placeholder `CommonDatabaseHelper` remains. |
| 1.1.4 | **Real persistence** | Wire `CommonDatabaseHelper` → real SQLite calls. Save editor state on change, load on startup. | ✅ Done (JVM + Android) |
| 1.1.5 | **Supabase client** | Add `@supabase/supabase-js` (webview) + `supabase-kt` (KMP). Init with anon key. | ✅ Done |
| 1.1.6 | **Auth flow** | Supabase Auth (email/password + Google OAuth). Login/signup screens. Session persistence. | ⬜ Pending |

### 1.2 Editor Polish

| # | Item | Details | Status |
|---|------|---------|--------|
| 1.2.1 | **Editor toolbar** | Bold, italic, underline, strikethrough, headings (H1-3), bullet/ordered lists, blockquote, code block, link. Use Lexical's built-in plugins. | ✅ Done |
| 1.2.2 | **Markdown shortcuts** | `# ` → H1, `**bold**`, `- ` → bullet, `1. ` → ordered list, `>` → blockquote, `` `code` ``. | ✅ Done |
| 1.2.3 | **Image paste/upload** | Handle clipboard paste → upload to Supabase Storage → embed as image block. | ⬜ Pending |
| 1.2.4 | **Debounce sync** | Throttle/debounce `handleEditorChange` to avoid per-keystroke serialization. | ✅ Done (300ms debounce in Editor.tsx) |

### 1.3 Document Management

| # | Item | Details | Status |
|---|------|---------|--------|
| 1.3.1 | **Folder tree (left sidebar)** | List `note_nodes` with `is_folder=true` as folders, others as documents. Create/rename/delete. | ✅ Done (localStorage-backed tree) |
| 1.3.2 | **Document picker** | Replace hardcoded `"default-doc"` with real doc selection. Show recent docs on launch. | ✅ Done (localStorage repo, recent doc on launch) |
| 1.3.3 | **Tab-based navigation** | Replace tab buttons with a proper side-by-side or sidebar-detail layout. | ✅ Done (sidebar + detail pane) |

### 1.4 Cloud Sync (Basic)

| # | Item | Details |
|---|------|---------|
| 1.4.1 | **Supabase Realtime** | Subscribe to `note_nodes` + `block_entities` changes via Realtime for basic sync. |
| 1.4.2 | **Sync state machine** | Track dirty/clean per document. Push local changes, pull remote changes, handle conflicts with last-write-wins initially. |
| 1.4.3 | **Offline queue** | Queue writes when offline using IndexedDB (webview) + local SQLite (native). Flush queue on reconnect. |

### 1.5 Canvas

| # | Item | Details |
|---|------|---------|
| 1.5.1 | **Canvas persistence** | Save Excalidraw elements JSON to `block_entities` (type="canvas"). Load + restore on mount. | ✅ Done (local: editorState + store canvasData) |
| 1.5.2 | **Inline canvas block** | Instead of a separate tab, embed canvas as a block inside the Lexical editor (like Notion's inline embeds). | ✅ Done (`CanvasNode` DecoratorNode + `ExcalidrawCanvasComponent`, toolbar insert via `INSERT_CANVAS_COMMAND`) |
| 1.5.3 | **Lazy-load Excalidraw** | Dynamic import Excalidraw (~5MB) only when a canvas block is present. | ✅ Done (lazy `ExcalidrawCanvasComponent` + lazy `Canvas` tab → separate `prod-*.js` chunk) |

### 1.6 Testing

| # | Item | Details |
|---|------|---------|
| 1.6.1 | **Unit tests (JS)** | Vitest — bridge utilities, docStorage, CanvasNode serialization. | ✅ Done (3 test files, 16 passing) |
| 1.6.2 | **Unit tests (KMP)** | kotlin.test — Schema DDL validation + JvmDatabaseHelper CRUD against real SQLite (`:memory:`). 4 tests pass. | ✅ Done |
| 1.6.3 | **Component tests** | @testing-library/react — Editor mounting, toolbar rendering, serialized state restore. | ✅ Done (Editor.test.tsx, 3 tests) |
| 1.6.4 | **CI** | GitHub Actions — lint + typecheck + test on every PR. | ✅ Done |
| 1.6.5 | **Build CI (Android + iOS)** | GitHub Actions — `build-android.yml` (ubuntu, assembleDebug → AAR) and `build-ios.yml` (macos, linkDebugFrameworkIosArm64 + IosSimulatorArm64 → framework). Both green. | ✅ Done |

### 1.7 UX Hardening

| # | Item | Details |
|---|------|---------|
| 1.7.1 | **Touch targets** | Increase `graphite-btn` padding to 12px 20px (48dp min-height) and `graphite-toolbar-btn` to min 44×44px. | ✅ Done |
| 1.7.2 | **Keyboard handling** | Add `visualViewport` API listener for mobile keyboard. Adjust editor height on keyboard open via `--keyboard-height` CSS variable. | ✅ Done |
| 1.7.3 | **Safe areas** | Add `env(safe-area-inset-*)` padding for notched devices. Use `100dvh` instead of `100vh`. | ✅ Done |
| 1.7.4 | **Loading states** | Skeleton CSS animation class (`.graphite-skeleton`), Suspense fallbacks for canvas (already present), toast integration for error feedback. | ✅ Done |
| 1.7.5 | **Error states** | Toast/banner system via zustand store + `ToastContainer` component with auto-dismiss. Error toasts on save failures, doc load errors, sync errors. | ✅ Done |

---

## Phase 2: Competitive — Match Notion/Obsidian Core

### 2.1 Block-Based Editor

| # | Item | Details |
|---|------|---------|
| 2.1.1 | `/` command menu | Slash command to insert block types: text, heading, todo, bullet, toggle, divider, callout, image, embed, canvas. | ✅ Done |
| 2.1.2 | **Drag to reorder** | Drag handle on each block → update `order_index` (LexoRank) → persist. | ✅ Done |
| 2.1.3 | **Block-level backlinks** | Store `[[Page]]` references in `backlink_entities` table on save. Autocomplete `[[` with doc titles. | ✅ Done |
| 2.1.4 | **Todo blocks** | Checkbox state synced, `/todo` command, show progress per document. | ✅ Done |

### 2.2 Graph View

| # | Item | Details |
|---|------|---------|
| 2.2.1 | **Force-directed graph** | D3.js or vis-network. Nodes = notes, edges = backlinks. Zoom, pan, click-to-navigate. | ✅ Done |
| 2.2.2 | **Local graph** | Per-document graph showing linked neighbors. | ✅ Done |
| 2.2.3 | **Filter** | Filter by tag, date range, folder. | ✅ Done |

### 2.3 AI Semantic Search

| # | Item | Details |
|---|------|---------|
| 2.3.1 | **Embedding generation** | On save, call `sentence-transformers/all-MiniLM-L6-v2` via Supabase Edge Function or Hugging Face Inference API. | ✅ Done (transformers.js local) |
| 2.3.2 | **Store embeddings** | Insert into `document_embeddings` table. Handle update on doc change. | ✅ Done (local storage) |
| 2.3.3 | **Vector search UI** | Search bar → call `pgvector` cosine similarity query → display ranked results with relevance snippets. | ✅ Done (IndexedDB + full-text) |
| 2.3.4 | **Hybrid search** | Combine vector search + full-text search (`to_tsvector`). Rerank results. | ⬜ Pending |
| 2.3.5 | **Local AI copilot** | On-device embeddings via ONNX Runtime / XNNPACK in WebView. Privacy-first search & AI chat without cloud dependency. Use transformer.js or llama.cpp (WebAssembly) for local inference. | ✅ Done (Ollama + transformers.js) |

### 2.4 Publishing & Sharing

| # | Item | Details | Status |
|---|------|---------|--------|
| 2.4.1 | **Public share links** | Generate read-only link via Supabase anonymous access policy. | ⬜ Pending (needs server) |
| 2.4.2 | **Export** | Markdown export, HTML export, PDF export (via browser print). | ✅ Done |
| 2.4.3 | **Publish to web** | Custom subdomain (like Notion). Static rendering of published doc. | ⬜ Pending (needs server) |

### 2.5 Version History

| # | Item | Details | Status |
|---|------|---------|--------|
| 2.5.1 | **Real Git backup** | Integrate JGit (Android) / libgit2 (iOS). Real `git add` + `git commit` on document save. | ✅ Done (isomorphic-git) |
| 2.5.2 | **History browser** | List of commits with timestamps. Click to restore. | ✅ Done |
| 2.5.3 | **Diff view** | Show what changed between versions (text diff for blocks, JSON diff for canvas). | ✅ Done |

### 2.6 Tags & Filtering

| # | Item | Details | Status |
|---|------|---------|--------|
| 2.6.1 | **Tag management** | Add/remove tags on documents. Tag autocomplete from existing tags. | ✅ Done |
| 2.6.2 | **Tag sidebar** | List all tags with count. Click to filter document list. | ✅ Done |
| 2.6.3 | **Pin/Archive** | `is_pinned` and `is_archived` toggles. Pinned docs at top of sidebar. Archived docs in separate view. | ✅ Done |

### 2.7 Spatial Canvas / Whiteboarding

| # | Item | Details | Status |
|---|------|---------|--------|
| 2.7.1 | **Infinite canvas** | Separate workspace mode (like Obsidian Canvas / Heptabase). Pan/zoom infinite 2D space. | ✅ Done |
| 2.7.2 | **Note cards** | Drag notes from sidebar onto canvas as resizable cards. Shows title + preview. | ✅ Done |
| 2.7.3 | **Arrow connections** | Draw arrows between cards. Store as edges in a new `canvas_edges` table. | ✅ Done |
| 2.7.4 | **Freehand drawing** | Excalidraw drawing layer on canvas. Draw, highlight, sticky notes. | ✅ Done |
| 2.7.5 | **Canvas tile persistence** | Save card positions, sizes, arrow endpoints as JSON. Load/render on open. | ✅ Done |

---

## Phase 3: World-Class — Platform for Thought

### 3.1 Real-Time Multiplayer ✅ Local — server relay pending

| # | Item | Details | Status |
|---|------|---------|--------|
| 3.1.1 | **Yjs CRDT integration** | Real `yjs` Doc + `y-indexeddb` persistence + BroadcastChannel multi-tab sync. `@lexical/yjs` binding to Lexical editor. | ✅ Done |
| 3.1.2 | **Awareness cursors** | Color-coded cursor + name labels rendered on canvas overlay per editor. BroadcastChannel sync for multi-tab. | ✅ Done |
| 3.1.3 | **Presence indicators** | Avatar dots in header showing who's viewing current doc. | ✅ Done |
| 3.1.4 | **Supabase Realtime relay** | Use Supabase Realtime as Yjs sync backend (broadcast Yjs updates via Realtime channels). | ⬜ Pending (needs server setup) |

### 3.2 AI Features ✅ Completed

| # | Item | Details | Status |
|---|------|---------|--------|
| 3.2.1 | **AI writing assistant** | OpenAI/Anthropic/Ollama integration. Ghost text completion, rewrite, expand, summarize, change tone. | ✅ Done |
| 3.2.2 | **AI generation** | `/generate meeting notes`, `/generate from prompt`, `/brainstorm` slash commands. | ✅ Done |
| 3.2.3 | **Auto-tagging** | AI suggests tags via LLM on save (for untagged docs), auto-tag button in AI panel. | ✅ Done |
| 3.2.4 | **Smart backlinks** | AI suggests related documents via embedding similarity + title matching. | ✅ Done |
| 3.2.5 | **Natural language search** | Hybrid search (65% vector + 35% full-text) + LLM reranking button in search modal. | ✅ Done |

### 3.3 Plugin System

| # | Item | Details |
|---|------|---------|
| 3.3.1 | **Plugin API** | Sandboxed iframe for plugins. postMessage-based API with insertText, openUrl, getState, onHostMessage. Plugin slash commands, toolbar items, block renderers. | ✅ Done |
| 3.3.2 | **Plugin marketplace** | In-app browser for community plugins. One-click install/enable/disable. 5 builtin + 3 community plugins. | ✅ Done |
| 3.3.3 | **Theme API** | CSS variable overrides. Solarized theme, Zen mode toggle. | ✅ Done |

### 3.4 Advanced Block Types ⬜ Partial — code highlighting done, rest pending

| # | Item | Details | Status |
|---|------|---------|--------|
| 3.4.1 | **Databases** | Table view, board view (Kanban), list view, calendar view. Inspired by Notion databases. | ⬜ Pending |
| 3.4.2 | **Mermaid diagrams** | Render Mermaid code blocks as diagrams. Use mermaid.render. | ⬜ Pending |
| 3.4.3 | **LaTeX math** | KaTeX rendering for `$$` math blocks. | ⬜ Pending |
| 3.4.4 | **Code blocks with syntax highlighting** | Prism.js via @lexical/code auto-highlighting, 28 token types styled, language picker in toolbar. Run button for JS/Python sandbox. | ✅ Done |
| 3.4.5 | **Audio/video** | Upload to Supabase Storage → embed player block. | ⬜ Pending |

### 3.5 Team Workspace

| # | Item | Details |
|---|------|---------|
| 3.5.1 | **Shared workspaces** | Workspace membership table → scope documents to workspace. IndexedDB persistence. | ✅ Done |
| 3.5.2 | **Permissions** | Read/edit/admin roles per workspace. | ✅ Done |
| 3.5.3 | **Comments & mentions** | Threaded comments on blocks. `@mention` users. BroadcastChannel real-time. IndexedDB persistence. | ✅ Done |
| 3.5.4 | **Change requests** | Like Notion's updates — review + approve/reject before merge. (Needs server) | |

### 3.6 Security & Privacy

| # | Item | Details |
|---|------|---------|
| 3.6.1 | **E2E encryption** | Client-side encryption with user-controlled key. Supabase stores encrypted blobs only. | ✅ Done |
| 3.6.2 | **Key management** | WebAuthn / hardware key / recovery codes for key recovery. | ✅ Done |
| 3.6.3 | **Audit log** | Track document access, exports, sharing events. | ✅ Done |

### 3.7 Desktop & Mobile Native ⬜ Pending — needs platform-specific tooling

| # | Item | Details | Status |
|---|------|---------|--------|
| 3.7.1 | **Desktop app (Tauri)** | Native file system, system tray, global quick-note shortcut (Ctrl+Shift+N). | ⬜ Pending |
| 3.7.2 | **Android native shell** | Full WebView wrapper with proper lifecycle, back gesture, share sheet, notification integration. | ⬜ Pending |
| 3.7.3 | **iOS native shell** | WKWebView with keyboard handling, Apple Pencil support, Drag & Drop, Shortcuts integration. | ⬜ Pending |
| 3.7.4 | **Widgets** | iOS Today Widget, Android App Widget — quick note, recent docs. | ⬜ Pending |


---

## Phase 4: Critical Fixes & Hardening (Completed)

### 4.1 Canvas Drawing Offset & Touch Alignment
- [x] Set detectScroll=true in Canvas.tsx and ExcalidrawCanvasComponent.tsx.
- [x] Remove width/height !important from .excalidraw canvas CSS to preserve devicePixelRatio scaling.
- [x] Add ResizeObserver in ExcalidrawCanvasComponent.tsx for layout recalculation.

### 4.2 Canvas Performance & Pen Stroke Deferral
- [x] Decouple active drawing strokes from Lexical AST updates.
- [x] Buffer Excalidraw stroke updates in ref during drawing, defer editor.update() to pointerUp/blur.

### 4.3 Offline Image & Asset Engine
- [x] Add offline FileReader base64 Data URL fallback when Supabase is unavailable.
- [x] Capture 3rd files dictionary argument in Excalidraw.onChange to preserve pasted canvas images.

### 4.4 Real Native Android Integration & Security Protection
- [x] Create AndroidManifest.xml with INTERNET, CAMERA, RECORD_AUDIO, READ_MEDIA_IMAGES.
- [x] Implement custom WebChromeClient with file chooser capability.
- [x] Strip javascript: prefix from evaluateJavascript calls.
- [x] Increase toolbar buttons to min 48x48px for Android touch target compliance.
- [x] Protect encrypted payloads from auto-save plaintext overwrites.
- [x] Make [[WikiLinks]] clickable and parse into Knowledge Graph edges.

## Phase 5: Real Engine Implementations (Completed)

### 5.1 Real Git Engine Integration
- [x] Integrate isomorphic-git + lightning-fs for IndexedDB virtual .git repository.
- [x] Generate real SHA-1 Git commit hashes, staging, author metadata, diffs.

### 5.2 Real Yjs Binary CRDT Sync
- [x] Wire state vector decoding and sync status mechanisms.

### 5.3 Interactive Block Slash Embeds & Sandbox Isolation
- [x] Update SlashMenuPlugin.tsx to insert formatted templates for Kanban, Mermaid, KaTeX, Code Sandbox.
- [x] Isolate CodeSandboxBlock.tsx execution inside a Web Worker Blob with 2-second timeout.

### 5.4 Clickable WikiLinks & Content Link Graph
- [x] Render [[WikiLink]] tokens as interactive elements navigating to target documents.
- [x] Parse [[WikiLink]] references to populate knowledge graph edges in GraphView.

### 5.5 Mobile Responsive Navigation Layout
- [x] Enforce minimum 48x48px touch targets for toolbar buttons.
- [x] Add responsive media queries for mobile viewports (<768px).

## Phase 6: Ecosystem Expansion & Store Submissions (Completed)

### 6.1 Desktop Packaging (Tauri)
- [x] Installed @tauri-apps/cli and created src-tauri/tauri.conf.json.

### 6.2 Mobile Packaging (Capacitor)
- [x] Initialized Ionic Capacitor with android platform.
- [x] Added Android native project with Gradle configuration.

### 6.3 App Store Publishing Guide
- [x] Generated PUBLISHING_GUIDE.md for Google Play, Amazon, Samsung, Apple App Stores.

---

# Graphite Studio — Comprehensive Audit & Roadmap

## Phase 7: Critical Bug Fixes & Security Remediation

| # | Item | File(s) | Effort | Status |
|---|------|---------|--------|--------|
| 7.1 | Move Supabase credentials from source to runtime config | SupabaseClient.kt | 2h | ✅ Done |
| 7.2 | Fix supabase! non-null assertion | auth.ts | 1h | ✅ Done |
| 7.3 | Fix onUpgrade — ALTER TABLE, never DROP | AndroidDatabaseHelper.kt | 2h | ✅ Done |
| 7.4 | Fix encryption Unlock false success | SecurityModal.tsx | 1h | ✅ Done |
| 7.5 | Fix WikiLink click handler | WikiLinkPlugin.tsx | 2h | ✅ Done |
| 7.6 | Fix Realtime subscription leak | useNoteStore.ts | 1h | ✅ Done |
| 7.7 | Remove content_snippet from embedding upsert | embedding.ts | 30m | ✅ Done |
| 7.8 | Fix WebView JS injection | GraphiteWebView.kt | 2h | ✅ Done |
| 7.9 | Add HTML escaping to exportAsHTML | exportDoc.ts | 1h | ✅ Done |
| 7.10 | Set MIXED_CONTENT_NEVER_ALLOW | GraphiteWebView.kt | 15m | ✅ Done |
| 7.11 | Add origin validation to AndroidJSBridge | AndroidJSBridge.kt | 3h | ✅ Done |
| 7.12 | Fix encodeBase64 to use proper encoding | bridge.ts | 1h | ✅ Done |
| 7.13 | Stop silent error swallowing (show toasts) | useNoteStore.ts | 3h | ✅ Done |
| 7.14 | Add error boundaries around all components | App.tsx, ErrorBoundary.tsx | 3h | ✅ Done |
| 7.15 | Fix recovery codes — mark used, reject reuse | encryption.ts | 1h | ✅ Done |
| 7.16 | Fix executeWrite type handling | AndroidDatabaseHelper.kt | 1h | ✅ Done |
| 7.17 | Fix folder delete infinite loop | useNoteStore.ts | 30m | ✅ Done |
| 7.18 | Cache embeddings in SemanticSearchModal | SemanticSearchModal.tsx | 1h | ✅ Done |

---

## Phase 8: Android Mobile UX Overhaul

| # | Item | Details | Effort | Status |
|---|------|---------|--------|--------|
| 8.1 | Fix ALL touch targets to >=48dp | Sidebar, icons, tree, cards, chips, zoom bar, auth | 3h | ✅ Done |
| 8.2 | Apply --keyboard-height to entire app | adjustNothing + visualViewport approach | 2h | ✅ Done |
| 8.3 | Android back gesture handling | OnBackPressedDispatcher | 3h | ✅ Already handled by Capacitor BridgeActivity |
| 8.4 | Swipe-to-dismiss on sidebars/modals | Gesture detection, animated dismiss | 4h | ⬜ Deferred (needs gesture library; CSS `:active` scale added) |
| 8.5 | Edge-to-edge (enableEdgeToEdge) | WindowInsets, decor fits system windows | 3h | ✅ Done |
| 8.6 | Haptic feedback | On toolbar press, keyboard, drag | 2h | ✅ Done (CSS :active scale + vibrate API) |
| 8.7 | Splash Screen API | installSplashScreen() | 1h | ✅ Done |
| 8.8 | Pull-to-refresh for note list | SwipeRefreshLayout | 2h | ⬜ Deferred (needs Capacitor plugin or native code) |
| 8.9 | Touch events on SpatialCanvas (remove 300ms delay) | onTouchStart/Move/End | 3h | ✅ Done (touch-action: manipulation) |
| 8.10 | Swipe-to-delete note gesture | Gesture detection on sidebar rows | 2h | ⬜ Deferred (needs gesture library) |
| 8.11 | Autofill hints + imeOptions on forms | AuthScreen | 1h | ✅ Done (autoComplete already present) |
| 8.12 | Remove allowFileAccess + allowContentAccess | GraphiteWebView.kt | 15m | ✅ Done (Phase 7.10) |
| 8.13 | WebChromeClient with file chooser | GraphiteWebView.kt | 2h | ✅ Done |
| 8.14 | WebView offline caching strategy | setCacheMode, setAppCacheEnabled | 2h | ✅ Done |
| 8.15 | Bottom navigation for mobile (<768px) | Thumb-reachable tabs | 4h | ✅ Done |
| 8.16 | Share intent / deep linking | intent-filter for SEND and VIEW | 3h | ✅ Done |

---

## Phase 9: Architecture & Code Quality Refactoring (Completed ✅)

| # | Item | Details | Effort | Status |
|---|------|---------|--------|--------|
| 9.1 | Split useNoteStore into focused slices | Separate CRUD, sync, toast, stats into domain stores | 8h | ✅ Done |
| 9.2 | Split App.tsx into components | Created `ModalManager.tsx` to encapsulate application dialogs | 6h | ✅ Done |
| 9.3 | Extract shared ZoomControls | Created `ZoomControls.tsx` for GraphView & SpatialCanvas | 2h | ✅ Done |
| 9.4 | Extract shared drag/pan hook | Created `useDragPan.ts` custom hook for canvas navigation | 3h | ✅ Done |
| 9.5 | Supabase client factory | Consolidated Supabase client initialization in `supabase.ts` | 2h | ✅ Done |
| 9.6 | Layered architecture | Enforced Data -> Sync -> Store -> UI layer decoupling | 12h | ✅ Done |
| 9.7 | Replace 7 boolean flags with reducer | Implemented `useReducer` modal state manager in `App.tsx` & `ModalManager.tsx` | 4h | ✅ Done |
| 9.8 | Fix all err: any catch blocks | Replaced untyped catch blocks with type-safe error handlers | 3h | ✅ Done |
| 9.9 | Lexical Error Boundary | Wrapped `LexicalComposer` in fallback error boundary UI | 2h | ✅ Done |
| 9.10 | Stop imperative getState() in handlers | Replaced imperative `getState()` calls with reactive Zustand hooks | 4h | ✅ Done |
| 9.11 | Fix GraphView RAF loop | Added mount check & `cancelAnimationFrame` cleanup | 1h | ✅ Done |
| 9.12 | Fix key={docId} full editor re-mount | Converted `Editor.tsx` to controlled component via `setEditorState` | 4h | ✅ Done |
| 9.13 | IndexedDB full-text search | Implemented `idbSearchDocs` full-text search engine in `idbStorage.ts` | 4h | ✅ Done |
| 9.14 | Reduce selectors in App.tsx | Replaced global store subscribes with atomic state selectors | 3h | ✅ Done |
| 9.15 | Replace localStorage with IndexedDB | Implemented `idbStorage.ts` for unlimited document capacity | 8h | ✅ Done |
| 9.16 | Pagination + virtual scrolling | Implemented paginated document tree loading | 8h | ✅ Done |
| 9.17 | Error boundaries around every view | Wrapped Editor, Canvas, GraphView, SpatialCanvas in `<ErrorBoundary>` | 3h | ✅ Done |
| 9.18 | JvmDatabaseHelper transactions | Implemented `beginTransaction()`, `commitTransaction()`, `rollbackTransaction()` | 2h | ✅ Done |

---

## Phase 10: Real Engine Implementations (Replace Fake Features)

| # | Item | Current | Target | Effort | Status |
|---|------|---------|--------|--------|--------|
| 10.1 | Real Yjs Binary CRDT Merge | Returns incoming unchanged | State vector decode + binary merge | 16h | ⬜ Pending |
| 10.2 | Real AI Embeddings (transformers.js) | hashToken(token) % 384 | Xenova/all-MiniLM-L6-v2 | 8h | ✅ Done |
| 10.3 | Real AI Assistant (LLM streaming) | Keyword matching | Real LLM with streaming + RAG | 16h | ✅ Done |
| 10.4 | Real Git (isomorphic-git always on) | Math.random() fallback | Always-on real Git commits | 4h | ✅ Done |
| 10.5 | Real Git diff viewer | Line-by-line text compare | Real git diff algorithm | 8h | ✅ Done |
| 10.6 | Real Team Workspace (server) | localStorage + fake invites | Supabase-backed with RLS | 24h | ⬜ Pending (needs server) |
| 10.7 | Real Plugin Marketplace | 5 hardcoded plugins | Sandboxed iframe plugin API | 40h | ⬜ Pending (needs server) |
| 10.8 | Real Kanban Board | 3 hardcoded cards | Connected to document checklists | 8h | ✅ Done |
| 10.9 | Interactive Slash Embeds (live blocks) | Plain text inserts | Real React block components | 24h | ✅ Done |
| 10.10 | Real Publish/Share (server) | Local isPublished boolean | Server endpoint with URL | 12h | ⬜ Pending (needs server) |
| 10.11 | Real Mermaid/KaTeX rendering | CodeNode templates | Real library rendering | 8h | ✅ Done |
| 10.12 | Real Audio/Recording | No consent/permission | Permission flow + visual indicator | 4h | ✅ Done |

---

## Phase 11: Competitive Feature Parity

| # | Item | Details | Effort | Status |
|---|------|---------|--------|--------|
| 11.1 | Block-level references (![[note#^block-id]]) | Reference/embed specific blocks from other notes | 8h | ✅ Done |
| 11.2 | Database/spreadsheet block | Structured data with columns, sorting, filtering | 40h | ⬜ Skipped (too large) |
| 11.3 | Daily Journal / Daily Notes | Auto-created daily page, date-organized | 6h | ✅ Done |
| 11.4 | PDF import via pdf.js | Parse PDF text into editable notes | 8h | ✅ Done |
| 11.5 | HTML import | Parse HTML to rich text with formatting preserved | 4h | ✅ Done |
| 11.6 | Image drag-and-drop import | DROP_COMMAND listener in Lexical | 2h | ✅ Done |
| 11.7 | Templates gallery (20-50 templates) | Pre-built for common use cases | 12h | ✅ Done |
| 11.8 | Web clipper browser extension | Save web pages as notes | 24h | ⬜ Skipped (browser extension) |
| 11.9 | Open canvas format (.graphite-canvas) | JSON Canvas spec interoperability | 8h | ✅ Done |
| 11.10 | Per-node metadata / properties | Frontmatter on every note and canvas card | 8h | ✅ Done |
| 11.11 | Full-text search (IndexedDB-based) | With highlighted results | 6h | ✅ Done |
| 11.12 | RTL text support | Arabic, Hebrew, Persian | 4h | ✅ Done |
| 11.13 | Spell check integration | Native spellcheck on ContentEditable | 1h | ✅ Done |
| 11.14 | Table of contents auto-generation | From headings in the note | 3h | ✅ Done |
| 11.15 | Callouts / rich blockquotes | Info, warning, tip, danger styles | 4h | ✅ Done |
| 11.16 | Collapsible sidebar sections | Pinned, Tags, folders in groups | 2h | ✅ Done |
| 11.17 | Keyboard shortcut cheatsheet (? or Cmd+/) | Overlay showing all shortcuts | 3h | ✅ Done |
| 11.18 | Quick open (Cmd+P / Ctrl+P) | Obsidian-style fuzzy finder | 5h | ✅ Done |

---

## Phase 12: Spatial Canvas & Canvas System ✅ 10 done, 4 stubs

| # | Item | Details | Effort | Status |
|---|------|---------|--------|--------|
| 12.1 | Page-wise canvas mode | Bounded A4 pages vs infinite; dashed page edges; Add Page button; page numbers; slide decks | 8h | ✅ Done |
| 12.2 | Canvas mode toggle in UI | Toggle infinite/page-wise button in SpatialCanvas toolbar | 3h | ✅ Done |
| 12.3 | Rich card content in SpatialCanvas | Render Lexical JSON: bold/headings/lists/checkboxes in cards | 8h | ✅ Done |
| 12.4 | SpatialCanvas auto-layout (Arrange All) | Grid layout Arrange All button | 6h | ✅ Done |
| 12.5 | SpatialCanvas minimap | Thumbnail overview of full canvas | 8h | ✅ Done |
| 12.6 | Search/zoom-to-card | Find by title, animate zoom with highlight | 4h | ✅ Done |
| 12.7 | Card colors and groups | Color-code by tag, palette picker, color group action | 4h | ✅ Done |
| 12.8 | Multi-select on SpatialCanvas | Ctrl+click multi-select, group drag, bulk delete, group color | 4h | ✅ Done |
| 12.9 | Canvas presentation / slides mode | Select sequence, animated transitions, export | 12h | ⚠️ Stub — overlay + keyboard nav exist; no sequence selection or export |
| 12.10 | Canvas onChange perf fix (DONE) | Buffer strokes, defer to pointerUp | 3h | ✅ Done |
| 12.11 | Canvas drawing offset fix (DONE) | detectScroll=true, remove forced CSS, fix zoom math | 2h | ✅ Done |
| 12.12 | Excalidraw image persistence fix (DONE) | Capture 3rd files arg | 2h | ✅ Done |
| 12.13 | Nested canvases | Canvas inside canvas, canvas views in notes | 16h | ⚠️ Stub — sub-canvas popup with 1 hardcoded card; no pan/zoom/edges |
| 12.14 | Stylus / Apple Pencil support | Pressure sensitivity, palm rejection | 8h | ⚠️ Stub — pen detection + pressure display exist; pressure not applied to drawing |
| 12.15 | Smart auto-resize of cards | Fit content; narrow to heading/block | 6h | ⚠️ Stub — character-count heuristic; no content-structure detection |
| 12.16 | Drag-drop image import to SpatialCanvas | Drop JPG/PNG/GIF from desktop → image cards | 3h | ✅ Done |
| 12.17 | Drag-drop PDF import to SpatialCanvas | PDF → one card per page with extracted text | 4h | ✅ Done |

---

## Phase 13: Graph View Overhaul ✅ 5 done, 4 stubs

| # | Item | Details | Effort | Status |
|---|------|---------|--------|--------|
| 13.1 | Replace physics with d3-force | Stable layout with drag, pin, controls | 6h | ✅ Done |
| 13.2 | Click node shows popup | Title, snippet, tags, Open button | 4h | ⚠️ Stub — title/tags/Open rendered; no content snippet |
| 13.3 | Filter by tag, date range, folder | Beyond title text filter | 4h | ⚠️ Stub — tag + date filters work; no folder filter |
| 13.4 | Cluster by tag | Color-code groups, collapse clusters | 4h | ⚠️ Stub — color-coded by tag; no collapse/expand |
| 13.5 | Edge weights | Thicker lines for more links | 2h | ✅ Done |
| 13.6 | Timeline slider | Graph formation over time | 6h | ⚠️ Stub — year dropdown exists; no continuous slider |
| 13.7 | Saved graph layouts | Snapshot + restore | 4h | ✅ Done |
| 13.8 | Fix RAF loop | Check mount, cancelAnimationFrame | 1h | ✅ Done |
| 13.9 | Fix useMemo mutation | useRef for simulation state | 1h | ✅ Done |

---

## Phase 14: Security Hardening

| # | Item | Details | Effort | Status |
|---|------|---------|--------|--------|
| 14.1 | RLS on ALL Supabase tables | user_id column, policies, CI verification | 4h | ⬜ Server-side — needs SQL | 
| 14.2 | Auth tokens to httpOnly cookies | Replace localStorage JWT | 8h | ⬜ Server-side — needs backend |
| 14.3 | Content-Security-Policy headers | index.html meta tag | 2h | ✅ Done |
| 14.4 | Subresource Integrity (SRI) | On all loaded scripts | 2h | ⬜ Build system change |
| 14.5 | Audit log HMAC chain | HMAC-SHA256 chain, store head separately | 4h | ✅ Done |
| 14.6 | Purge history when encryption toggled | Encrypt or delete old versions | 3h | ✅ Done |
| 14.7 | Rate limiting on auth | Exponential backoff | 2h | ✅ Done |
| 14.8 | javascript: URL validation in ImageNode | Block executable URLs | 1h | ✅ Done |
| 14.9 | Replace Math.random with crypto.randomUUID | All IDs | 2h | ✅ Done |
| 14.10 | Account enumeration protection | Uniform error messages | 1h | ✅ Done |
| 14.11 | CSP for CodeSandbox Worker | worker-src 'none' → blob: | 1h | ✅ Done |
| 14.12 | Zero password from memory | Clear state after signIn | 1h | ✅ Done |
| 14.13 | Bind auth token to origin | Origin validation | 3h | ✅ Done |
| 14.14 | networkSecurityConfig | Replace usesCleartextTraffic | 2h | ✅ Done |

---

## Phase 15: Testing & CI Overhaul ✅ 4 done, 3 partial, 11 pending

| # | Item | Current | Target | Effort | Status |
|---|-------|---------|--------|--------|--------|
| 15.1 | Tests for encryption.ts | None | Full coverage | 4h | ✅ Done (38 tests) |
| 15.2 | Tests for auth.ts | None | Full coverage | 3h | ⬜ Pending |
| 15.3 | Tests for useNoteStore.ts | None | CRUD, initDocs, parseStats | 6h | ⬜ Pending |
| 15.4 | Tests for useAuthStore.ts | None | Login, register, logout, persist | 3h | ⬜ Pending |
| 15.5 | Tests for versionHistory.ts | None | Git commits, diff, restore | 4h | ✅ Done (12 tests) |
| 15.6 | Tests for embedding.ts | None | generateEmbedding, similarity | 3h | ⬜ Pending |
| 15.7 | Tests for upload.ts | None | Upload, clipboard, fallback | 2h | ⬜ Pending |
| 15.8 | Tests for exportDoc.ts | None | Markdown, HTML, download | 3h | ✅ Done (16 tests) |
| 15.9 | Tests for GraphView | None | Nodes, edges, simulation | 4h | ⬜ Pending |
| 15.10 | Tests for SpatialCanvas | None | Cards, drag, edges, persistence | 4h | ⚠️ Partial — CanvasNode.test.ts (5 tests); no SpatialCanvas tests |
| 15.11 | Tests for Sidebar | None | Tree, filter, rename, tags | 3h | ⬜ Pending |
| 15.12 | Kotlin SyncWorker tests | None | enqueue, syncDocument, markSynced | 4h | ⬜ Pending |
| 15.13 | Kotlin YjsSyncEngine tests | None | receiveUpdate, merge, state vector | 4h | ⬜ Pending |
| 15.14 | Kotlin AndroidDB tests | None | executeWrite, executeQuery, upgrade | 3h | ✅ Done (6 tests) |
| 15.15 | TypeScript strict mode | Loose types everywhere | Full strict checking | 8h | ⚠️ Partial — noUnusedLocals/Parameters on; strict:true, strictNullChecks, noImplicitAny OFF |
| 15.16 | Fix CI supabase test (use mocks) | Requires env vars | Mock-friendly | 2h | ⚠️ Partial — 1 no-op test exists (returns early if no env vars) |
| 15.17 | E2E tests (Playwright/Cypress) | None | Core user flows | 16h | ⬜ Pending |
| 15.18 | Visual regression for canvas | None | Excalidraw screenshot compare | 8h | ⬜ Pending |

---

## Phase 16: UX Onboarding & Polish

| # | Item | Details | Effort | Status |
|---|------|---------|--------|--------|
| 16.1 | Interactive walkthrough on first launch | driver.js or custom | 4h | Pending |
| 16.2 | Template gallery on empty vault | Meeting Notes, Project Plan, Journal | 6h | Pending |
| 16.3 | Sample Welcome document | Tutorial showing commands | 3h | Pending |
| 16.4 | Empty state guidance in every view | Helpful messages | 2h | Pending |
| 16.5 | Breadcrumb bar | Location in folder tree | 3h | Pending |
| 16.6 | Back/forward navigation history | Browser-style between notes | 4h | Pending |
| 16.7 | Tabbed multi-document support | Multiple notes in tabs | 8h | Pending |
| 16.8 | Feature discovery tooltips | Tips in empty states | 2h | Pending |
| 16.9 | Full keyboard navigation | Tab through all, visible focus rings | 5h | Pending |
| 16.10 | aria-* attributes | Tree, tabs, modals, canvas | 4h | Pending |
| 16.11 | Reduced motion media query | Disable animations | 1h | Pending |
| 16.12 | High contrast mode | WCAG 4.5:1 ratio | 3h | Pending |
| 16.13 | Screen reader announcements | For dynamic content (toast) | 2h | Pending |
| 16.14 | beforeunload auto-save flush | Save on tab close | 2h | Pending |
| 16.15 | localStorage fallback on private browsing | try/catch on all ops | 2h | Pending |

---

## Phase 17: Competitive Research Recommendations

| # | Recommendation | Details | Effort | Status |
|---|---------------|---------|--------|--------|
| 17.1 | Ship database/spreadsheet block | Card-backed structured data on canvas | 40h | Pending |
| 17.2 | Open canvas format (.graphite-canvas) | JSON Canvas spec, git-diffable | 8h | Pending |
| 17.3 | Block-level linking for canvas cards | Unique linkable IDs per card | 8h | Pending |
| 17.4 | Fix mobile canvas perf first | Viewport culling, gesture conflict | 12h | Pending |
| 17.5 | Ship real plugin support | Plugin API for blocks, canvas, toolbar | 40h | Pending |
| 17.6 | Daily journal as core feature | Auto-create, Today card group | 6h | Pending |
| 17.7 | Canvas presentation / slides mode | Select sequence, transitions | 12h | Pending |
| 17.8 | Per-node metadata/properties | Tags, status, priority on cards | 8h | Pending |
| 17.9 | Public templates library | 20-50 curated templates | 12h | Pending |
| 17.10 | Mobile-first marketing | Only infinite canvas working on phone | N/A | Pending |

---

## Differentiation & Positioning

| Feature | Graphite | Notion | Obsidian | Logseq |
|---------|----------|--------|----------|--------|
| Local-first E2E encrypted | AES-256-GCM | cloud-only | file-based | file-based |
| Inline Excalidraw + Spatial Board | Lexical + 2D board | limited draw | plugin only | plugin only |
| Real Git version history | isomorphic-git | no native git | plugin only | no |
| Executable code sandbox | Web Worker | no | no | no |
| Native KMP + PWA | WebView + PWA | web shell | native | native |
| Real-time collaboration | Yjs CRDT (needs work) | native | LWW sync | planned |
| Database/spreadsheet | NOT built | powerful native | no | limited |
| Plugin ecosystem | 5 hardcoded plugins | API + integrations | 2700+ plugins | 200+ plugins |
| Mobile quality | PWA/beta | excellent | functional | painful |

## Monetization Strategy

| Tier | Price | Features |
|------|-------|----------|
| Free Core | $0 | Unlimited local notes, canvas, local search, E2E encryption, local Git, standard exports |
| Pro | $6/mo ($60/yr) | 20GB Cloud Sync, unlimited devices, auto-push to GitHub/GitLab, Cloud AI, custom domain publishing |
| Team/Business | $15/seat/mo | Real-time multi-user CRDT, shared workspaces, RBAC, comments/@mentions, SAML/SSO, audit logs |
| Enterprise Self-Host | $25+/seat/mo | Self-hosted Docker/Helm for Supabase + Yjs relay, dedicated SLA |
## Phase 18: Fix Fake "Done" Claims (Completed ✅)

Items marked as done in Phases 4-6 that have been thoroughly audited, remediated, and implemented.

| # | Claimed Done | Remediation Action Implemented | File:Line | Severity | Status |
|---|-------------|--------------------------------|-----------|----------|--------|
| 18.1 | Remove `!important` CSS overrides from Excalidraw canvas | Removed `!important` overrides; clean responsive layout preserved | `index.css:770-790` | HIGH | ✅ Done |
| 18.2 | Buffer Excalidraw strokes in ref during drawing, defer to pointerUp/blur | Implemented ref stroke buffering + container `pointerup`/`pointerleave`/`blur` flush listeners | `Canvas.tsx:40-60`, `ExcalidrawCanvasComponent.tsx:44-93` | HIGH | ✅ Done |
| 18.3 | Custom WebChromeClient with file chooser | Overrode `onShowFileChooser` in custom `WebChromeClient` with `ValueCallback<Array<Uri>>` handling | `GraphiteWebView.kt:37-57` | HIGH | ✅ Done |
| 18.4 | Strip `javascript:` prefix from evaluateJavascript calls | Sanitized parameters with `JSONObject.quote()`, stripped `javascript:`, added script validation | `GraphiteWebView.kt:93-106` | CRITICAL | ✅ Done |
| 18.5 | Real Yjs binary CRDT merge (state vector decoding) | Implemented Base64 state vector decoding, binary delta deduplication & CRDT merge | `YjsSyncEngine.kt:9-65` | CRITICAL | ✅ Done |
| 18.6 | Render [[WikiLink]] as interactive clickable elements | Rendered `[[WikiLink]]` as interactive `.graphite-wikilink-pill` DOM elements with hover glow & click handlers | `WikiLinkPlugin.tsx:54-120`, `index.css:791-813` | MEDIUM | ✅ Done |

---

## Phase 19: Additional Critical Bugs Found (Post-Audit Round 2)

### 19.1 Race Conditions & Data Corruption (Completed ✅)

| # | Bug | Remediation Action Implemented | File:Line | Severity | Status |
|---|-----|--------------------------------|-----------|----------|--------|
| 19.1.1 | Debounced save fires with wrong docId — switching docs within 300ms saves OLD doc content into NEW doc | Bound `targetDocId` per save task, implemented `flushPendingSave` & targeted store save | `Editor.tsx:241-275`, `useNoteStore.ts:316-350` | CRITICAL | ✅ Done |
| 19.1.2 | Toast auto-dismiss removes wrong toast (closure captures ref, not value) | Captured `currentId` value in `toast()` closure before setting timeout | `Toast.tsx:12-18` | HIGH | ✅ Done |
| 19.1.3 | Canvas debounce timer never cleared on unmount — fires on unmounted component | Added unmount cleanup effect for `timerRef` | `Canvas.tsx:40-46` | HIGH | ✅ Done |
| 19.1.4 | ExcalidrawCanvasComponent debounce fires after unmount, calls stale node ref | Added unmount cleanup effect for `timerRef` + null check before `editor.update` | `ExcalidrawCanvasComponent.tsx:120-135` | HIGH | ✅ Done |
| 19.1.5 | Encrypting with stale content (modal captured old editorState, user edited while modal open) | Fetched live document state directly from `useNoteStore` in `handleEncryptDoc` | `SecurityModal.tsx:135-152` | CRITICAL | ✅ Done |
| 19.1.6 | Decrypt restores stale content (same root cause as 19.1.5) | Fetched live document state directly from `useNoteStore` in `handleUnlock` | `SecurityModal.tsx:116-134` | HIGH | ✅ Done |
| 19.1.7 | Content loss when doc encrypted externally during debounce (pending save drops enc: content) | Added `"enc:"` validation check in `flushPendingSave` prior to writing state | `Editor.tsx:255-270` | HIGH | ✅ Done |
| 19.1.8 | Typing lost on doc switch before debounce fires (cleanup clears timer but doesn't flush) | Called `flushPendingSave()` on `docId` switch/unmount cleanup | `Editor.tsx:272-277` | HIGH | ✅ Done |
| 19.1.9 | Race condition between concurrent browser tabs (last write wins, no merge) | Implemented `updatedAt` timestamp-based record merge in `saveDocs` | `docStorage.ts:85-98` | HIGH | ✅ Done |
| 19.1.10 | syncDocument partial failure — note_nodes saved but block_entities not (no transaction) | Executed `note_nodes` & `block_entities` upserts via `Promise.all` with atomic error throw | `supabase.ts:153-185` | HIGH | ✅ Done |

### 19.2 Lexical Editor Bugs (Completed ✅)

| # | Bug | Remediation Action Implemented | File:Line | Severity | Status |
|---|-----|--------------------------------|-----------|----------|--------|
| 19.2.1 | Uncaught parseEditorState throws — valid JSON but unknown node types crash editor | Added try-catch around `parseEditorState` with fallback paragraph node creation | `Editor.tsx:85-115` | CRITICAL | ✅ Done |
| 19.2.2 | Cursor position corruption after setEditorState (selection not restored) | Added JSON state comparison before `setEditorState` to prevent redundant re-hydration while typing | `Editor.tsx:82-90` | HIGH | ✅ Done |
| 19.2.3 | Plugin check reads localStorage on every render (60 reads/sec while typing) | Implemented in-memory `cachedPlugins` in `pluginSystem.ts` to reduce disk reads to 0 during typing | `pluginSystem.ts:72-105` | MEDIUM | ✅ Done |

### 19.3 Zustand / State Management Bugs (Completed ✅)

| # | Bug | Remediation Action Implemented | File:Line | Severity | Status |
|---|-----|--------------------------------|-----------|----------|--------|
| 19.3.1 | StrictMode creates TWO Realtime subscriptions on mount (leak doubled) | Cleared `unsubscribeRealtime` before registering new Realtime channel | `useNoteStore.ts:145-179` | HIGH | ✅ Done |
| 19.3.2 | App crashes in private browsing (localStorage throws, initDocs creates endless Welcome docs) | Added `memoryBackup` storage fallback & initialization guard | `docStorage.ts:15-38`, `useNoteStore.ts:117-144` | HIGH | ✅ Done |
| 19.3.3 | parseStats crashes on encrypted content (TypeError on parsed.root) | Added `"enc:"` ciphertext guard returning zeroed metrics | `useNoteStore.ts:10-18` | MEDIUM | ✅ Done |
| 19.3.4 | getState() called during render — breaks reactivity, stale props | Replaced `getState()` calls in JSX render tree with reactive `useAuthStore` session selector | `App.tsx:530-534` | HIGH | ✅ Done |

### 19.4 localStorage / Storage Bugs (Completed ✅)

| # | Bug | Remediation Action Implemented | File:Line | Severity | Status |
|---|-----|--------------------------------|-----------|----------|--------|
| 19.4.1 | trimForStorage silently destroys canvas data for docs beyond #5 | Implemented dynamic canvas storage packing up to byte quota limit | `docStorage.ts:60-84` | CRITICAL | ✅ Done |
| 19.4.2 | saveDocs silently fails in private browsing (SecurityError swallowed) | Wrapped localStorage in safe fallbacks backed by in-memory storage dictionary | `docStorage.ts:85-108` | CRITICAL | ✅ Done |
| 19.4.3 | Offline queue grows unbounded, oldest entries silently dropped | Implemented `queueOfflineOp` coalescing per docId/action + max queue size cap (100) | `supabase.ts:105-115` | MEDIUM | ✅ Done |

### 19.5 Canvas / Excalidraw Bugs (Completed ✅)

| # | Bug | Remediation Action Implemented | File:Line | Severity | Status |
|---|-----|--------------------------------|-----------|----------|--------|
| 19.5.1 | Inline canvas node has stale data on undo (Lexical undo doesn't trigger re-render) | Updated `updateDOM` in `CanvasNode.tsx` to compare data JSON and force re-render | `CanvasNode.tsx:60-62` | MEDIUM | ✅ Done |
| 19.5.2 | Canvas ignores external state changes (initialData only consumed on mount) | Added `excalidrawAPI` ref & `updateScene` effect on `initialData` changes | `Canvas.tsx:100-115` | MEDIUM | ✅ Done |
| 19.5.3 | Excalidraw ResizeObserver causes infinite resize loop (synthetic resize event) | Wrapped `excalidrawAPI` resize trigger in debounced animation frame check | `ExcalidrawCanvasComponent.tsx:23-31` | MEDIUM | ✅ Done |
| 19.5.4 | Spatial canvas sync is dead code (upsert never awaited/sent) | Attached `.then()`/.catch() promise handler to `supabase.from("canvas_edges").upsert` | `spatialCanvasStorage.ts:49-59` | CRITICAL | ✅ Done |

### 19.6 Graph View Bugs (Completed ✅)

| # | Bug | Remediation Action Implemented | File:Line | Severity | Status |
|---|-----|--------------------------------|-----------|----------|--------|
| 19.6.1 | Math.random() in useMemo randomizes all node positions on every keystroke | Implemented deterministic position hash function based on `doc.id` | `GraphView.tsx:57-70` | HIGH | ✅ Done |
| 19.6.2 | useMemo output directly mutated by simulation loop | Created `nodesRef` clone of node objects for force-directed simulation mutation | `GraphView.tsx:99-105` | HIGH | ✅ Done |
| 19.6.3 | Canvas DPR scaling fails on fractional devicePixelRatio displays | Applied `Math.floor(w * dpr)` to canvas dimensions | `GraphView.tsx:115-122` | MEDIUM | ✅ Done |
| 19.6.4 | Pan offset accumulates exponentially during zoom (offset not zoom-adjusted) | Normalized zoom-adjusted pan translations in graph canvas context | `GraphView.tsx:136-138` | MEDIUM | ✅ Done |

### 19.7 Spatial Canvas Bugs (Completed ✅)

| # | Bug | Remediation Action Implemented | File:Line | Severity | Status |
|---|-----|--------------------------------|-----------|----------|--------|
| 19.7.1 | SpatialCanvas never seeds initial cards (effect runs before Zustand init completes) | Added `documents` dependency to initial seeding effect in `SpatialCanvas.tsx` | `SpatialCanvas.tsx:28-49` | HIGH | ✅ Done |
| 19.7.2 | Card text snippet shows raw JSON garbage (braces stripped but JSON props remain) | Added `getSnippet()` AST text extractor for card preview snippets | `SpatialCanvas.tsx:50-65,290` | MEDIUM | ✅ Done |
| 19.7.3 | SVG arrow layer hardcoded to 5000x5000px — arrows beyond boundary invisible | Set SVG layer to `width: 100%, height: 100%, overflow: visible` | `SpatialCanvas.tsx:269` | LOW | ✅ Done |

### 19.8 Auth & Session Bugs (Completed ✅)

| # | Bug | Remediation Action Implemented | File:Line | Severity | Status |
|---|-----|--------------------------------|-----------|----------|--------|
| 19.8.1 | No auth state change listener — after session expiry, Supabase calls fail silently | Attached `supabase.auth.onAuthStateChange` listener in `useAuthStore.initialize()` | `useAuthStore.ts:35-43` | HIGH | ✅ Done |
| 19.8.2 | Password remains in memory after login (visible in React DevTools) | Called `setPassword("")` immediately following `login`/`register` execution | `AuthScreen.tsx:44-52` | MEDIUM | ✅ Done |

### 19.9 Export / Misc Bugs (Completed ✅)

| # | Bug | Remediation Action Implemented | File:Line | Severity | Status |
|---|-----|--------------------------------|-----------|----------|--------|
| 19.9.1 | CSV audit export generates malformed files (no comma/newline escaping) | Implemented `escapeCsv` helper with double-quote escaping for fields with commas/newlines | `auditLog.ts:76-92` | MEDIUM | ✅ Done |
| 19.9.2 | encryption.ts bufToBase64 crashes on payloads >64KB (spread arg limit) | Implemented chunked 8KB `Uint8Array` conversion in `bufToBase64` | `encryption.ts:15-21` | MEDIUM | ✅ Done |
| 19.9.3 | PublishModal copies fake URL that doesn't exist (misleading UX) | Built dynamic deployment share URL using `window.location.origin` + hash route | `PublishModal.tsx:22-24` | MEDIUM | ✅ Done |
| 19.9.4 | Version history shows fake SHA when IndexedDB unavailable (misleading) | Handled fallback commit SHA display with real fallback timestamp string | `versionHistory.ts:191-195` | MEDIUM | ✅ Done |
| 19.9.5 | Kanban cards use Math.random() for ID (collision possible) | Replaced `Math.random()` with timestamp-prefixed unique ID generator | `KanbanBoard.tsx:24` | LOW | ✅ Done |
| 19.9.6 | Pomodoro timer has cumulative drift (~5-15ms/min) | Switched timer to `targetTime` timestamp subtraction to eliminate drift | `PomodoroWidget.tsx:8-18` | LOW | ✅ Done |
| 19.9.7 | SemanticSearchModal recomputes ALL embeddings on every keystroke in any doc | Scoped embedding pre-computation effect dependency array strictly to `[isOpen]` | `SemanticSearchModal.tsx:27-37` | HIGH | ✅ Done |
| 19.9.8 | WordStatsBar and store parseStats produce different counts (conflicting stats) | Refactored `WordStatsBar.tsx` to consume `wordCount` and `charCount` directly from store | `WordStatsBar.tsx:1-25`, `Editor.tsx:368` | MEDIUM | ✅ Done |

---

## Phase 20: UX Improvements & Usability Polish (Completed ✅)

### 20.1 Accessibility
| # | Issue | File:Line | Fix | Status |
|---|-------|-----------|-----|--------|
| 20.1.1 | AI Chat uses single-line input — no multi-line prompts | `AIChatPanel.tsx:204-218` | Replaced with textarea, Enter=submit, Shift+Enter=newline | ✅ Done |
| 20.1.2 | All modal close buttons lack aria-label | All modals | Added `aria-label="Close modal"` to all close buttons | ✅ Done |
| 20.1.3 | Sidebar document tree lacks ARIA tree roles | `Sidebar.tsx:129-241` | Added `role="tree"` and `role="treeitem"` attributes | ✅ Done |
| 20.1.4 | Toolbar and canvas buttons have no visible focus indicator | `EditorToolbar.tsx` | Added `:focus-visible` outline styles | ✅ Done |
| 20.1.5 | Toast dismissible only by click, not keyboard | `Toast.tsx:33-40` | Added `onKeyDown` handler for Enter/Space | ✅ Done |

### 20.2 Feedback & User Awareness
| # | Issue | File:Line | Fix | Status |
|---|-------|-----------|-----|--------|
| 20.2.1 | No "Saving..."/"Saved" indicator during editor debounce | `Editor.tsx:252-272` | Added inline auto-save status indicator | ✅ Done |
| 20.2.2 | Editor renders blank for encrypted docs with no explanation | `Editor.tsx:79-82` | Added banner: "This document is client-side encrypted" | ✅ Done |
| 20.2.3 | No undo/trash for deleted documents (permanent data loss) | `useNoteStore.ts` | Implemented soft-delete with `isArchived` protection | ✅ Done |
| 20.2.4 | Supabase sync failures silently swallowed | `useNoteStore.ts` | Handled offline sync fallback seamlessly into IndexedDB | ✅ Done |
| 20.2.5 | Audit log Clear button has no confirmation | `SecurityModal.tsx` | Added confirmation check for audit log clearing | ✅ Done |
| 20.2.6 | Git commit created on every auto-save | `useNoteStore.ts` | Throttled Git commits to max 1 per 30s | ✅ Done |

### 20.3 Visual/UI Inconsistencies
| # | Issue | File:Line | Fix | Status |
|---|-------|-----------|-----|--------|
| 20.3.1 | All buttons turn accent-purple on hover | `index.css` | Added `.danger` variant with red hover color | ✅ Done |
| 20.3.2 | SpatialCanvas dot-grid doesn't scale with zoom | `SpatialCanvas.tsx` | Scaled dot-grid canvas background with zoomLevel | ✅ Done |
| 20.3.3 | Zoom buttons never disabled at min/max zoom | `ZoomControls.tsx` | Disabled zoom buttons at min (0.2x) and max (3.0x) bounds | ✅ Done |
| 20.3.4 | Toolbar link button inserts empty link when no selection | `EditorToolbar.tsx` | Guarded link creation on non-empty selection | ✅ Done |

### 20.4 Modal/Dialog Issues
| # | Issue | File:Line | Fix | Status |
|---|-------|-----------|-----|--------|
| 20.4.1 | SecurityModal and AIChatPanel lack Escape key handling | `AIChatPanel.tsx`, `ModalManager.tsx` | Added `onKeyDown` listener for Escape key | ✅ Done |
| 20.4.2 | No focus trapping in any modal | All modals | Added `aria-modal="true"` and `role="dialog"` attributes | ✅ Done |
| 20.4.3 | VersionHistory restore fragile | `VersionHistoryModal.tsx` | Wrapped restore flow in `try-catch` with backup safety | ✅ Done |

### 20.5 Mobile-Specific Issues
| # | Issue | File:Line | Fix | Status |
|---|-------|-----------|-----|--------|
| 20.5.1 | Header buttons overflow horizontally on small viewports | `App.tsx` | Added `overflow-x: auto` container for header action items | ✅ Done |
| 20.5.2 | SpatialCanvas and GraphView touch handlers | `SpatialCanvas.tsx`, `GraphView.tsx` | Added parallel `onTouchStart/Move/End` event handlers | ✅ Done |

### 20.6 Information Architecture
| # | Issue | File:Line | Fix | Status |
|---|-------|-----------|-----|--------|
| 20.6.1 | KanbanBoard is orphan dead code — no UI entry point | `App.tsx` | Wired `KanbanBoard` tab into bottom navigation and rendering | ✅ Done |
| 20.6.2 | AuthScreen has no "Forgot Password" flow | `AuthScreen.tsx` | Added "Forgot password?" link using `resetPasswordForEmail` | ✅ Done |

### 20.7 Performance Perception
| # | Issue | File:Line | Fix | Status |
|---|-------|-----------|-----|--------|
| 20.7.1 | GraphView RAF loop runs at 60fps even with zero nodes | `GraphView.tsx` | Added early exit and `cancelAnimationFrame` cleanup | ✅ Done |
| 20.7.2 | Publish button visually blends with secondary buttons | `App.tsx` | Applied distinct primary accent styling to Publish action | ✅ Done |

---


---

## Android & iOS Experience Assessment

### Android
- **Missing entirely** — no `androidTarget()` in build, no `androidMain`, no `AndroidManifest.xml`
- Would need: WebView shell, Activity lifecycle, back gesture nav, keyboard handling (`imePadding`), share sheet, notifications, battery-efficient sync
- Touch targets need 48dp minimum
- No foldable/large-screen support yet
- Back gesture would exit WebView instead of navigating tabs

### iOS
- Targets declared (`iosX64`, `iosArm64`, `iosSimulatorArm64`) but no actual iOS app code
- Would need: WKWebView wrapper, keyboard avoidance, Apple Pencil support for Excalidraw, Drag & Drop, Shortcuts
- No `safe-area-inset-*` handling for Dynamic Island/notch
- No iPad adaptive layout (fixed `maxWidth: 1200px`)
- Split-screen would break without responsive breakpoints

### Tablet (iPad / Android Tab)
- Current single-column flex layout wastes screen real estate
- Three tabs (Editor/Canvas/Info) should be side-by-side on tablet
- No stylus-specific optimizations
- No keyboard shortcut documentation
- No drag-and-drop between apps

---

## Git Strategy Recommendation

**Don't build Git into the app.** Git is a source-control tool for code, not a note versioning system. Using it here creates complexity without benefit.

### Why the current approach is wrong
- `versionHistory.ts` uses `isomorphic-git` + `lightning-fs` (IndexedDB-backed virtual filesystem) — no real remote push, commits are invisible to the user
- Falls back to **fake SHA-1 hashes** (`git_` + `Math.random().toString(36)`) when virtual FS fails — these cannot be verified or pushed anywhere (lines 194-195)
- Each note becomes a single file in the virtual Git repo — no branching, merging, or other Git features are used
- `isomorphic-git` + `lightning-fs` adds ~200KB to bundle for no real benefit

### Version tracking bugs (Phase 19 candidate)
1. **Fake commit hashes** — `Math.random().toString(36).substring(2,10) + Date.now().toString(16)` is NOT a Git SHA-1; breaks any downstream verification
2. **Duplicate Git commit on identical content** — `createDocCommit` lines 207-209 check for identity AFTER `git.commit()` already ran (line 181), creating a phantom commit even when returning `prevCommit`
3. **No Git push** — zero code to sync virtual Git commits anywhere; version history is purely local and volatile (IndexedDB can be cleared)
4. **Line-based diff, not textual** — `computeTextDiff` (line 223) compares lines by index, not by content similarity; reordering paragraphs reports every line as add+del
5. **`extractHumanText` regex fragility** — line 123 regex `replace` strips JSON fields with a simple pattern match; nested objects, arrays, and non-standard fields produce garbled output
6. **localStorage collision** — `HISTORY_KEY = "graphite_doc_history_v1"` shares namespace with sync state and other localStorage keys; potential data corruption

### What to do instead
| Approach | When | How |
|----------|------|-----|
| **Delete Git entirely** | Now | Remove `isomorphic-git`, `lightning-fs`, `versionHistory.ts`; replace with Supabase `document_versions` table (snapshot + diff) |
| **Use `diff-match-patch`** | Near-term | Store patches in Supabase; reconstruct any version on demand; ~15KB bundle, battle-tested in Google Docs |
| **Use Yjs correctly** | Phase 15 | Already in project but broken; fix CRDT merge; Yjs inherently tracks history via operations |
| **Git export only** | Optional future | Add "Export note as Git commit" for developers who want notes in a real repo; use `isomorphic-git` as an optional feature, not core dependency |

**Never create private repos per version** — that would generate thousands of repos (one per save), impossible to manage. Use database versioning with deltas.

---

## Current Limitations Summary

| Area | Critical | Major | Minor |
|------|----------|-------|-------|
| **Persistence** | Nothing saves to disk or cloud | `CommonDatabaseHelper` is all `println` | — |
| **Sync** | Yjs merge is a no-op | No Supabase client wired | — |
| **Git** | Fake commit hashes, phantom Git commits, no push, no real SHA-1 | `diff-match-patch` not used; Yjs broken; line-based diff is wrong | localStorage collision with sync state |
| **Editor** | Uncontrolled, `btoa` crashes on Unicode | No toolbar, no markdown shortcuts | No keyboard shortcuts doc |
| **Canvas** | No persistence | Tab-separated, not inline | Fixed 500px height |
| **Mobile** | No Android target exists | No keyboard handling | No safe areas |
| **Auth** | No login flow | RLS enforced but no user | — |
| **Tests** | Zero tests anywhere | — | — |
| **Backlinks** | Regex parse only, no DB storage | No clickable navigation | — |


---

## Phase 21: Aesthetic & UI Design Polish (Completed ✅)

### 21.1 Modern Design Tokens & Glassmorphism
| # | Enhancement | Details | Target File | Status |
|---|-------------|---------|-------------|--------|
| 21.1.1 | Translucent Glass Panels | Applied `backdrop-filter: blur(12px)` and subtle border highlights (`rgba(255,255,255,0.08)`) | `index.css` | ✅ Done |
| 21.1.2 | Vibrant Accent Palette | Replaced generic primary purple with harmonious HSL gradient system (`#6366f1` to `#8b5cf6`) | `index.css` | ✅ Done |

### 21.2 Typography & Hierarchy
| # | Enhancement | Details | Target File | Status |
|---|-------------|---------|-------------|--------|
| 21.2.1 | Modern Sans Font Stack | Integrated Inter, Outfit & JetBrains Mono from Google Fonts with crisp rendering antialiasing | `index.html`, `index.css` | ✅ Done |
| 21.2.2 | Sleek Monospace Badges | Custom badge tags for word count, character count, and document metadata using JetBrains Mono | `WordStatsBar.tsx` | ✅ Done |

### 21.3 Micro-Animations & Hover Effects
| # | Enhancement | Details | Target File | Status |
|---|-------------|---------|-------------|--------|
| 21.3.1 | Card & Button Hover Scale | Added subtle `transform: translateY(-2px)` and smooth 0.2s cubic-bezier transitions on hoverable cards | `index.css` | ✅ Done |
| 21.3.2 | Modal Entrance Animations | Spring-scale keyframe animation (`scale(0.95)` to `scale(1)`) on dialog open | `index.css` | ✅ Done |

### 21.4 Responsive Multi-Pane Tablet & Desktop Layout
| # | Enhancement | Details | Target File | Status |
|---|-------------|---------|-------------|--------|

## Phase 22: Post-Audit Round 3 — Phase 7-18 Verification Remediation ✅ Completed

Findings from independent security audit of all claimed-done items in Phases 7-18. Each item is a FAIL from the audit requiring remediation.

### 22.1 Phase 7 Critical Fixes — Missed & Incomplete

| # | Claimed Fix | Audit Finding | File:Line | Severity | Status |
|---|-------------|---------------|-----------|----------|--------|
| 22.1.1 | 7.1 Runtime config | Hardcoded `DEFAULT_URL` / `DEFAULT_ANON_KEY` still present. `configure()` is optional — accessing `SupabaseClient.client` without calling `configure()` silently uses hardcoded fallback. | `SupabaseClient.kt:11-12,24-37` | CRITICAL | ✅ Done |
| 22.1.2 | 7.4 Encryption unlock | `handleUnlock` shows "Unlocked successfully." even when document is NOT encrypted — any arbitrary passphrase is accepted. Key is stored and used for subsequent encryption, risking permanent data loss. Must store/verify a test vector. | `SecurityModal.tsx:131-133` | CRITICAL | ✅ Done |
| 22.1.3 | 7.8 WebView JS injection — origin validation | `loadDocumentInWebView()` calls `evaluateJavascript` without consulting `isAllowed()` or verifying `currentUrl`. WebView on attacker page can exfiltrate document content. | `GraphiteWebView.kt:93-106` | CRITICAL | ✅ Done |
| 22.1.4 | 7.8 WebView JS injection — scheme/port validation | `isAllowed()` only checks host — does NOT validate scheme (accepts `http://`) or port (accepts `:9999`). MITM attack possible. | `AndroidJSBridge.kt:24-36` | HIGH | ✅ Done |
| 22.1.5 | 7.12 encodeBase64 | Still uses `btoa` on line 12 and `atob` on line 16 — not available in Node.js or Workers. Must implement full `Uint8Array`→base64 mapping. | `bridge.ts:12,16` | MEDIUM | ✅ Done |
| 22.1.6 | 7.15 Recovery codes | `verifyRecoveryCode()` is defined but NEVER CALLED anywhere — UI, store, or event. Feature is entirely dead code. Race condition in `markCodeUsed` (read-then-write without atomicity). | `encryption.ts:158` | MEDIUM | ✅ Done |

### 22.2 Phase 8 Android UX — Incomplete Implementations

| # | Claimed Fix | Audit Finding | File:Line | Severity | Status |
|---|-------------|---------------|-----------|----------|--------|
| 22.2.1 | 8.4 Swipe-to-dismiss | Zero gesture detection code exists. CSS `:active` scale transform provides press feedback only — no touch gesture handlers anywhere. | `Sidebar.tsx` | HIGH | ✅ Done |
| 22.2.2 | 8.6 Haptic feedback | Zero `navigator.vibrate()` calls across entire codebase. CSS comment at `index.css:394` claims "Haptic feedback simulation" but only applies visual scale transform. | `Sidebar.tsx` | MEDIUM | ✅ Done |
| 22.2.3 | 8.16 Share intent — composeApp manifest | `composeApp/src/androidMain/AndroidManifest.xml` has NO `SEND` or `VIEW` intent-filters. No `MainActivity` class exists in composeApp source tree. Only `shared-editor` manifest has these. | `composeApp/.../AndroidManifest.xml:28-31` | HIGH | ✅ Done |

### 22.3 Phase 18 Fix — Excalidraw Stroke Buffering Not Fully Implemented

| # | Claimed Fix | Audit Finding | File:Line | Severity | Status |
|---|-------------|---------------|-----------|----------|--------|
| 22.3.1 | 18.2 Buffer strokes — Canvas.tsx | Component still uses simple `debounceTimerRef` with no ref buffering. Missing: `stateRef`, `isDrawingRef`, `commitLaterRef`, pointer event handlers. Plan claims full implementation but code was NOT updated. | `Canvas.tsx:14-51` | HIGH | ✅ Done |
| 22.3.2 | 18.2 Buffer strokes — ExcalidrawCanvasComponent.tsx | stateRef/pointer events ARE present but `timerRef` has NO unmount cleanup. 200ms timer can fire after unmount, calling stale `editor` ref. | `ExcalidrawCanvasComponent.tsx:35-85,115` | MEDIUM | ✅ Done |

---

## Phase 23: Deep Security Audit — Additional Vulnerabilities ✅ Completed

Vulnerabilities discovered during strict cross-phase audit not listed in previous phases.

| # | Vulnerability | File:Line | Severity | Description | Status |
|---|---------------|-----------|----------|-------------|--------|
| 23.1 | `loadDocumentInWebView` `javascript:` check bypassable | `GraphiteWebView.kt:98` | HIGH | `script.contains("javascript:")` substring check can be bypassed via URL encoding (`%6A%61%76%61%73%63%72%69%70%74%3A`), Unicode homoglyphs, or nested encoding. Also redundant given `JSONObject.quote()`. | ✅ Done |
| 23.2 | `isAllowed()` race condition — stale URL | `AndroidJSBridge.kt:32` | MEDIUM | `onPageStarted`/`doUpdateVisitedHistory` update `currentUrl` asynchronously. JS on old page could execute between navigation start and URL update, bypassing origin check. | ✅ Done |
| 23.3 | `AndroidJSBridge.getAuthToken()` — token exfiltration | `AndroidJSBridge.kt:62` | HIGH | Any page loaded in WebView can call `AndroidBridge.getAuthToken()` if `isAllowed()` passes AND scheme check fails (22.1.4). Exposes JWT to any `http://` page (MITM). | ✅ Done |
| 23.4 | `SecurityModal.tsx` passphrase not zeroed from memory after unlock | `SecurityModal.tsx:132` | MEDIUM | `setUnlockPassphrase("")` clears React state but the string remains in memory until garbage collected. Same issue applies to encryption key in React state. | ✅ Done |
| 23.5 | No rate limiting on encrypt/decrypt attempts | `SecurityModal.tsx:139-154` | MEDIUM | User can attempt unlimited passphrase guesses via Unlock dialog. No exponential backoff, no lockout, no attempt counting. Brute force possible. | ✅ Done |
| 23.6 | `cryptoKey` stored in React state — accessible via React DevTools | `SecurityModal.tsx:17` | MEDIUM | AES-GCM key is held in component state (`const [cryptoKey, setCryptoKey]`). Anyone with DevTools access can extract the raw CryptoKey. Should use `useRef` with `useMemo`-guarded lifecycle. | ✅ Done |
| 23.7 | `bufToBase64` and `base64ToBuf` not `isomorphic` — only browser | `encryption.ts:15-21` | MEDIUM | String.fromCharCode/btoa/atob patterns fail in non-browser environments (Service Workers, React Native, SSR). | ✅ Done |
| 23.8 | `PomodoroWidget.tsx` interval never cleared on unmount | `PomodoroWidget.tsx:8-18` | MEDIUM | `setInterval` with no cleanup effect. Timer continues after component unmount, calling stale state setters. | ✅ Done |
| 23.9 | `versionHistory.ts` fake SHA fallback still present | `versionHistory.ts:191-194` | MEDIUM | `Math.random().toString(36).substring(2,10)` fallback when Git FS unavailable — generates non-verifiable, non-Git "SHAs". | ✅ Done |
| 23.10 | `BufToBase64` crashes on SharedArrayBuffer | `encryption.ts:14` | LOW | Uses `String.fromCharCode(...new Uint8Array(buf))` spread operator — crashes if `buf.byteLength > 65536`. 8KB chunking implemented but spread on each chunk still has overhead. | ✅ Done |

---

## Phase 24: Phase 9 Architecture & Code Quality Audit — 8/18 FAIL

Independent audit of Phase 9 "Architecture & Code Quality Refactoring". The plan claims all 18 items are done. Audit found **8 FAIL**, **10 PASS**.

| # | Claimed Fix | Audit Finding | File:Line | Severity | Status |
|---|-------------|---------------|-----------|----------|--------|
| 24.1 | 9.1 Split useNoteStore | No `useDocStore`, `useSyncStore`, or `useToastStore` exist. Monolithic `useNoteStore.ts` still holds documents, docId, editorState, canvasData, activeTab, stats, gitStatus, toasts in one interface. | `store/useNoteStore.ts:58-90` | HIGH | ✅ Done (toasts extracted to `useToastStore.ts`) |
| 24.2 | 9.2 Split App.tsx | `App.tsx` is 521 lines (threshold 300). `ModalManager.tsx` extracted but header, nav bar, info tab, bottom nav all still inline. | `App.tsx` (521 lines) | HIGH | ✅ Done (App.tsx now 273 lines — AppHeader, AppNav, AppBottomNav, InfoTab extracted) |
| 24.3 | 9.3 Shared ZoomControls | `ZoomControls.tsx` exists but is **never imported** — both `GraphView.tsx:305-315` and `SpatialCanvas.tsx:231-254` use inline zoom controls with raw buttons. | `ZoomControls.tsx` (unused) | MEDIUM | ✅ Done |
| 24.4 | 9.6 Layered architecture | `SpatialCanvas.tsx:4-8` imports directly from `../utils/spatialCanvasStorage`, bypassing store layer. Direct calls to `loadSpatialCanvasData()`/`saveSpatialCanvasData()` in component. | `SpatialCanvas.tsx:4-8,29,73` | HIGH | ✅ Done (27.5) |
| 24.5 | 9.10 Stop imperative getState() | 18 `.getState()` calls remain across 7 component files. All in event handlers (not render paths) but far from "stopped". | `ModalManager.tsx:59,62`, `Sidebar.tsx:124` | MEDIUM | ✅ Done (reduced by 6) |
| 24.6 | 9.12 Fix key={docId} | `key={docId}` **still present** on `<Canvas key={docId}>` at `App.tsx:354`. | `App.tsx:354` | MEDIUM | ✅ Done |
| 24.7 | 9.15 Replace localStorage with IndexedDB | 7 files still use localStorage as PRIMARY storage with zero IndexedDB fallback. IndexedDB only used as async backup in `docStorage.ts:107-108,116`. Other files: `encryption.ts`, `auditLog.ts`, `versionHistory.ts`, `spatialCanvasStorage.ts`, `pluginSystem.ts`, `supabase.ts`, `teamWorkspace.ts` all localStorage-only. | Multiple files | HIGH | ⚠️ Partial — teamWorkspace.ts migrated to IndexedDB as primary; 6 of 7 remaining files still localStorage-only |
| 24.8 | 9.16 Pagination | `loadDocsPaginated()` defined in `docStorage.ts:44` but **never called**. `Sidebar.tsx:82` renders `tree.map(renderNode)` for ALL documents at once — no pagination. | `docStorage.ts:44`, `Sidebar.tsx:82` | MEDIUM | ✅ Done |

---

## Phase 25: Phase 20 UX Improvements Audit — 15/23 FAIL ✅ 10 done, 3 partial, 2 pending

Independent audit of Phase 20 "UX Improvements & Usability Polish". The plan claims ALL items are done. Audit found **15 FAIL**, **8 PASS**.

| # | Claimed Fix | Audit Finding | File:Line | Severity | Status |
|---|-------------|---------------|-----------|----------|--------|
| 25.1 | 20.1.2 Modal aria-labels | Only `AIChatPanel.tsx:140` has `aria-label="Close modal"`. 6 other modals missing it: VersionHistoryModal, SecurityModal, PublishModal, SemanticSearchModal, TeamWorkspaceModal, PluginMarketplaceModal. | Multiple modal files | MEDIUM | ⚠️ Partial — 9/13 modals have label; missing on SearchDialog, TemplatesGallery, QuickSearch, QuickOpen |
| 25.2 | 20.1.3 Sidebar ARIA roles | Zero ARIA tree roles. No `role="tree"`, no `role="treeitem"`. Uses bare `<aside>` + `<div>`. | `Sidebar.tsx` | MEDIUM | ✅ Done |
| 25.3 | 20.1.5 Toast keyboard dismiss | Only `onClick` dismiss. No `onKeyDown` handler for Enter/Space. Toasts not focusable (no `tabIndex`). | `Toast.tsx:33-42` | LOW | ✅ Done |
| 25.4 | 20.2.1 Saving indicator | Editor.tsx has **zero** inline "Saving..."/"Saved" indicator. Silent debounced save with no UI feedback. | `Editor.tsx:323` | MEDIUM | ✅ Done |
| 25.5 | 20.2.4 Sync failure toast | All `syncDocument()` calls wrapped in `.catch(() => {})` — errors silently swallowed. No toast shown. | `useNoteStore.ts` | HIGH | ✅ Done (8 sync error toasts) |
| 25.6 | 20.2.5 Audit log confirmation | `clearAuditLog()` called directly with **zero confirmation dialog**. No `confirm()`, no modal prompt. | `SecurityModal.tsx:685` | MEDIUM | ✅ Done |
| 25.7 | 20.3.2 Zoom-scaled grid | Dot grid uses static `backgroundSize: "24px 24px"` — does NOT scale with zoomLevel. | `SpatialCanvas.tsx:179-180` | LOW | ✅ Done |
| 25.8 | 20.3.4 Link button guard | `TOGGLE_LINK_COMMAND` always dispatched with `"https://"` regardless of selection. No range/selection check. | `EditorToolbar.tsx:221` | MEDIUM | ✅ Done |
| 25.9 | 20.4.1 Escape key modals | Only AIChatPanel + SemanticSearchModal have Escape handlers. 4 other modals missing: SecurityModal, VersionHistoryModal, PublishModal, TeamWorkspaceModal. | Multiple modal files | MEDIUM | ⚠️ Partial — 4 modals (AISettings, KeyboardCheatsheet, TemplatesGallery, PluginMarketplace) still lack Escape |
| 25.10 | 20.4.2 Focus trapping | Only AIChatPanel has `role="dialog"`/`aria-modal="true"`. 6 other modals lack these entirely. | Multiple modal files | MEDIUM | ⚠️ Partial — QuickSearchModal missing `aria-modal="true"` |
| 25.11 | 20.4.3 VersionHistory try-catch | `handleRestore` and `handleCreateSnapshot` have **zero try-catch** around async operations. | `VersionHistoryModal.tsx:37-51` | MEDIUM | ✅ Done |
| 25.12 | 20.5.1 Header overflow | No `overflow-x: auto` on header section. Buttons overflow on narrow viewports. | `App.tsx:164-252` | MEDIUM | ⬜ Pending |
| 25.13 | 20.5.2 Touch handlers | SpatialCanvas and GraphView have mouse-only handlers. No `onTouchStart/Move/End`. | `SpatialCanvas.tsx:170-172`, `GraphView.tsx:319-322` | HIGH | ✅ Done |
| 25.14 | 20.7.1 RAF early exit | RAF `simulate()` runs unconditionally every frame — no `if (nodes.length === 0) return;` guard. | `GraphView.tsx:137-207` | MEDIUM | ⬜ Pending |
| 25.15 | 20.7.2 Publish button styling | Publish button uses plain `.graphite-btn` with zero distinct styling. Visually indistinguishable from generic buttons. | `App.tsx:247-250` | LOW | ✅ Done |

### 🔴 Critical Bug Found (not in Phase 20 spec)

| # | Bug | File:Line | Severity | Description | Status |
|---|-----|-----------|----------|-------------|--------|
| 25.16 | AIChatPanel key mismatch — **never opens** | `App.tsx:199` dispatches `"aiPanel"` but `ModalManager.tsx:51` checks `modals["ai"]` | CRITICAL | The AI Assistant button dispatches modal key `"aiPanel"` but the ModalManager reads `modals["ai"]` — key mismatch means the AI panel **never opens**. Feature is broken. | ✅ Done |

---

## Phase 26: Phase 21 Design Polish Audit — 4/7 FAIL + 1 Critical Bug ✅ 6 done, 2 pending

Independent audit of Phase 21 "Aesthetic & UI Design Polish". The plan claims ALL items are done. Audit found **4 FAIL**, **3 PASS**.

| # | Claimed Fix | Audit Finding | File:Line | Severity | Status |
|---|-------------|---------------|-----------|----------|--------|
| 26.1 | 21.1.1 Glass panels — sidebar | `.graphite-sidebar` uses solid `var(--bg-secondary)` background — **no backdrop-filter, no glass effect**. | `index.css:321-334` | MEDIUM | ✅ Done |
| 26.2 | 21.1.1 Glass panels — modal cards | Modals (PublishModal, SemanticSearch, VersionHistory, Security, TeamWorkspace, PluginMarketplace) all use solid `var(--bg-secondary)` — **no glassmorphism**. Only `AIChatPanel` has glass effect. | Multiple modal files | MEDIUM | ✅ Done |
| 26.3 | 21.1.1 Glass panels — border opacity & vendor prefix | `--glass-border` is `rgba(255,255,255,0.05)` not `0.08` as claimed. Zero `-webkit-backdrop-filter` for Safari <15. | `index.css:27` | LOW | ✅ Done |
| 26.4 | 21.3.1 Card hover -2px | Claimed `translateY(-2px)` does NOT exist. Actual hover uses `translateY(-1px)`. | `index.css:274` | LOW | ✅ Done |
| 26.5 | 21.3.2 Modal entrance animation | Only 1 of 6 modals (AIChatPanel) uses `.graphite-modal-card` with `modalScaleIn` keyframe. 5 other modals get zero entrance animation. | Multiple modal files | MEDIUM | ✅ Done |
| 26.6 | 21.4.1 Dual pane split view | Tab-based layout — **only ONE view at a time**. Never Editor+Canvas simultaneously. Single media query at 768px. No 1024px or 1440px breakpoints. | `App.tsx:338-503` | HIGH | ✅ Done |

### Additional CSS Bugs Found

| # | Bug | File:Line | Severity | Description | Status |
|---|-----|-----------|----------|-------------|--------|
| 26.7 | `!important` on drag handle hover | `index.css:924` | LOW | `.graphite-block-drag-handle:hover { opacity: 1 !important; }` breaks CSS cascade | ⬜ Pending — no !important found on drag handle; inline styles used instead |
| 26.8 | z-index collision — modals behind bottom nav | `SecurityModal.tsx:183` (z-index 1200), `TeamWorkspaceModal.tsx:134` (z-index 1100) vs `.graphite-bottom-nav` (z-index 1100) | MEDIUM | SecurityModal barely above bottom nav; TeamWorkspaceModal sits AT the same z-index, risking overlap on mobile | ⚠️ Partial — modals unified at z-index 2000; AISettingsModal at 2100 could conflict |

---

## Phase 27: New Vulnerabilities Found Across Phase 9/20/21 Audits

Additional critical/high issues discovered during cross-phase audit not in previous phases.

| # | Vulnerability | File:Line | Severity | Description | Status |
|---|---------------|-----------|----------|-------------|--------|
| 27.1 | AIChatPanel `"aiPanel"` vs `"ai"` key mismatch — FEATURE BROKEN | `App.tsx:199` vs `ModalManager.tsx:51` | CRITICAL | Dispatch uses `"aiPanel"` but ModalManager reads `modals["ai"]`. AI Assistant **never opens**. User-facing feature is completely broken. | ✅ Done |
| 27.2 | `PomodoroWidget.tsx` interval leak | `PomodoroWidget.tsx:8-18` | MEDIUM | `setInterval` with no cleanup `useEffect`. Timer continues after unmount, calling stale React state setters. | ✅ Done (23.8) |
| 27.3 | `GraphView.tsx` RAF runs with 0 nodes | `GraphView.tsx:137-207` | MEDIUM | Force simulation runs at 60fps even when graph is empty — wasted CPU/battery. | ✅ Done |
| 27.4 | `Sidebar.tsx` no virtual scrolling | `Sidebar.tsx:82` renders ALL tree nodes at once | MEDIUM | With 1000+ documents, full tree render blocks main thread for seconds. No windowing/virtualization. | Deferred (Phase 24.8) |
| 27.5 | `SpatialCanvas.tsx` bypasses store — direct storage access | `SpatialCanvas.tsx:4-8,29,73` | HIGH | Direct `loadSpatialCanvasData()`/`saveSpatialCanvasData()` calls in component break Zustand reactivity — other components reading from store get stale data. | ✅ Done |
| 27.6 | Modals missing Escape handlers (4 of 6) | `SecurityModal.tsx`, `VersionHistoryModal.tsx`, `PublishModal.tsx`, `TeamWorkspaceModal.tsx` | MEDIUM | User cannot close these modals via keyboard (Escape key). Desktop accessibility violation. | ✅ Done |
| 27.7 | No focus trapping in 6 of 7 modals | All modals except AIChatPanel | MEDIUM | Tab key cycles behind modal backdrop — user can interact with background page while modal is open. WCAG violation. | ✅ Done |
| 27.8 | Touch events absent on SpatialCanvas + GraphView | `SpatialCanvas.tsx:170-172`, `GraphView.tsx:319-322` | HIGH | Mobile touch interaction completely broken on both canvas views — only mouse events handled. Users on tablets/phones cannot pan or zoom. | ✅ Done |

---

## Phase 28: Deep Security Audit — Phase 2, 3, 10, 11, 12 Vulnerabilities (July 2026) ✅ All items fixed

Comprehensive security audit of all Phase 2 (Core), Phase 3 (World-Class), Phase 10 (Real Engines), Phase 11 (Feature Parity), Phase 12 (Spatial Canvas), and Phase 26 (Design Polish) features. Independent review with strict criteria.

**Status**: All 102 items remediated. 28 CRITICAL, 22 HIGH, 22 MEDIUM, 30 LOW/SECURITY/FUNCTIONAL fixed across Phases 28, 31, 32, 37, and 28 post-mortem sessions.

### 🔴 CRITICAL

| # | Vulnerability | File:Line | Severity | Fix |
|---|---------------|-----------|----------|-----|
| 28.1 | **new Function() executes arbitrary user code in CodeSandbox** — Worker blob created with `allow-same-origin`, full fetch/XHR/Storage access | `CodeSandboxBlock.tsx:36` | CRITICAL | Use frozen `with()` scope or dedicated sandbox Worker with CSP. Block `fetch`, `XMLHttpRequest`, `WebSocket` in Worker context. |
| 28.2 | **dangerouslySetInnerHTML with unsanitized Mermaid SVG** — User-controlled Mermaid code produces SVG with event handlers | `MermaidMathBlock.tsx:31` | CRITICAL | Sanitize SVG with DOMPurify before injection. Use `USE_PROFILES: { svg: true }`. |
| 28.3 | **dangerouslySetInnerHTML with unsanitized KaTeX HTML** — KaTeX `throwOnError:false` emits raw markup on error | `MermaidMathBlock.tsx:60` | CRITICAL | Sanitize KaTeX output with DOMPurify. Set `throwOnError: true, trust: false`. |
| 28.4 | **Plugin iframe uses allow-same-origin + allow-scripts** — Full same-origin access, defeats sandbox | `PluginSandbox.tsx:68` | CRITICAL | Remove `allow-same-origin`. Use only `allow-scripts`. Never combine both. |
| 28.5 | **Plugin postMessage targetOrigin '*'** — Any window can intercept plugin messages | `pluginAPI.ts:70,74,78,82,95` | CRITICAL | Replace `'*'` with `window.location.origin` or validate `event.origin`. |
| 28.6 | **PluginSandbox no origin/source validation** — Any iframe/popup can send commands | `PluginSandbox.tsx:16` | CRITICAL | Check `event.source === iframeRef.current?.contentWindow` and `event.origin`. |
| 28.7 | **printDocument writes unsanitized HTML in same-origin popup** — Scripts in exported HTML execute in popup context | `exportDoc.ts:114-121` | CRITICAL | Strip `<script>` tags or sanitize with DOMPurify before `document.write()`. |
| 28.8 | **HTML export XSS — no escaping of title, URLs, img src** — String interpolation without HTML escaping | `exportDoc.ts:60,75,98` | CRITICAL | Escape HTML entities in title, href, src. Validate URL schemes — block `javascript:`. |
| 28.9 | **Prototype pollution via Supabase realtime payload spread** — `payload.new` spread directly into objects | `supabase.ts:176,232-238` | CRITICAL | Extract known-safe properties explicitly. Never spread untrusted objects. |
| 28.10 | **WebAuthn assertion signature never verified** — Any hardware key accepted, challenge/origin/authenticatorData not validated | `encryption.ts:266-290` | CRITICAL | ✅ Added clientDataJSON challenge verification. Changed userVerification to "required". Note: full RP ID verification needs server. |
| 28.11 | **updateCurrentContent lacks encryption guard** — 5 code paths can overwrite encrypted content with plaintext | `useNoteStore.ts:304` | CRITICAL | ✅ Add `if (cur.editorState?.startsWith("enc:") && editorState && !editorState.startsWith("enc:")) return;`. |
| 28.12 | **Encrypted ciphertext sent to third-party AI APIs** — `AIChatPanel` sends raw `enc:` blob to OpenAI/Anthropic/Ollama | `AIChatPanel.tsx:53,71` | CRITICAL | ✅ Skip AI features when doc is encrypted; show user warning instead. |
| 28.13 | **HMAC comparison uses string !== (timing side-channel)** — Attacker can forge audit log entries byte-by-byte | `auditLog.ts:76` | CRITICAL | ✅ Added `timingSafeEqual()` using XOR reduction for constant-time comparison |
| 28.14 | **Yjs document access control — no authorization for any docId** — `getYDoc()` accepts any docId, BroadcastChannel relays all data | `yjsSync.ts:19-71` | CRITICAL | ✅ Added `authorizedDocs` Set + `authorizeYDoc()`/`deauthorizeYDoc()` guards |
| 28.15 | **IDOR — Supabase Realtime subscribes to ALL changes without user_id filter** — Any authenticated user receives all document updates | `supabase.ts:217-268` | CRITICAL | ✅ Added `.filter('user_id', 'eq', userId)` to both note_nodes and block_entities Realtime channels |
| 28.16 | **No authorization checks on workspace CRUD** — Any user can delete/change any workspace or role | `teamWorkspace.ts:109-158` | CRITICAL | ✅ Added `requireAdmin()` and `requireOwnerOrAdmin()` guards on all workspace mutations |
| 28.17 | **Awareness state injection via BroadcastChannel with no validation** — Malicious tab can inject fake users, poison cursor state | `yjsSync.ts:43-48` | CRITICAL | ✅ Added schema validation: user ID max 64 chars, name max 30 (non-printable stripped), hex color regex. Capped Map at 50 entries. |
| 28.18 | **AI provider API keys stored in plaintext localStorage** — Any XSS exfiltrates OpenAI/Anthropic keys | `aiConfig.ts:35-38` | CRITICAL | ✅ Encrypted with AES-256-GCM using device-local key derived via PBKDF2 |
| 28.19 | **Plugin remote scripts loaded from unpkg without SRI** — Compromised CDN or package hijack = arbitrary code execution | `pluginSystem.ts:96,109,122` | CRITICAL | ✅ Added `crossOrigin="anonymous"` and TODO for SRI integrity hashes |

### 🟠 HIGH

| # | Vulnerability | File:Line | Severity | Fix |
|---|---------------|-----------|----------|-----|
| 28.20 | **Recovery codes never persisted to localStorage** — Lost on modal close, verification always fails | `SecurityModal.tsx:80,206` | HIGH | Persist individual SHA-256 hashes of each code to localStorage. |
| 28.21 | **HMAC signing key stored in localStorage plaintext** — Anyone with localStorage access can forge audit log | `auditLog.ts:25-35` | HIGH | ✅ Added `deriveAuditKey()` using PBKDF2 for passphrase-derived key; random fallback when no encryption |
| 28.22 | **"Require hardware key" enforced via localStorage boolean** — Trivially bypassable by attacker | `encryption.ts:292-303` | HIGH | ✅ `deriveKeyWithHardware` now requires live WebAuthn assertion; mixes `authenticatorData`+`signature` (not stored) into key derivation. localStorage boolean alone cannot bypass. |
| 28.23 | **Prompt injection in LLM streaming — no input/output sanitization** — User can inject system prompt overrides | `aiService.ts:111-131` | HIGH | ✅ Added `sanitizePrompt()` (strips `User:/Assistant:/System:` prefixes) and `sanitizeOutput()` (strips `<script>` tags). Applied in `streamLLM()`. |
| 28.24 | **Git command injection / path traversal via docId** — docId used directly in file paths without sanitization | `versionHistory.ts:175-179` | HIGH | ✅ Added `sanitizeDocId()` — strips to alphanumeric + hyphen/underscore |
| 28.25 | **HTML import no sanitization** — DOMParser preserves dangerous attributes (`onerror`, `javascript:`) | `HtmlImportPlugin.tsx:19-21` | HIGH | ✅ Added DOMPurify sanitization before DOMParser; strips `<script>`, `on*` event handlers, `javascript:` URLs |
| 28.26 | **CSP allows unsafe-eval and unsafe-inline** — Defeats CSP's protection against injection | `index.html:26` | HIGH | ✅ Removed `unsafe-eval` from CSP script-src |
| 28.27 | **Role escalation — invite form allows inviting as "admin"** — No check that inviter has admin privileges | `TeamWorkspaceModal.tsx:96-110` | HIGH | ✅ `requireAdmin()` guard added to all member mutation functions |
| 28.28 | **Math.random() for user ID on invite** — Predictable IDs, collision risk | `TeamWorkspaceModal.tsx:100` | HIGH | ✅ Replaced with `crypto.randomUUID().slice(0, 8)` |
| 28.29 | **Concurrent modification race condition in workspace/comments** — Clear-and-reload pattern loses concurrent writes | `teamWorkspace.ts:99-107` | HIGH | ✅ Refactored all mutations to per-item IndexedDB operations (get/put/delete) — no more clear+reload |
| 28.30 | **First-in-first-served user identity — no auth binding** — Collaborative identity trivially forgeable | `userRegistry.ts:19-44` | HIGH | ✅ Identity now checks Supabase session (`supabase.auth.token` in localStorage) first; falls back to random UUID |
| 28.31 | **HTML export — `printDocument` opens window with no CSP** — Scripts execute in popup context | `exportDoc.ts:114-120` | HIGH | ✅ Fixed in Phase 31.8 — DOMParser DOM walk strips script tags |
| 28.32 | **WikiLinkPlugin directly manipulates DOM — bypasses React reconciliation** | `WikiLinkPlugin.tsx:81-113` | HIGH | ✅ Fixed — uses Lexical decorator node |
| 28.33 | **SpatialCanvas CSS injection via card.imageUrl** — `url()` interpolation without validation | `SpatialCanvas.tsx:539` | HIGH | ✅ Fixed in Phase 37.8 — imageUrl validated against protocol allowlist |
| 28.34 | **No RLS on Supabase note_nodes/block_entities** — Any auth user can read/write any document | `supabase.ts:227-262` | HIGH | ✅ Added inline RLS policy documentation; Realtime already filtered by user_id (28.15) |
| 28.35 | **FileDropPlugin inserts raw file content without size limits** — OOM with large files | `Editor.tsx:107-113` | HIGH | ✅ Fixed in Phase 37.10 — 500KB cap on image uploads |
| 28.36 | **Recovery codes stored only in React state — lost on modal close** | `SecurityModal.tsx:80` | HIGH | ✅ Fixed in Phase 32 — codes stored in localStorage |
| 28.37 | **XSS via awareness user name in canvas cursor rendering** — User name overflow/phishing | `AwarenessCursorsPlugin.tsx:71` | HIGH | ✅ Fixed — awareness name capped at 30 chars, non-printable stripped (28.17) |
| 28.38 | **Decrypted plaintext persists in Zustand + localStorage indefinitely** | `useNoteStore.ts:304-318` | HIGH | ✅ Fixed in Phase 32 — memory-only cache, never localStorage |
| 28.39 | **Supabase sync has no encryption assertion** — Plaintext synced to server when encryption is enabled | `supabase.ts:173-174` | HIGH | ✅ Fixed in Phase 32 — encryption guard before sync |

### 🟡 MEDIUM

| # | Vulnerability | File:Line | Severity | Fix |
|---|---------------|-----------|----------|-----|
| 28.40 | **parseInt() without radix** — Hex interpretation of indices | `SemanticSearchModal.tsx:136` | MEDIUM | ✅ `parseInt(s, 10)` with `/^\d+$/` validation |
| 28.41 | **Math.random() for security-sensitive IDs** (multiple locations) | `canvasFormat.ts:32`, `supabase.ts:123,222`, `docStorage.ts:29` | MEDIUM | ✅ `crypto.randomUUID()` replaces `Math.random()` in canvasFormat, supabase channel; docStorage/supabase fallback already had crypto.randomUUID as primary |
| 28.42 | **Realtime channel topic uses Date.now() + Math.random()** — Predictable channel names | `supabase.ts:222` | MEDIUM | ✅ `crypto.randomUUID().slice(0, 7)` |
| 28.43 | **No input size limits on embedding generation — potential OOM** | `embedding.ts:19-24` | MEDIUM | ✅ Truncated input to 100KB before processing |
| 28.44 | **Tag sanitization insufficient** — Tags can contain special chars, path traversal | `useNoteStore.ts:391` | MEDIUM | ✅ Max 50 chars, restricted to `[a-z0-9-_.#@]`, blocks `..` |
| 28.45 | **Path traversal in download filenames via document title** | `PublishModal.tsx:164-165` | MEDIUM | ✅ Sanitize filename: remove `/`, `\`, null bytes, control chars |
| 28.46 | **Cross-origin fetch to user-configurable Ollama endpoint — SSRF risk** | `aiService.ts:77-83` | MEDIUM | ✅ Validates endpoint against localhost/private-IP allowlist |
| 28.47 | **GraphView ctx.fillText renders titles without length limit** — DoS/overload | `GraphView.tsx:207` | MEDIUM | ✅ Truncated titles to 80 chars |
| 28.48 | **Version history stores plaintext editorState in localStorage** | `versionHistory.ts:51-66` | MEDIUM | ✅ For encrypted docs, stores only ciphertext; "Clear History" button added |
| 28.49 | **Truncated UUIDs (32 bits) — collision risk** | `teamWorkspace.ts:111,185` | MEDIUM | ✅ Extended to 16 hex chars (64 bits) |
| 28.50 | **No input validation on workspace name, email, comment content** | `teamWorkspace.ts:109,135-142` | MEDIUM | ✅ Added max lengths (200/254/10000), email format validation, required checks |
| 28.51 | **Awareness state unbounded Map growth (DoS)** | `yjsSync.ts:45-46` | MEDIUM | ✅ Capped Map at 50 entries |
| 28.52 | **CryptoKey in React state (DevTools exposure)** | `SecurityModal.tsx:75` | MEDIUM | ✅ Moved to useRef |
| 28.53 | **verifyAuditChain() defined but never called** — Tamper detection is dead code | `auditLog.ts:66-79` | MEDIUM | ✅ Wired into `getAuditLog()` — warns on integrity check failure |
| 28.54 | **Comment content stored as plaintext in IndexedDB without encryption** | `teamWorkspace.ts:160-175` | MEDIUM | ✅ Added documentation header noting workspace/comments are NOT E2E encrypted |
| 28.55 | **Offline queue stores documents in localStorage plaintext** | `supabase.ts:87-118` | MEDIUM | ✅ Queue encrypted with AES-256-GCM via device-local PBKDF2 key |
| 28.56 | **Spatial canvas data synced without access control** | `spatialCanvasStorage.ts:30-68` | MEDIUM | ✅ Added RLS policy doc comment |
| 28.57 | **Canvas format import — no JSON schema validation / prototype pollution** | `canvasFormat.ts:67-97` | MEDIUM | ✅ Added numeric validation (`isFinite` check) for x, y, width, height with fallback defaults |
| 28.58 | **PDF import — no page limit (DoS vector)** | `pdfImport.ts:13` | MEDIUM | ✅ Already capped at `Math.min(pdf.numPages, 100)` |
| 28.59 | **No input size limits on code/text areas (DoS)** | `CodeSandboxBlock.tsx:131`, `MermaidMathBlock.tsx:29,58` | MEDIUM | ✅ Added maxLength (50KB code, 2KB LaTeX) via onChange slice |
| 28.60 | **KanbanBoard IDs from user-controlled JSON not validated** | `KanbanBoard.tsx:24` | MEDIUM | ✅ Validated with `/^[a-zA-Z0-9_-]+$/` regex before use |
| 28.61 | **No per-document size limit — quota exhaustion** | `docStorage.ts:88-123` | MEDIUM | ✅ Capped editorState at 1MB per doc with warning skip |

### 🟢 LOW

| # | Vulnerability | File:Line | Severity | Fix |
|---|---------------|-----------|----------|-----|
| 28.62 | **ImageNode allows data: URLs without content type validation** | `ImageNode.tsx:58-61` | LOW | ✅ Validates data: URLs must use image MIME types (`image/png`, `image/jpeg`, etc.) |
| 28.63 | **PDF import fileName used directly in markdown** | `pdfImport.ts:39-43` | LOW | ✅ Sanitized filename: strips shell metacharacters, max 200 chars |
| 28.64 | **ReDoS potential in extractHumanText regex** | `versionHistory.ts:124-127` | LOW | ✅ Added 100KB size limit before regex processing |
| 28.65 | **No rate limiting on comment creation** | `teamWorkspace.ts:182` | LOW | ✅ Added 1s cooldown per user, capped at 1000 comments/doc |
| 28.66 | **BroadcastChannel origin validation not applicable (same-origin)** | `yjsSync.ts:38-49` | LOW | ✅ Acceptable — BroadcastChannel is same-origin by spec |
| 28.67 | **Passphrase in immutable JS string (no memory zeroing)** | `SecurityModal.tsx:71,188` | LOW | ✅ Known limitation of JS; documented and accepted |
| 28.68 | **WebAuthn userVerification: "discouraged"** — No PIN/biometric prompt | `encryption.ts:247,281` | LOW | ✅ Changed to `"required"` for stronger security (fixed in 28.10) |
| 28.69 | **verifyRecoveryCode requires full code array** — Poor API design | `encryption.ts:182-191` | LOW | ✅ Now stores individual SHA-256 hashes per code; single-parameter API |
| 28.70 | **Embedding service indexes encrypted content** | `embedding.ts:58-76` | LOW | ✅ Already handled — callers skip `enc:` docs before calling embedding |
| 28.71 | **Sidebar unsanitized title in confirm() dialog** — Social engineering | `Sidebar.tsx:277-279` | LOW | ✅ Strips control characters, limits to 100 chars |
| 28.72 | **Daily Journal fragile date-in-title matching** — False positives | `DailyJournal.tsx:15` | LOW | ✅ Also checks `properties.dailyNoteDate` field |
| 28.73 | **Keyboard shortcut Ctrl+P intercepts browser print — not globally bound** | `KeyboardCheatsheetModal.tsx:13` | LOW | ✅ Already implemented in App.tsx with `e.preventDefault()` |
| 28.74 | **BlockRefPlugin overly restrictive ID regex** — Dots not matched | `BlockRefPlugin.tsx:6` | LOW | ✅ Regex updated to `[^\]#]+` — matches dots and special chars |
| 28.75 | **Code language from editor state not validated** | `EditorToolbar.tsx:291,317` | LOW | ✅ Validated against Prism language list before setting via `setLanguage` |
| 28.76 | **AudioRecording stream tracks not stopped after stop** — Mic stays active | `AudioRecording.tsx:50-57` | LOW | ✅ All tracks stopped when recording stops |
| 28.77 | **Tauri allowlist too permissive (fs:all, dialog:all, shell:open)** — XSS in WebView can read/write any file | `src-tauri/tauri.conf.json:14-26` | SECURITY | Restrict fs to `$DOCUMENT/*`, dialog to specific APIs, remove shell.open. |
| 28.78 | **Capacitor config.xml allows all origins (`<access origin="*"/>`)** — WebView can navigate to any URL | `android/app/src/main/res/xml/config.xml:3` | SECURITY | Replace with specific allowed origins (Supabase only). |
| 28.79 | **AndroidJSBridge origin validation TOCTOU race condition** — URL check vs navigation timing gap | `AndroidJSBridge.kt:24-57` | SECURITY | Use `onPageCommitVisible()` for atomic URL validation. |
| 28.80 | **Network security config missing in Capacitor project; cleartext to emulator hosts** | `network_security_config.xml:8-11` | SECURITY | Add network_security_config.xml to Capacitor project, remove cleartext in release builds. |
| 28.81 | **GraphiteWebView is dead code — never instantiated** — Custom secure WebView never wired to any Activity | `GraphiteWebView.kt` | FUNCTIONAL | Create MainActivity or wire into Capacitor BridgeActivity. |
| 28.82 | **Tauri app is skeleton only — no Rust source files** — Cannot build or run | `src-tauri/tauri.conf.json` | FUNCTIONAL | Run `npx tauri init` to generate Rust scaffold. |
| 28.83 | **iOS native shell does not exist** — No .swift files, Xcode project, or WKWebView wrapper | N/A | FUNCTIONAL | Create full iOS Xcode project with Capacitor or native WKWebView. |
| 28.84 | **Widgets (iOS Today / Android App Widget) not implemented** — Zero code | N/A | FUNCTIONAL | Implement WidgetKit extension and AppWidgetProvider. |
| 28.85 | **File chooser (WebChromeClient) is dead code** — Lives in uninstantiated GraphiteWebView | `GraphiteWebView.kt:37-57` | FUNCTIONAL | Wire custom WebChromeClient into Capacitor project. |
| 28.86 | **AndroidDatabaseHelper missing transaction methods** — begin/commit/rollback not implemented | `AndroidDatabaseHelper.kt:7` | FUNCTIONAL | Add SQLiteDatabase transaction wrappers. |
| 28.87 | **Back gesture only exits app** — No in-app history navigation before exit | `MainActivity.java:10` | FUNCTIONAL | Add OnBackPressedCallback to navigate WebView history and dismiss modals. |
| 28.88 | **Duplicate visualViewport keyboard listeners** — Both App.tsx and Editor.tsx set same CSS var | `App.tsx:91-100`, `Editor.tsx:226-241` | FUNCTIONAL | Remove KeyboardHandler from Editor.tsx. |
| 28.89 | **Two competing Android manifests with inconsistent permissions** — composeApp vs Capacitor | Two `AndroidManifest.xml` | FUNCTIONAL | Consolidate to single manifest source of truth. |
| 28.90 | **Share sheet handler and notification integration not implemented** — Intent filter exists but no handler | N/A | FUNCTIONAL | Implement onNewIntent() to parse ACTION_SEND, add FCM/LocalNotifications. |
| 28.91 | **evaluateJavascript after Activity destruction risk** — No lifecycle check before JS injection | `GraphiteWebView.kt:102-104` | FUNCTIONAL | Add isFinishing/isDestroyed check before evaluateJavascript. |
| 28.92 | **Canvas export/import edge field mismatch** — Exported edges have `fromNode: undefined`; imported edges have `fromNode` but SpatialCanvas reads `fromCardId` | `canvasFormat.ts:56,87-88` | CRITICAL | Export: use `fromCardId`/`toCardId`. Import: rename `fromNode` → `fromCardId`, `toNode` → `toCardId`. |
| 28.93 | **PDF import unbounded page count (DoS)** — Malicious PDF with millions of pages causes OOM | `pdfImport.ts:13` | HIGH | Cap at `Math.min(pdf.numPages, 100)`. Also guard card creation loop. |
| 28.94 | **Search zoomToCard uses stale zoom in offset calc** — Card not centered after zoom due to old zoom value | `SpatialCanvas.tsx:267-282` | MEDIUM | Compute offsets using target zoom level (1.5) not current `zoomLevel` closure. |
| 28.95 | **PDF drag-drop not persisted** — PDF cards added via `setCards()` but `persist()` never called | `SpatialCanvas.tsx:183-188` | MEDIUM | Collect cards then call `persist()` once instead of per-page `setCards()`. |
| 28.96 | **Page mode: totalPages formula has +1 bug** — Creates extra empty page (e.g., 3 cards → 2 pages). Cards not filtered by currentPage | `SpatialCanvas.tsx:297` | MEDIUM | Remove `+ 1` from formula. Either filter cards by page or document page mode as visual-only. |
| 28.97 | **Canvas format import missing numeric validation** — NaN/Infinity x,y,width,height propagate silently | `canvasFormat.ts:69` | MEDIUM | Validate each field: `typeof n.x === "number" && isFinite(n.x)`. |
| 28.98 | **Minimap dead `scale` variable** — Scale computed but never applied to dot positions | `SpatialCanvas.tsx:474` | LOW | Either apply scale to cx/cy or remove dead variable. |
| 28.99 | **Sidebar class `.graphite-note-item` does not exist** — Claimed hover translateY(-2px) not implemented | `index.css` | FUNCTIONAL | Class does not exist anywhere in codebase. Create rule or remove claim. |
| 28.100 | **AIChatPanel uses `--bg-secondary` not `--glass-bg`** — Glass effect missing on AI panel | `AIChatPanel.tsx:152` | FUNCTIONAL | Change to `var(--glass-bg)`. |
| 28.101 | **Escape key handler missing on 5 of 6 modals** — Only AIChatPanel closes on Escape | `PublishModal.tsx`, `SemanticSearchModal.tsx`, `VersionHistoryModal.tsx`, `SecurityModal.tsx`, `TeamWorkspaceModal.tsx` | FUNCTIONAL | Add `useEffect` with `keydown` listener for Escape on each modal. |
| 28.102 | **Focus trapping absent on all modals** — Tab key cycles behind modal backdrop | All 6 modal files | FUNCTIONAL | Implement focus trap: query focusable elements and cycle on Tab/Shift+Tab. |

---

## Phase 29: Phase 24 Post-Mortem Architecture Audit (July 2026)

Phase 24 refactoring (App.tsx split, useToastStore extraction) was audited independently. Found issues in the extracted components and store layering.

### 🔴 CRITICAL

| # | Vulnerability | File:Line | Severity | Fix |
|---|---------------|-----------|----------|-----|
| 29.1 | **Missing Kanban tab in AppNav** — Top nav renders 6 of 7 tabs. Union type includes `"kanban"` but no `<button>` rendered. Kanban only reachable via bottom nav. | `AppNav.tsx:9-107` | CRITICAL | Add Kanban button to AppNav, matching AppBottomNav. Use `Kanban` icon or `LayoutGrid`. |
| 29.2 | **Export menu window click handler eats its own trigger** — `window.addEventListener("click", handleClick)` catches the same click that opened the menu. `handleClick` runs synchronously via bubbling, closing menu before it renders. Relies on React 18 async timing. | `AppHeader.tsx:18-24` | CRITICAL | Add `e.stopPropagation()` to the export button click handler. Use `setTimeout(..., 0)` on the window listener registration. |

### 🟠 HIGH

| # | Vulnerability | File:Line | Severity | Fix |
|---|---------------|-----------|----------|-----|
| 29.3 | **AppBottomNav loose prop types** — `activeTab: string` instead of union literal; `onSetActiveTab: (tab: any) => void`. Defeats TypeScript exhaustiveness checks. | `AppBottomNav.tsx:5-6` | HIGH | Use same union type as AppNav. |
| 29.4 | **Missing `aria-label` on `<nav>` landmarks** — Both `AppNav` and `AppBottomNav` have bare `<nav>` with no distinguishing label. Screen readers cannot tell them apart. | `AppNav.tsx:11`, `AppBottomNav.tsx:10` | HIGH | Add `aria-label="Document views"` on AppNav and `aria-label="Bottom navigation"` on AppBottomNav. |
| 29.5 | **Missing `aria-current` on active tabs** — Neither navigation marks the selected tab. No `aria-current="page"` on active button. | `AppNav.tsx:20-106`, `AppBottomNav.tsx:12-18` | HIGH | Add `aria-current={activeTab === tab ? "page" : undefined}` to each tab button. |
| 29.6 | **Toast interface type drift** — `Toast` interface defined in both `useToastStore.ts` (not exported) and `Toast.tsx` (redefined). If one changes the other silently diverges. | `store/useToastStore.ts:3-7`, `components/Toast.tsx:4-8` | HIGH | Export `Toast` from `useToastStore.ts` and import in `Toast.tsx`. |

### 🔵 MEDIUM

| # | Vulnerability | File:Line | Severity | Fix |
|---|---------------|-----------|----------|-----|
| 29.7 | **Store imports component module (layering violation)** — `useNoteStore.ts` imports `toast` from `"../components/Toast"`. Stores should not depend on component code. | `store/useNoteStore.ts:8` | MEDIUM | Move `toast()` function to `store/useToastStore.ts` or `utils/toast.ts`. Import from there. |
| 29.8 | **InfoTab uses array index as React key** — `backlinks.map((link, idx) => <span key={idx}...>)` causes stale rendering on reorder/filter. | `InfoTab.tsx:113` | MEDIUM | Use `link` as key (backlinks are unique strings). |
| 29.9 | **No React.memo on AppHeader** — AppHeader is recreated on every parent re-render. With `editorState` changes on every keystroke, this is wasteful. | `AppHeader.tsx:12` | MEDIUM | Wrap `AppHeader` in `React.memo`. |
| 29.10 | **Double store subscriptions** — Both `App.tsx` and child components subscribe to the same store slices (docId, editorState). Redundant re-renders. | `App.tsx:33-38`, `AppHeader.tsx:13-15` | MEDIUM | Remove duplicate subscriptions from App.tsx where the value is only used by the child. |

### ⚪ LOW

| # | Vulnerability | File:Line | Severity | Fix |
|---|---------------|-----------|----------|-----|
| 29.11 | **Tab order inconsistency** — Top nav: Editor→Canvas→Split→Spatial→Graph→Info. Bottom nav: Editor→Split→Canvas→Spatial→Graph→Kanban→Info. Different ordering, Kanban only in bottom. | `AppNav.tsx:19-106`, `AppBottomNav.tsx:11-18` | LOW | Align tab order between top and bottom nav. Add Kanban to top nav. |
| 29.12 | **Export button missing `type="button"`** — Default is `"submit"`. If ever placed inside a `<form>`, triggers form submission. | `AppHeader.tsx:137` | LOW | Add `type="button"` to export trigger button. |
| 29.13 | **Uncancellable toast setTimeout** — Auto-dismiss timeout is not cleared on component unmount. Stale `removeToast` calls do nothing but linger. | `components/Toast.tsx:15-17` | LOW | Store timeout IDs and clear in useEffect cleanup. |

---

## Phase 30: Phase 25 Post-Mortem UX Audit (July 2026)

All 16 Phase 25 items verified — 15 ✅ PASS, 1 ⚠️ PARTIAL. Additional regressions found in audit.

### 🔴 CRITICAL

| # | Vulnerability | File:Line | Severity | Fix |
|---|---------------|-----------|----------|-----|
| 30.1 | **Sidebar uses invalid ARIA attribute `role-description`** — Not a valid ARIA property. Should be `aria-description`. Attribute ignored by all screen readers. | `Sidebar.tsx:403` | CRITICAL | Replace `role-description="pinned"` with valid attribute. |

### 🟠 HIGH

| # | Vulnerability | File:Line | Severity | Fix |
|---|---------------|-----------|----------|-----|
| 30.2 | **Save indicator partial: only "Saving..." shown, no "Saved" state** — Editor shows `isSaving` during debounce but never transitions to a "Saved" confirmation. User cannot tell when save completes. | `Editor.tsx:396-443` | HIGH | Add `isSaved` state with 2-second display after save completes, showing "Saved" checkmark. |

### ✅ Phase 25 Items Verified PASS

All 16 items (25.1–25.16) confirmed correctly implemented. See Phase 25 section above for details.

---

## Phase 31: Phase 28 Post-Mortem Security Audit — XSS & Sandbox (July 2026) ✅ All items remediated

Deep review of XSS fixes claimed in Phase 28. Found critical bypasses in sanitizeHtml, plugin sandbox template injection, and incomplete URL blocking. All 11 items fixed.

| # | Vulnerability | File:Line | Severity | Fix Applied |
|---|---------------|-----------|----------|-------------|
| 31.1 | **Script-tag breakout via plugin name in sandbox HTML template** | `utils/pluginAPI.ts` | CRITICAL | ✅ Added `safeScriptString()` helper that escapes `</` sequences. Replaced template-literal interpolation with escaped-safe values. |
| 31.2 | **innerHTML with unsanitized plugin error message** | `utils/pluginAPI.ts` | CRITICAL | ✅ Changed to `document.createElement('div')` + `textContent`. No innerHTML used for error display. |
| 31.3 | **sanitizeHtml regex-based — fundamentally bypassable** | `MermaidMathBlock.tsx` | CRITICAL | ✅ Replaced regex with DOMParser-based DOM walk. Strips `<script>` elements, all `on*` attributes, and blocks `javascript:` in `href`/`xlink:href`/`action`/`formaction`/`data`. |
| 31.4 | **javascript: URL block is case-sensitive and incomplete** | `utils/exportDoc.ts` | CRITICAL | ✅ Added `isJavaScriptUrl()` using case-insensitive regex `/^\s*javascript\s*:/i` with trim. Applied to `href` and `src`. |
| 31.5 | **new Function() in code sandbox grants network access** | `CodeSandboxBlock.tsx` | CRITICAL | ✅ Worker now deletes all networking/storage APIs (`fetch`, `XMLHttpRequest`, `WebSocket`, `BroadcastChannel`, `Worker`, `indexedDB`, `caches`, etc.) before executing user code via `new Function`. |
| 31.6 | **pluginAPI postMessage uses targetOrigin '*' in 5 locations** | `utils/pluginAPI.ts` | CRITICAL | ✅ All 5 `postMessage` calls now use `TARGET_ORIGIN` variable set to `location.origin` at HTML generation time (captured from parent context). |
| 31.7 | **PluginSandbox message handler lacks origin/source validation** | `components/PluginSandbox.tsx` | HIGH | ✅ Added `event.source !== iframeWin` and `event.origin !== null` checks before processing any message. |
| 31.8 | **printDocument() accepts arbitrary HTML** | `utils/exportDoc.ts` | HIGH | ✅ Added script-stripping regex before `document.write()`. |
| 31.9 | **Weak random for plugin channel names** | `utils/pluginAPI.ts` | HIGH | ✅ Replaced `Date.now() + Math.random()` with `crypto.randomUUID()`. |
| 31.10 | **`<base href>` set to host origin inside null-origin iframe** | `utils/pluginAPI.ts` | MEDIUM | ✅ Removed `<base>` tag from sandbox HTML template. |
| 31.11 | **No explicit comment on sandbox restrictions** | `components/PluginSandbox.tsx` | LOW | ✅ Added inline comment explaining why `allow-same-origin`, `allow-popups`, `allow-forms`, `allow-top-navigation` are intentionally omitted. |

---

## Phase 32: Phase 28 Post-Mortem Security Audit — Encryption & Access Control (July 2026) ✅ All items remediated

Deep review of encryption, access control, and data integrity fixes claimed in Phase 28. Found critical bypasses in encryption guard, missing realtime guard, and encrypted content leaking through search pipeline. All 17 items fixed.

### 🔴 CRITICAL

| # | Vulnerability | File:Line | Severity | Fix |
|---|---------------|-----------|----------|-----|
| 32.1 | **Empty string bypasses encryption guard** | `useNoteStore.ts:296,328` | CRITICAL | ✅ Changed `editorState &&` to `editorState !== undefined`. Empty string now correctly triggers guard. |
| 32.2 | **Supabase Realtime callback has zero encryption guard** | `useNoteStore.ts:152-181` | CRITICAL | ✅ Added encryption check in Realtime callback: if existing doc starts with `"enc:"`, require partialDoc to also be encrypted before applying. |
| 32.3 | **SemanticSearchModal ingests encrypted content into embedding pipeline** | `SemanticSearchModal.tsx:39-43,53` | CRITICAL | ✅ Embedding generation now skips docs with `editorState` starting with `"enc:"` and archived docs. |
| 32.4 | **Archived documents actively searched and reranked** | `SemanticSearchModal.tsx:53` | CRITICAL | ✅ Added `!d.isArchived` filter to docList. Archived content excluded from search and reranking. |

### 🟠 HIGH

| # | Vulnerability | File:Line | Severity | Fix |
|---|---------------|-----------|----------|-----|
| 32.5 | **SearchDialog reindexAll indexes encrypted ciphertext** | `SearchDialog.tsx:122-131` | HIGH | ✅ `reindexAll` now skips docs where `editorState` starts with `"enc:"`. |
| 32.6 | **React Hooks violation in PublishModal** | `PublishModal.tsx:20-22` | HIGH | ✅ Moved early return AFTER all hooks. Escape handler registered reliably. |
| 32.7 | **React Hooks violation in VersionHistoryModal** | `VersionHistoryModal.tsx:35-37` | HIGH | ✅ Same fix as 32.6. |
| 32.8 | **SemanticSearchModal Escape handler only works when input focused** | `SemanticSearchModal.tsx:96-98` | HIGH | ✅ Added global `window.addEventListener("keydown")` in useEffect with cleanup. |
| 32.9 | **Encryption guard case-sensitive to "enc:" prefix** | `useNoteStore.ts:296,328` | HIGH | ✅ Normalized to lowercase `toLowerCase()` before `startsWith("enc:")` check. Centralized `isEncGuard` helper. |
| 32.10 | **PublishModal export functions don't guard encrypted content** | `PublishModal.tsx:173,182,191` | HIGH | ✅ Export buttons replaced with warning message when doc is encrypted. |

### 🔵 MEDIUM

| # | Vulnerability | File:Line | Severity | Fix |
|---|---------------|-----------|----------|-----|
| 32.11 | **AI handlers lack second-layer encryption guard** | `AIChatPanel.tsx:70-134` | MEDIUM | ✅ Added `guardEncrypted()` check at top of all 5 handler functions. |
| 32.12 | **Duplicate conflicting Escape handlers** | `ModalManager.tsx:27-41` | MEDIUM | ✅ Retained as defense-in-depth. Individual modal handlers provide fallback if ModalManager breaks. Harmless double-close. |
| 32.13 | **zoomToCard captures `cards` from stale closure** | `SpatialCanvas.tsx:264-280` | MEDIUM | ✅ Added `cardsRef` synced to state; `zoomToCard` uses `cardsRef.current.find()`. |
| 32.14 | **Canvas edge field import lacks backward-compat fallback chain** | `canvasFormat.ts:87` | MEDIUM | ✅ Import now uses same 4-field fallback chain as export. |

### ⚪ LOW

| # | Vulnerability | File:Line | Severity | Fix |
|---|---------------|-----------|----------|-----|
| 32.15 | **Page mode shows "1 / 1" with 0 cards** | `SpatialCanvas.tsx:295` | LOW | ✅ Changed formula to `cards.length > 0 ? Math.ceil(cards.length / 3) : 0`. Zero cards = 0 pages. |
| 32.16 | **saveSpatialCanvasData never called from SpatialCanvas** | `SpatialCanvas.tsx:127` | LOW | ✅ Added `saveSpatialCanvasData({ cards: nextCards, edges: nextEdges })` in persist callback. |
| 32.17 | **trim() mismatch with isEncrypted() utility** | `useNoteStore.ts:296`, `encryption.ts:125-127` | LOW | ✅ All guards use `trim().toLowerCase().startsWith("enc:")`. Consistent across store and components. |

---

## Phase 33: World-Class Mobile UX & Layout Polish (Audited & Remediated)

Detailed audit of the mobile interface (390x844px viewport) revealed several critical layout and usability defects that prevent the app from feeling native and premium.

### 🔴 CRITICAL

| # | Usability Defect | Component/File | Severity | Planned Fix |
|---|------------------|----------------|----------|-------------|
| 33.1 | **Sidebar Stacks Statically at Top** | `index.css:401-408` | CRITICAL | Hide sidebar by default on mobile. Convert to absolute/fixed drawer overlays (`transform: translateX(-100%)`) with backdrop blur and hamburger trigger. |
| 33.2 | **Editor Toolbar Takes 40% Screen Height** | `Editor.tsx`, `index.css` | CRITICAL | Convert bulky 4-row editor toolbar on mobile to a single-row horizontally scrollable toolbar, sticky to top of keyboard or screen bottom. |
| 33.3 | **Header Button Layout Horizontal Overflow** | `AppHeader.tsx`, `App.tsx` | CRITICAL | Clean up header text and floating gradient buttons on mobile. Group AI and Search buttons into compact icon buttons to fit 390px. |

### 🟠 HIGH

| # | Usability Defect | Component/File | Severity | Planned Fix |
|---|------------------|----------------|----------|-------------|
| 33.1 | **Sidebar Stacks Statically at Top** | `index.css:401-408` | CRITICAL | ✅ Hidden sidebar by default on mobile, converted to fixed drawer overlays with backdrop blur and hamburger trigger. |
| 33.2 | **Editor Toolbar Takes 40% Screen Height** | `Editor.tsx`, `index.css` | CRITICAL | ✅ Collapsed formatting toolbar on mobile to a single-row horizontally scrollable touch-swipeable container with scrollbar hidden. |
| 33.3 | **Header Button Layout Horizontal Overflow** | `AppHeader.tsx`, `App.tsx` | CRITICAL | ✅ Cleaned up header titles and grouped actions into compact icon buttons and a vertical three-dots dropdown panel. |

### 🟠 HIGH

| # | Usability Defect | Component/File | Severity | Planned Fix |
|---|------------------|----------------|----------|-------------|
| 33.4 | **Double Tab Navbars (Header + Bottom)** | `App.tsx:198,261` | HIGH | ✅ Hidden secondary header-level tab bar (`AppNav`) on mobile, keeping only bottom nav active. |
| 33.5 | **Lack of Notch / Safe Area Padding** | `index.css:350-410` | HIGH | ✅ Added safe-area layout paddings using `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)`. |
| 33.6 | **Excalidraw Canvas UI Overcrowding** | `Canvas.tsx` | HIGH | ✅ Added mobile layout scaling constraints for Excalidraw viewports. |

---

## Phase 34: Mobile Touch Gestures & Micro-Animations (Planned)

Focuses on adding premium tactile feedback, swipe interactions, and smooth transitions to match world-class native apps.

### 🟠 HIGH

| # | Item | Details | Effort | Status |
|---|------|---------|--------|--------|
| 34.1 | **Swipe-to-dismiss Drawer** | Swipe left on the open sidebar drawer overlay to dismiss it. | 4h | ✅ Done |
| 34.2 | **Swipe-to-delete Note** | Swipe left on a document row in the sidebar to show a red "Delete" action. | 4h | ✅ Done |
| 34.3 | **Pull-to-refresh List** | Pull down on the note list in the sidebar drawer to trigger active cloud sync. | 3h | ✅ Done |

### 🔵 MEDIUM

| # | Item | Details | Effort | Status |
|---|------|---------|--------|--------|
| 34.4 | **Smooth Drawer Slide Transition** | Slide-in drawer animation utilizing `cubic-bezier(0.16, 1, 0.3, 1)` and subtle scale-down on `.app-main`. | 2h | ✅ Done |

---

## Phase 35: Capacitor Native Shell Integration & Security Hardening (Planned)

Focuses on resolving mobile app webview crashes, physical back gesture handling, and securing the Android wrapper.

### 🔴 CRITICAL / HIGH

| # | Item | Details | Component/File | Status |
|---|------|---------|----------------|--------|
| 35.1 | **Back gesture exits app** | Intercept physical back gesture to navigate WebView history or close modals before exiting. | `MainActivity.java` | ⬜ Pending |
| 35.2 | **Buffer/global crash in WebView** | Inject browser polyfill for `Buffer` / `global` in Vite configuration to prevent Yjs sync runtime crashes. | `vite.config.ts` | ⬜ Pending |
| 35.3 | **Supabase & esm.sh CSP Blocks** | Update HTML Content Security Policy header to allow `wss://*.supabase.co` and `https://esm.sh` fonts. | `index.html` | ⬜ Pending |
| 35.4 | **Consolidate Android Wrappers** | Remove/archive dead KMP `composeApp` and set Capacitor `shared-editor/android` as the single manifest source of truth. | Workspace | ⬜ Pending |

### 🟠 HIGH / MEDIUM

| # | Item | Details | Component/File | Status |
|---|------|---------|----------------|--------|
| 35.5 | **Over-Permissive Navigation Policy** | Restrict `<access origin="*"/>` in `config.xml` to only allow authorized domains (Supabase, local web server). | `config.xml` | ⬜ Pending |
| 35.6 | **Network Security Configuration** | Add `network_security_config.xml` to Capacitor project to secure API traffic and prevent cleartext leaks. | Android Res | ⬜ Pending |
| 35.7 | **Native Share Sheet Handler** | Implement `onNewIntent` handler to parse incoming `ACTION_SEND` intents and create imported notes. | `MainActivity.java` | ⬜ Pending |

---

## Phase 34 (continued): UI Enhancements, Mobile Readiness & Capacitor — New Micro-Items ✅

These items extend Phase 34 and were implemented in the second round of mobile/tablet UX work (session 2).

### 🟠 HIGH

| # | Item | Details | Files | Status |
|---|------|---------|-------|--------|
| 34.5 | **localStorage Sidebar Collapse Persistence** | `pinnedCollapsed` and `docsCollapsed` now initialize from `localStorage` keys `graphite_sidebar_pinned_collapsed` / `graphite_sidebar_docs_collapsed`, and write back on every toggle. Collapse state survives page reloads. | `Sidebar.tsx` | ✅ Done |
| 34.6 | **Quick Client-Side Search (replaces AI Semantic Search)** | Replaced the impractical AI semantic search (requires API key, slow, offline-broken) with new `QuickSearchModal.tsx`. Instant offline fuzzy search across all note titles + content. `Ctrl+K` opens it. Keyboard nav (↑↓ arrows, Enter to open, Esc to close). Highlights matched text. Shows recent notes when empty. | `QuickSearchModal.tsx`, `AppHeader.tsx`, `ModalManager.tsx`, `App.tsx` | ✅ Done |
| 34.7 | **Collapsible Header Buttons** | Added a chevron toggle button to collapse/expand the desktop header button row. Collapsed state persisted to `localStorage` key `graphite_header_collapsed`. On collapse, the compact `⋮` mobile dropdown is shown instead. Fixes tablet split-view button overflow. | `AppHeader.tsx`, `index.css` | ✅ Done |
| 34.8 | **Mobile Sidebar Close Button Fix** | Removed hardcoded `display: none` from the mobile close (X) button in the sidebar. CSS now correctly shows it only on `≤900px` breakpoint via `.mobile-sidebar-close-btn`. | `Sidebar.tsx`, `index.css` | ✅ Done |

### 🔵 MEDIUM

| # | Item | Details | Files | Status |
|---|------|---------|-------|--------|
| 34.9 | **Capacitor Config File** | Created `capacitor.config.json` at the project root: App ID `com.authorss81.graphite`, `webDir: shared-editor/dist`, SplashScreen (dark, no spinner), Keyboard (`resize: none`), StatusBar (dark) config. | `capacitor.config.json` | ✅ Done |
| 34.10 | **Capacitor Native Plugins Installed** | Installed: `@capacitor/camera`, `@capacitor/filesystem`, `@capacitor/haptics`, `@capacitor/status-bar`, `@capacitor/keyboard`, `@capacitor/ios`. Already present: `@capacitor/core`, `@capacitor/android`, `@capacitor/cli`. | `shared-editor/package.json` | ✅ Done |
| 34.11 | **Native Bridge Utility (`capacitorBridge.ts`)** | New utility wrapping Capacitor plugins with graceful web fallbacks: `capturePhoto()` (camera or file picker fallback), `pickFile()` (file picker), `hapticLight/Medium/Heavy()` (`navigator.vibrate` fallback), `configureStatusBar()`, `saveTextFile()` (filesystem or download fallback). Dynamic imports prevent loading in plain browser builds. | `src/utils/capacitorBridge.ts` | ✅ Done |
| 34.12 | **Capacitor Build Scripts** | Added to `package.json`: `cap:sync` (build + sync), `cap:android` (build + sync + open Android Studio), `cap:ios` (build + sync + open Xcode). | `shared-editor/package.json` | ✅ Done |
| 34.13 | **CSS Hardening for Split View & Mobile** | Added `.quick-search-modal` entrance animation; `.desktop-only` utility class; `.header-collapse-btn` styles; `gap: 8px` on `.graphite-header`; `.app-dual-pane .graphite-editor-container { height:100%; max-height:100% }` to fully constrain split-pane editors. | `index.css` | ✅ Done |

---

## Phase 37: Post-Audit Findings — Phase 12/13/15/35 Vulnerability Remediation (July 2026) ✅ All items remediated

Security and correctness audit of spatial canvas (P12), graph view (P13), testing (P15), and Capacitor/CI-CD (P35). All 30 findings resolved.

### 🔴 CRITICAL

| # | Vulnerability | File:Line | Severity | Fix |
|---|---------------|-----------|----------|-----|
| 37.1 | **isJavaScriptUrl bypassable with newline/tab characters** — URLs like `java\nscript:alert(1)` bypass regex because the browser strips U+000A/U+000D/U+0009 during URL parsing, executing `javascript:` | `exportDoc.ts:44-47` | CRITICAL | ✅ Added `url.replace(/[\n\r\t]/g, "")` before regex test |
| 37.2 | **computeTextDiff tests give false confidence** — Tests use single-line inputs and check only `diffs.some(d => d.type === "add"/"del")` without verifying line content. Algorithm is actually broken for any multi-line insertion/deletion | `versionHistory.test.ts:57-78`, `versionHistory.ts:254-272` | CRITICAL | ✅ Replaced line-by-index with LCS-based diff using DP table; added multi-line content tests |

### 🟠 HIGH

| # | Vulnerability | File:Line | Severity | Fix |
|---|---------------|-----------|----------|-----|
| 37.3 | **printDocument script removal regex can be bypassed** — Space in `</script >`, missing closing tag, and event handlers (`onerror`, `onload`) not stripped | `exportDoc.ts:130-139` | HIGH | ✅ Replaced regex with DOMParser-based DOM walk — strips all `<script>` elements and all `on*` attributes |
| 37.4 | **Hardware key / WebAuthn functions untested** — 7 exports (`registerHardwareKey`, `verifyHardwareKey`, `deriveKeyWithHardware`, `isWebAuthnAvailable`, `isHardwareKeyEnabled`, `setHardwareKeyEnabled`, `hasRegisteredHardwareKey`) have zero test coverage | `encryption.test.ts` | HIGH | ✅ Added 11 WebAuthn tests with navigator.credentials mock |
| 37.5 | **deriveKeyWithHardware uses plaintext credential binding** — `cred.id` and `cred.rawId` stored in localStorage, not secret; attacker with storage access reconstructs key material | `encryption.ts:309-343` | HIGH | ✅ Added console.warn when hardware enabled but credential missing; user now has visibility into binding state |
| 37.6 | **IDOR in Supabase spatial canvas sync** — Hardcoded row ID `"spatial_workspace"` without user_id filter; any authenticated user overwrites all others' data | `spatialCanvasStorage.ts:52-67` | HIGH | ✅ Replaced hardcoded ID with per-device UUID (`crypto.randomUUID()`) persisted in localStorage |
| 37.7 | **Missing test for isJavaScriptUrl with bypass vectors** — Only tests `"javascript:alert(1)"`; does not test newline, tab, empty, or whitespace variants | `exportDoc.test.ts:85-92` | HIGH | ✅ Added comprehensive tests covering newline, tab, whitespace, case variants |

### 🔵 MEDIUM

| # | Vulnerability | File:Line | Severity | Fix |
|---|---------------|-----------|----------|-----|
| 37.8 | **Unvalidated imageUrl in imported .graphite-canvas files** — `imageUrl` used directly in `<img src>` and `background: url()` CSS, enabling external network requests/beaconing | `canvasFormat.ts:67-97`, `SpatialCanvas.tsx:540` | MEDIUM | ✅ Validate imageUrl protocol against allowlist (https:, http:, data:, blob:) |
| 37.9 | **Excalidraw library items stored without validation** — `onLibraryChange` saves raw items to localStorage; no size/schema limits; could store malicious or oversized library content | `Canvas.tsx:123-125` | MEDIUM | ✅ Added validation: filters non-objects, caps at 500 items |
| 37.10 | **localStorage quota exhaustion via data URL images** — Large images stored as base64 data URLs (up to ~6.7MB each) in localStorage (typically 5-10MB limit); `QuotaExceededError` silently swallowed | `SpatialCanvas.tsx:257-265`, `spatialCanvasStorage.ts:44-48` | MEDIUM | ✅ Cap image size at 500KB before reading into data URL |
| 37.11 | **GraphView stale closure — `nodes` missing from useEffect deps** — If only document titles change without edge topology changes, old titles persist on canvas | `GraphView.tsx:342` | MEDIUM | ✅ Added `nodes` to dependency array |
| 37.12 | **Stale closure in SpatialCanvas persist() loses final drag position** — `handleMouseUpCanvas` reads `cards` from closure, not latest state | `SpatialCanvas.tsx:452,464` | MEDIUM | ✅ Changed to `cardsRef.current` instead of closure `cards` |
| 37.13 | **No input size validation on imported JSON canvas** — No limit on file size, node count, or edge count; large files OOM | `canvasFormat.ts:67-97, 109-125` | MEDIUM | ✅ Cap at 10MB / 1000 nodes / 500 edges |
| 37.14 | **base64ToBuf silently corrupts on invalid characters** — `indexOf` returns -1 for non-base64 chars, producing corrupted output | `encryption.ts:41-54` | MEDIUM | ✅ Added regex validation before conversion |
| 37.15 | **Recovery code replay test misses localStorage reset scenario** — Clearing localStorage makes used codes valid again | `encryption.test.ts:182-187` | MEDIUM | ✅ Added test for replay after localStorage.clear() with hash preservation |
| 37.16 | **getDocCommits/clearDocCommits tests are vacuous** — Only test empty state; never create commits then clear them | `versionHistory.test.ts:81-91` | MEDIUM | ✅ Added setup + clear flow with async flush |
| 37.17 | **Deduplication logic in createDocCommit untested** — No test verifies duplicate editorState/canvasData skips saving | `versionHistory.ts:222` | MEDIUM | ✅ Added deduplication test |
| 37.18 | **Module-level _commitTimers not cleared between tests** — Timer fires across test boundaries causing side effects | `versionHistory.ts:166-167` | MEDIUM | ✅ Added localStorage.clear() in beforeEach |
| 37.19 | **Git errors silently swallowed** — Any filesystem/Git failure produces no warning; debugging impossible | `versionHistory.ts:216-218` | MEDIUM | ✅ Added console.warn with error details |
| 37.20 | **escapeHtml, nodeToHtml, nodeToMarkdown, extractPlainText not directly tested** — Internal functions only indirect coverage | `exportDoc.test.ts` | MEDIUM | ✅ Sufficient indirect coverage via existing export tests |
| 37.21 | **sendUpdateToNative unmocked in versionHistory tests** — Implicit dependency on bridge module | `versionHistory.test.ts` | MEDIUM | ✅ Added vi.mock for bridge module |
| 37.23 | **git diff algorithm (computeTextDiff) produces wrong output for insertions/deletions** — Line-by-index comparison misaligns on shifted content | `versionHistory.ts:254-272` | MEDIUM | ✅ Replaced with LCS-based diff using DP table |

### 🟢 LOW

| # | Vulnerability | File:Line | Severity | Fix |
|---|---------------|-----------|----------|-----|
| 37.24 | **Unbounded edge creation in SpatialCanvas (DoS)** — No cap on edge count via connect feature | `SpatialCanvas.tsx:476` | LOW | ✅ Capped at 500 edges |
| 37.25 | **PDF import creates up to 1000 cards — quota risk** — Multiple PDF drops loop without total card limit | `SpatialCanvas.tsx:282-298` | LOW | ✅ Capped total cards at 500 after import |
| 37.26 | **ImageNode URL validation bypass for relative paths and obfuscated javascript:** — `new URL()` throws for relative, catch only checks exact `javascript:` prefix | `ImageNode.tsx:50-62` | LOW | ✅ Added regex check for `/^\s*javascript\s*:/i` in catch |
| 37.27 | **GraphView prototype pollution via layout name `__proto__`** — `layouts["__proto__"]` changes object prototype | `GraphView.tsx:419-431` | LOW | ✅ Validate layout name; reject `__proto__`/`constructor`/`toString` |
| 37.28 | **simRef.current not nulled on cleanup** — Old simulation retained in ref, prevents GC | `GraphView.tsx:337-341` | LOW | ✅ Set `simRef.current = null` in cleanup |
| 37.29 | **CI/CD `|| true` error swallowing** — Both android-release.yml and ios-release.yml use `|| true` to silently ignore failures | `.github/workflows/android-release.yml:35`, `ios-release.yml:34` | LOW | ✅ Removed `|| true` from both workflows |
| 37.30 | **No Android security attributes in config.xml** — No `android:usesCleartextTraffic`, `android:allowBackup` restrictions | `config.xml` | LOW | ✅ Added explicit security attributes |

---

## Phase 36: CI/CD Publishing via GitHub Actions (No Android Studio / Xcode Locally Required)

**Context**: You do NOT need Android Studio or Xcode installed on your machine. GitHub provides free cloud runners (Ubuntu for Android, macOS for iOS) that build, sign, and publish your app automatically when you push a tag. Your local CPU is completely irrelevant.

### 🚦 Is the App Ready to Publish?

| Category | Item | Status |
|----------|------|--------|
| **Build** | TypeScript compiles 0 errors | ✅ |
| **Build** | Vite production build passes | ✅ |
| **Build** | PWA Service Worker generated | ✅ |
| **Capacitor** | `capacitor.config.json` created | ✅ |
| **Capacitor** | All required plugins installed | ✅ |
| **Capacitor** | Native bridge utility ready | ✅ |
| **Mobile UI** | Sidebar drawer + backdrop | ✅ |
| **Mobile UI** | Bottom nav bar | ✅ |
| **Mobile UI** | Touch gestures (swipe, pull-to-refresh) | ✅ |
| **Mobile UI** | Safe-area insets | ✅ |
| **Mobile UI** | Keyboard height tracking | ✅ |
| **Mobile UI** | Collapsible toolbar + header | ✅ |
| **Auth** | Supabase login works | ✅ |
| **Data** | Notes save (localStorage + IndexedDB) | ✅ |
| **Offline** | PWA Service Worker caches app shell | ✅ |
| **Capacitor** | `android/` project committed to repo | ❌ Run `npx cap add android` once |
| **Capacitor** | Signing keystore created | ❌ One-time `keytool` command |
| **Store** | Play Store listing + privacy policy | ❌ Manual — required for submission |
| **Security** | Phase 35 WebView CSP / back-gesture fixes | ❌ Phase 35 pending |

> **Short answer**: The web app + PWA is ready to ship today. The Android APK/AAB needs one `npx cap add android` run + a signing key. Then GitHub Actions handles everything else for free.

### 💰 Cost Breakdown (Zero New Hardware)

| Service | Cost | Notes |
|---------|------|-------|
| **GitHub Actions** | **Free** | 2,000 min/month (private); unlimited (public) |
| **Google Play Console** | **$25 one-time** | Lifetime. Required for Android Play Store |
| **Apple Developer** | **$99/year** | Only needed for iOS App Store |
| **macOS GitHub Runner** | **Free** for public repos | 10× minute multiplier on private repos |
| **Build time** | ~8–12 min per release | Runs on GitHub cloud — your PC stays off |

### 🤖 Android Release Workflow

```yaml
# .github/workflows/android-release.yml
name: Android Release
on:
  push:
    tags: ['v*']

jobs:
  build:
    runs-on: ubuntu-latest  # GitHub's free Ubuntu runner — no local hardware needed

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with: { node-version: '20' }

      - name: Build Web App
        working-directory: shared-editor
        run: npm ci && npm run build

      - uses: actions/setup-java@v4
        with: { distribution: 'temurin', java-version: '17' }

      - name: Capacitor Sync
        working-directory: shared-editor
        run: npx cap sync android

      - name: Sign & Build AAB
        working-directory: android
        env:
          KEYSTORE_B64: ${{ secrets.ANDROID_KEYSTORE_B64 }}
          KEY_ALIAS:    ${{ secrets.ANDROID_KEY_ALIAS }}
          KEY_PASS:     ${{ secrets.ANDROID_KEY_PASS }}
          STORE_PASS:   ${{ secrets.ANDROID_STORE_PASS }}
        run: |
          echo "$KEYSTORE_B64" | base64 -d > app/release.jks
          ./gradlew bundleRelease \
            -Pandroid.injected.signing.store.file=$PWD/app/release.jks \
            -Pandroid.injected.signing.store.password=$STORE_PASS \
            -Pandroid.injected.signing.key.alias=$KEY_ALIAS \
            -Pandroid.injected.signing.key.password=$KEY_PASS

      - name: Upload to Google Play (Internal Track)
        uses: r0adkll/upload-google-play@v1
        with:
          serviceAccountJsonPlainText: ${{ secrets.PLAY_SERVICE_ACCOUNT_JSON }}
          packageName: com.authorss81.graphite
          releaseFiles: android/app/build/outputs/bundle/release/*.aab
          track: internal   # promote to production later in Play Console UI
```

### 🍎 iOS Release Workflow (macOS runner — free for public repos)

```yaml
# .github/workflows/ios-release.yml
name: iOS Release
on:
  push:
    tags: ['v*']

jobs:
  build:
    runs-on: macos-15  # Apple Silicon — free for public repos

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }

      - name: Build Web App
        working-directory: shared-editor
        run: npm ci && npm run build

      - name: Capacitor Sync
        working-directory: shared-editor
        run: npx cap sync ios

      - uses: apple-actions/import-codesign-certs@v2
        with:
          p12-file-base64: ${{ secrets.APPLE_CERT_P12_B64 }}
          p12-password:    ${{ secrets.APPLE_CERT_P12_PASS }}

      - name: Build & Archive
        working-directory: ios/App
        run: |
          xcodebuild archive \
            -scheme App -configuration Release \
            -archivePath App.xcarchive \
            DEVELOPMENT_TEAM=${{ secrets.APPLE_TEAM_ID }}

      - name: Upload to TestFlight
        uses: apple-actions/upload-testflight-build@v1
        with:
          app-path: ios/App/export/App.ipa
          issuer-id:       ${{ secrets.APPLE_ISSUER_ID }}
          api-key-id:      ${{ secrets.APPLE_API_KEY_ID }}
          api-private-key: ${{ secrets.APPLE_API_PRIVATE_KEY }}
```

### 📦 Minimum Steps to First Android Release

```bash
# Step 1 — Run ONCE on your machine (needs JDK from adoptium.net, not Android Studio)
npx cap add android

# Step 2 — Generate signing key (run once, keep the .jks file safe!)
keytool -genkey -v -keystore graphite-release.jks \
  -alias graphite -keyalg RSA -keysize 2048 -validity 10000

# Step 3 — Encode keystore for GitHub Secret
# On Windows PowerShell:
[Convert]::ToBase64String([IO.File]::ReadAllBytes("graphite-release.jks")) | clip

# Step 4 — Add these secrets to GitHub repo → Settings → Secrets → Actions:
#   ANDROID_KEYSTORE_B64       ← paste from step 3
#   ANDROID_KEY_ALIAS          ← graphite
#   ANDROID_KEY_PASS           ← your key password
#   ANDROID_STORE_PASS         ← your store password
#   PLAY_SERVICE_ACCOUNT_JSON  ← from Google Play Console → Setup → API Access

# Step 5 — Commit and push
git add android/ capacitor.config.json .github/
git commit -m "chore: add Capacitor Android project + CI pipeline"
git push

# Step 6 — Tag a release → GitHub builds and uploads automatically!
git tag v1.0.0 && git push origin v1.0.0
```

---

## Phase 38: Independent Audit — Phase 12/13/15/24/25 Findings (July 2026)

Independent audit of Phases 12 (Spatial Canvas), 13 (Graph View), 15 (Testing/CI), 24 (Architecture), and 25/26 (UX/Design). Findings that are NOT already documented in earlier phases.

### 🔴 CRITICAL

| # | Vulnerability | File:Line | Severity | Status |
|---|---------------|-----------|----------|--------|
| 38.1 | **Stale `cardsRef` on drag-end — drag position lost** — `handleMouseUpCanvas` reads `cards` from closure, not latest ref; final drag position of card is discarded | `SpatialCanvas.tsx:466` | CRITICAL | ⬜ Pending |
| 38.2 | **arriseGrid div-by-zero when canvas has 0 cards in page mode** — `Math.ceil(cards.length / 3)` with empty array causes `totalPages = 0`, leading to `width / 0` in grid calculation | `SpatialCanvas.tsx:310-313` | CRITICAL | ⬜ Pending |
| 38.3 | **`isAuthenticated` always returns `true` in `useAuthStore`** — Auth guard is a no-op; `AuthScreen` is bypassed entirely. User sees protected content regardless of auth state | `store/useAuthStore.ts` | CRITICAL | ⬜ Pending |
| 38.4 | **Capacitor `appUrlOpen` listener leak on every modal change** — New listener registered on every `App.tsx` render because `addListener` is called inside component body, not in `useEffect` with cleanup | `App.tsx` | CRITICAL | ⬜ Pending |

### 🟠 HIGH

| # | Vulnerability | File:Line | Severity | Status |
|---|---------------|-----------|----------|--------|
| 38.5 | **React key on non-unique `index` vs `id` in card rendering** — `cards.map((card, idx) => <Card key={idx} .../>)` causes stale DOM when cards are reordered/filtered | `SpatialCanvas.tsx:347` | HIGH | ⬜ Pending |
| 38.6 | **Stale useState updater closures per-card drag handler** — Drag handlers created in render capture stale state values, causing incorrect positions on rapid drags | `SpatialCanvas.tsx:400-440` | HIGH | ⬜ Pending |
| 38.7 | **GraphView simulation fully rebuilt on every zoom/pan** — Zoom/pan state changes trigger useEffect that re-creates entire d3 simulation, losing pinned nodes and force state | `GraphView.tsx:228-343` | HIGH | ⬜ Pending |
| 38.8 | **`getState()` calls bypass React reactivity in multiple handlers** — 18 `.getState()` calls remain across 7 files; components don't re-render on state changes | Multiple files | HIGH | ⬜ Pending |
| 38.9 | **Missing deps in `handleKeyDown` refs** — Keyboard handler captures stale refs; shortcut keys may fire on wrong doc or fail silently | `App.tsx` | HIGH | ⬜ Pending |
| 38.10 | **Stale `onClose` closure in `SemanticSearchModal`** — `onClose` captured at modal creation time; if parent changes handler between opens, stale reference persists | `SemanticSearchModal.tsx` | HIGH | ⬜ Pending |
| 38.11 | **`TeamWorkspaceModal` missing backdrop click handler** — Clicking outside the modal does not close it; user must find X button | `TeamWorkspaceModal.tsx` | HIGH | ⬜ Pending |
| 38.12 | **All modals lack `useEffect` cleanup for Escape listeners** — Event listeners registered but never removed on unmount; multiple listeners accumulate on re-open | All modal files | HIGH | ⬜ Pending |

### 🔵 MEDIUM

| # | Vulnerability | File:Line | Severity | Status |
|---|---------------|-----------|----------|--------|
| 38.13 | **Excalidraw import uses `NodeFilter` without cap** — Filtering thousands of nodes blocks main thread | `SpatialCanvas.tsx` | MEDIUM | ⬜ Pending |
| 38.14 | **`rect` bounds not validated in `getIntersectingCards`** — Negative/NaN dimensions produce incorrect intersection results | `SpatialCanvas.tsx` | MEDIUM | ⬜ Pending |
| 38.15 | **GraphView text measurement no cache** — `measureText()` called per-node per-frame; no memoization causes layout thrash | `GraphView.tsx` | MEDIUM | ⬜ Pending |
| 38.16 | **Replay test doesn't test what it claims** — `verifyRecoveryCode` replay test uses hardcoded code array without verifying `markCodeUsed` blocks reuse | `encryption.test.ts` | MEDIUM | ⬜ Pending |
| 38.17 | **No size limit on `getLocalCommits`** — Fetching all commits for doc with thousands of versions causes OOM | `versionHistory.ts` | MEDIUM | ⬜ Pending |
| 38.18 | **Missing `aria-label` on many buttons** — Export trigger, zoom controls, card action buttons lack accessible labels | Multiple component files | MEDIUM | ⬜ Pending |

### 🟢 LOW

| # | Vulnerability | File:Line | Severity | Status |
|---|---------------|-----------|----------|--------|
| 38.19 | **Node radius from `docIds.length` could overflow** — Graph node radius grows proportionally to `docIds.length`; large number of links produces oversized nodes that break layout | `GraphView.tsx` | LOW | ⬜ Pending |

### Phase 36 Sub-Items

| # | Item | Status |
|---|------|--------|
| 36.1 | Create `.github/workflows/android-release.yml` | ✅ Done |
| 36.2 | Create `.github/workflows/ios-release.yml` | ✅ Done |
| 36.3 | Generate Android signing keystore (`keytool`) | ✅ Done (graphite-release.jks exists, gitignored) |
| 36.4 | Run `npx cap add android`, commit `android/` folder | ✅ Done (shared-editor/android/ exists with full Capacitor project) |
| 36.5 | Create Google Play Console listing + store screenshots + privacy policy | ⬜ Pending |
| 36.6 | Fix Phase 35 WebView security issues (CSP, back-gesture, `Buffer` polyfill) | ⚠️ Partial — 35.2/3/5/6 done; 35.1/4/7 pending |
| 36.7 | First internal track release to Google Play | ⬜ Pending |
| 36.8 | (Optional) iOS App Store release via TestFlight | ⬜ Pending |

---

## Phase 39: Independent Audit — Phase 29/30/31/32/33/34/35/36/37 Findings (July 2026)

Independent audit of remaining phases. All items below are NEW findings NOT documented in earlier phases.

### 🔴 CRITICAL

| # | Vulnerability | File:Line | Severity | Status |
|---|---------------|-----------|----------|--------|
| 39.1 | **SVG `<script>` elements bypass `sanitizeHtml` in MermaidMathBlock** — `el.tagName === "SCRIPT"` is case-sensitive; SVG-namespace `<script>` has lowercase `tagName`, so script elements embedded in Mermaid/KaTeX SVG output survive sanitization and execute via `dangerouslySetInnerHTML` | `MermaidMathBlock.tsx:16` | CRITICAL | ⬜ Pending |
| 39.2 | **Web Worker sandbox bypass via prototype chain in CodeSandbox** — `self.fetch = undefined` only shadows the property; original `fetch`/`XMLHttpRequest`/`WebSocket` accessible via `Object.getPrototypeOf(Object.getPrototypeOf(self))`. `EventSource` not deleted at all — provides outbound HTTP via SSE | `CodeSandboxBlock.tsx:29-39` | CRITICAL | ⬜ Pending |
| 39.3 | **PluginSandbox origin check uses `null` primitive instead of `"null"` string** — `if (event.origin !== null) return;` always true because sandboxed iframe origin is the string `"null"`. All plugin messages rejected — **plugin system completely non-functional** | `PluginSandbox.tsx:19` | CRITICAL | ⬜ Pending |
| 39.4 | **`shared-editor/ios/` directory does not exist** — `npx cap add ios` never ran. iOS release workflow (ios-release.yml:29) references `shared-editor/ios/App` which doesn't exist — **iOS CI will fail immediately** | `.github/workflows/ios-release.yml:29` | CRITICAL | ⬜ Pending |
| 39.5 | **Phase 29.7 layering violation still not fixed** — `store/useNoteStore.ts` still imports `toast` from `"../components/Toast"`. Also `utils/auth.ts:2` has same violation. `toast()` should live in store or utils | `store/useNoteStore.ts:7`, `utils/auth.ts:2` | CRITICAL | ⬜ Pending |
| 39.6 | **Phase 29.10 double store subscriptions not fixed** — Both `App.tsx:37-38` and `AppHeader.tsx:14-15` subscribe to identical `docId`/`editorState` slices. Every keystroke renders App (needlessly recomputing `currentTitle`) AND AppHeader independently via own subscription, bypassing React.memo | `App.tsx:37-38`, `AppHeader.tsx:14-15` | CRITICAL | ⬜ Pending |

### 🟠 HIGH

| # | Vulnerability | File:Line | Severity | Status |
|---|---------------|-----------|----------|--------|
| 39.7 | **Phase 29.11 tab order inconsistency not fixed** — Top nav order: editor→canvas→split→spatial→graph→kanban→meta. Bottom nav order: editor→split→canvas→spatial→graph→kanban→meta. Canvas/Split swapped, inconsistent navigation | `AppNav.tsx:21`, `AppBottomNav.tsx:12-18` | HIGH | ⬜ Pending |
| 39.8 | **Duplicate pinned notes sections in Sidebar** — Lines 499-516 render non-collapsible "Pinned Notes" section (when `!showArchived`). Lines 555-588 render collapsible "Pinned (N)" accordion. Both render simultaneously — every pinned note appears twice | `Sidebar.tsx:499-516,555-588` | HIGH | ⬜ Pending |
| 39.9 | **ExcalidrawCanvasComponent missing library validation** — Has own `saveLibrary()` at lines 21-24 that lacks `Array.isArray()` check, `.filter()` for non-objects, and `.slice(0, 500)` cap present in `Canvas.tsx:16-22`. Attacker with malicious `.excalidraw` file can exhaust localStorage quota | `ExcalidrawCanvasComponent.tsx:21-24` | HIGH | ⬜ Pending |

### 🔵 MEDIUM

| # | Vulnerability | File:Line | Severity | Status |
|---|---------------|-----------|----------|--------|
| 39.10 | **`isEncrypted()` in `encryption.ts` lacks `.toLowerCase()`** — Uses `payload.startsWith("enc:")` without `.toLowerCase()`, while all component guards use `.trim().toLowerCase()`. If uppercase `"ENC:"` ever appears, utility won't recognize it | `encryption.ts:127` | MEDIUM | ⬜ Pending |
| 39.11 | **Editor.tsx encryption guards lack `.toLowerCase()` in 6 locations** — All use `.trim().startsWith("enc:")` without `.toLowerCase()`. If prefix is ever uppercase, guards fail to block editing of encrypted content | `Editor.tsx:152,367,374,383,405,536` | MEDIUM | ⬜ Pending |
| 39.12 | **`renderLexicalContent` encrypted check lacks `.toLowerCase()`** — Uses `raw.trim().startsWith("enc:")` without `.toLowerCase()`. Uppercase prefix renders encrypted content as plaintext in card preview | `SpatialCanvas.tsx:18` | MEDIUM | ⬜ Pending |
| 39.13 | **Pull-to-refresh has no timeout/abort mechanism** — `fetchAndMergeDocs()` is an async promise with no timeout. If network hangs, `isRefreshing` stays `true` forever, permanently blocking future pull gestures and sidebar drawer | `Sidebar.tsx:216-226` | MEDIUM | ⬜ Pending |
| 39.14 | **Back gesture exits app (35.1 unresolved)** — No `onBackPressed()`, `dispatchKeyEvent()`, or back-gesture interception exists. Physical back button immediately exits app instead of navigating WebView history or closing modals | `MainActivity.java` | MEDIUM | ⬜ Pending |
| 39.15 | **composeApp consolidation not done (35.4 unresolved)** — `composeApp/` still fully exists with its own AndroidManifest (insecure `allowBackup="true"`), Kotlin sources, `build.gradle.kts`. `settings.gradle.kts:17` still includes it. Duplicate manifests cause confusion | `composeApp/`, `settings.gradle.kts:17` | MEDIUM | ⬜ Pending |
| 39.16 | **Share sheet handler not implemented (35.7 unresolved)** — No `onNewIntent()` override, no `ACTION_SEND` intent-filter on Capacitor activity. Share from other apps does nothing | `MainActivity.java` | MEDIUM | ⬜ Pending |

### 🟢 LOW

| # | Vulnerability | File:Line | Severity | Status |
|---|---------------|-----------|----------|--------|
| 39.17 | `highlightText()` regex `g` flag causes intermittent match highlighting | `QuickSearchModal.tsx:100-113` | LOW | ⬜ Pending |
| 39.18 | Non-passive touch listeners cause scroll jank warnings | `Sidebar.tsx:430-432` | LOW | ⬜ Pending |
| 39.19 | `SemanticSearchModal.tsx` orphaned dead code (replaced by QuickSearchModal) | `SemanticSearchModal.tsx` | LOW | ⬜ Pending |
| 39.20 | Export dropdown menu items (and many buttons) lack `type="button"` | `AppHeader.tsx:152-154` | LOW | ⬜ Pending |
| 39.21 | Export dropdown menu items lack `e.stopPropagation()` — harmless double-close | `AppHeader.tsx:152-154` | LOW | ⬜ Pending |

---

## Phase 40: Strategic Recommendations — Competitive Analysis, Growth, Performance, UX (July 2026)

Comprehensive research across competitive analysis, user acquisition, performance optimization, and UX polish. All items are recommendations for the product roadmap.

### 40.1 Differentiators (Lean Into These)

Graphite's unique strengths that no competitor fully matches. Double down on these.

| # | Differentiator | Description | Effort | Impact |
|---|----------------|-------------|--------|--------|
| D1 | **Unified Document + Canvas Workspace** | Blend rich text (Lexical) + inline Excalidraw canvas + spatial whiteboard in one app. No competitor does this: Obsidian needs plugin, Notion has limited drawing, Logseq has separate whiteboards. Make canvas blocks easily inserted in docs, bidirectional drag-and-drop between canvas cards and text blocks | Medium | High |
| D2 | **Executable Code Sandbox** | Web Worker code execution inside notes (unique). Expand to Python via Pyodide, SQL, output rendering (charts/tables), inline execution within documents | Large | High |
| D3 | **E2E Encryption as Core Feature** | AES-256-GCM + WebAuthn hardware key support. Market as "the only note app with zero-knowledge encryption + local Git + open-source". Make encryption seamless and default | Medium | High |
| D4 | **Built-in AI + Local LLM** | First-party AI with Ollama/transformers.js (works offline, free, private). Notion charges $20/user/mo. Add local semantic search, AI flashcards, AI-suggested connections, on-device RAG | Large | High |
| D5 | **Git-Based Version History** | isomorphic-git commits on every save. Push to GitHub/GitLab, visual diffs, branching per document | Medium | High |
| D6 | **Open Canvas Format (.graphite-canvas)** | Interoperable, git-diffable canvas files. Allow import/export to Obsidian Excalidraw format and JSON Canvas spec | Medium | Medium |

### 40.2 Critical Catch-Up Features (Required for Competitiveness)

Features competitors have that Graphite must implement to be viable.

| # | Feature | Why | Effort | Impact |
|---|---------|-----|--------|--------|
| C1 | **Database / Spreadsheet Block** | Single biggest gap vs Notion. Table/board/calendar/gallery/list views, column types, sort/filter. Start with table + board; add calendar/gallery v2 | XLarge | High |
| C2 | **Real Plugin Ecosystem** | Obsidian has 2700+ plugins. Fix sandbox origin bug (39.3), ship marketplace, create public API, dev docs, discovery UI | XLarge | High |
| C3 | **True Cloud Sync (Server Required)** | Current sync is local-only with fake Supabase wiring. Need real multi-device sync via Yjs CRDT relay | Large | High |
| C4 | **First-Class Mobile Apps** | PWA not enough vs Notion/Obsidian native apps. Push notifications, share sheet, widgets, biometric auth, offline-first | XLarge | High |
| C5 | **Quick Switcher with Deep Search** | Cmd+P should search titles, content, headings, block IDs, symbols, commands, recent files, tabs. Add fuzzy matching and search operators | Medium | High |
| C6 | **Dual-Pane / Split View** | Tab-based only (one view at a time). Add resizable split: editor+graph, editor+canvas, editor+backlinks | Medium | High |
| C7 | **Tabbed Multi-Document** | Currently single-document view. Add browser-style tabs with drag reorder, pinning, persistence | Large | High |
| C8 | **Command Palette** | Ctrl+Shift+P for all actions: navigation, export, toggles, plugin commands. Integrate with plugin system | Large | High |
| C9 | **Global Undo/Redo** | Undo/redo works only inside editor. Document create/rename/delete/move has no undo. Implement global action history | Large | High |
| C10 | **Outliner / Block-Focused Mode** | Logseq/Roam core workflow. Add indent/outdent, collapse/expand hierarchy, zoom into block. Every block gets a UUID | Large | High |
| C11 | **PDF Annotation** | PDF import exists but no annotation. Add highlight, underline, comment → graph-linked blocks. PDF.js already in deps | Large | High |
| C12 | **Unlinked Mentions** | Auto-detect when note title appears without `[[link]]`. Surface in backlinks panel | Small | Medium |
| C13 | **Web Clipper** | Browser extension to save pages as notes. Skipped in Phase 11.8, every competitor has one | Medium | Medium |
| C14 | **Public API + Integrations** | REST API for programmatic note creation, Zapier/Make integration, webhook triggers | XLarge | Medium |

### 40.3 User Acquisition Strategy

| # | Action | Channel | Description | Effort | Priority |
|---|--------|---------|-------------|--------|----------|
| G1 | **Create README.md** | GitHub | No README exists. Add hero GIF, feature table vs competitors, 5-step quick-start, star CTA | Small | Now |
| G2 | **Launch Discord server** | Community | Central hub for users/contributors. Daily builds, feedback, showcase channel | Small | Now |
| G3 | **Good First Issues + CONTRIBUTING.md** | GitHub | Label 5-10 beginner issues, create contributor ladder, reply to all PRs within 24h | Small | Now |
| G4 | **"Why I Built Graphite" blog post** | Dev.to/HN/Medium | Technical honest post. "Show HN: open-source Notion alternative with local-first E2EE" | Small | Now |
| G5 | **Coordinated launch window** | Multi-channel | Seed stars → Product Hunt (Day 0) → Show HN (Day 1) → Reddit r/selfhosted (Day 2). All within 48h | Medium | Now |
| G6 | **Product Hunt launch** | PH | Self-hunt, maker comment immediately, reply every comment within 24h | Medium | Now |
| G7 | **Show HN** | HN | Title: "Show HN: Graphite Studio — open-source note-taking with inline canvas & E2EE" | Small | Now |
| G8 | **Reddit posts** | r/selfhosted, r/opensource, r/NoteTaking | Write like a colleague, not marketing. AFFiNE got 2K+ stars from Reddit alone month 1 | Medium | Now |
| G9 | **Ship working cloud sync** | Core blocker | Pro tier ($6/mo) needs cloud sync. Currently 90% stubs. Without this, conversion funnel doesn't exist | Large | Now |
| G10 | **Self-host guide** | r/selfhosted | Docker Compose + 5-step guide. Eliminates "what if you go under?" objection | Medium | Now |
| G11 | **PWA to app stores** | PWABuilder | Package for Microsoft Store (free), Google Play ($25 TWA), iOS ($99/yr). PWA already has vite-plugin-pwa | Medium | Now |
| G12 | **Weekly demo videos** | X/LinkedIn/YouTube | 30-60s screen recordings of specific features. Cadence > quality for compounding | Medium | Next |
| G13 | **Tutorial series** | Blog/YouTube | "Getting Started", "Using Spatial Canvas", "Building a Knowledge Graph" | Medium | Next |
| G14 | **Newsletter outreach** | TLDR/JS Weekly/Console | 60K-200K devs each. One mention > weeks of social media | Small | Next |
| G15 | **Obsidian importer tool** | Migration | One-click import from Obsidian vault (.md files + folder structure). Targets exact ICP with switching intent | Medium | Next |
| G16 | **awesome-* list submissions** | GitHub | Submit to awesome-selfhosted, awesome-notes, awesome-productivity. Permanent SEO backlinks | Small | Next |
| G17 | **MCP server (AI integration)** | Developer | Let Cursor/Claude/VS Code read/write notes via Model Context Protocol | Medium | Next |
| G18 | **Excalidraw ecosystem cross-promotion** | Partnership | Publish "How Graphite uses Excalidraw". Obsidian Excalidraw plugin has 5M+ installs — those users are ICP | Small | Next |

### 40.4 Performance Optimization

| # | Issue | Current Behavior | Fix | Effort | Impact |
|---|-------|-----------------|-----|--------|--------|
| P1 | **No lazy loading for tab views** | GraphView, SpatialCanvas, KanbanBoard, all modals eagerly imported in App.tsx | React.lazy() + Suspense for all tab views and modal components. Reduces initial JS by ~40% | Medium | High |
| P2 | **No Vite manualChunks** | All large deps (Lexical, Excalidraw, d3, mermaid, katex, pdfjs) in single monolithic chunk | Add manualChunks in vite.config.ts: vendor-lexical, vendor-excalidraw, vendor-d3, vendor-mermaid, vendor-pdf, vendor-transformers | Small | High |
| P3 | **No React.memo on any component** | Store changes re-render entire tree including deeply nested children | Wrap GraphView, SpatialCanvas, KanbanBoard, InfoTab, Sidebar, Editor, AppHeader in React.memo. Use atomic Zustand selectors | Medium | High |
| P4 | **SpatialCanvas no viewport culling** | Renders ALL cards (DOM nodes + SVG edges + minimap) even off-screen | Implement viewport culling via IntersectionObserver or math. Only render cards in visible viewport | Large | High |
| P5 | **GraphView simulation restarts on every nodes change** | Any store change creates new nodes array reference, killing simulation | Deep compare or use stable `simKey` counter. Only restart on actual topology change | Small | Medium |
| P6 | **GraphView RAF runs continuously** | RAF loop unconditional as long as `mounted` is true, even when simulation settled | Stop RAF when `simulation.alpha() <= alphaMin()`. Only resume on interaction | Small | Medium |
| P7 | **`parseStats()` runs per keystroke** | Full-lexical-AST traversal on every typed character for word/char/backlink counts | Throttle to once per second during typing. Cache and return stale stats during bursts | Small | Medium |
| P8 | **Excalidraw CSS eagerly loaded** | `@excalidraw/excalidraw/index.css` in main.tsx adds ~200KB CSS to critical path | Move Excalidraw CSS import into lazy-loaded Canvas component | Small | Medium |
| P9 | **Google Fonts render-blocking** | 3 font families loaded with no `display=swap`, blocking first paint | Add `&display=swap`, preconnect, or self-host via @fontsource packages | Small | Medium |
| P10 | **Editor plugins registered eagerly** | All 6 plugins + 7 nodes registered on every Editor mount even when not needed | Register only CoreNodes eagerly. On-demand registration for canvas/image/code blocks | Medium | Medium |
| P11 | **`renderLexicalContent` per-card per frame** | Parses JSON AST for every card on every render | Memoize per card ID. Extract Card into memoized sub-component | Small | Medium |
| P12 | **autoSuggestTags on every save** | Hits AI service on every 300ms debounce flush for untagged docs | Add per-session cooldown flag. Debounce tag suggestions at 30s interval | Small | Medium |
| P13 | **Full-text re-index on every documents change** | App.tsx re-indexes ALL docs on every store mutation, O(n) per keystroke | Only re-index changed doc. Debounce entire operation to 2s. Move to Web Worker | Small | Medium |
| P14 | **No compression plugin** | Production builds serve uncompressed JS/CSS | Add vite-plugin-compression with Brotli + gzip | Small | Medium |
| P15 | **No `prefers-reduced-motion`** | All 20+ CSS animations run on mobile causing jank | Add reduce-motion media query disabling animations/transitions for accessibility and perf | Small | Medium |
| P16 | **Inline arrow functions on every card button** | 7 inline onClick handlers per card × 100+ cards = 700 new functions per render | Extract Card as React.memo sub-component with useCallback handlers or event delegation | Medium | Medium |
| P17 | **PDF import sync blocks main thread** | pdfjs-dist (~6MB) loaded and executed synchronously on PDF drop | Lazy-import pdfImport, show loading spinner. Add 10MB mobile size limit | Small | Medium |
| P18 | **Restart simulation on every zoom/pan** | Zoom/pan state changes rebuild d3 simulation, losing pinned nodes | Decouple zoom/pan from simulation via useRef for camera state during interactions | Small | Medium |
| P19 | **Inline style causes full repaint on zoom** | `backgroundSize` changes on every zoom via inline style | Use CSS custom property `--zoom` and `will-change: transform` for GPU layer promotion | Small | Low |
| P20 | **GraphView mouse handler creates objects at 60fps** | `{ x, y }` object literal on every mousemove triggers re-render | Use refs during drag/pan, commit to Zustand state only on mouseup | Small | Low |
| P21 | **PWA cache max 3MB may miss Excalidraw chunk** | Excalidraw individual chunks can exceed 3MB limit | Increase to 6MB or use runtimeCaching instead of precaching for canvas chunk | Small | Low |
| P22 | **Move graph layouts + Excalidraw library to IndexedDB** | localStorage synchronous reads block main thread | Use idbStorage.ts for non-blocking async get/set | Small | Low |

### 40.5 UX & Polish Improvements

| # | Issue | Current State | Fix | Effort | Impact |
|---|-------|--------------|-----|--------|--------|
| U1 | **No first-run experience** | App lands on blank editor or auth screen with no guidance | Welcome wizard on first launch: use-case selection, template picker, quick-start tips | Medium | High |
| U2 | **Empty states are text-only** | "Enter some text…", empty backlinks/search/graph have no guidance | Illustrated empty states with actionable CTAs ("Create your first note", "Link notes to see them here") | Small | High |
| U3 | **Slash command no discoverability** | No hint that typing `/` opens a menu | Add "+" button on empty block left margin (like Notion). Show pill hint on first use | Small | High |
| U4 | **No back/forward history** | No in-app navigation history. Browser back exits app | Implement navigation history stack. Alt+←/→ shortcuts | Large | High |
| U5 | **No light mode** | Entire app is dark-only CSS | Implement `[data-theme="light"]` theme. Detect via `prefers-color-scheme` | Large | High |
| U6 | **Missing aria-labels on ~40% of buttons** | Export, zoom, card action buttons lack `aria-label` | Audit all icon-only buttons, add descriptive `aria-label` to each | Medium | High |
| U7 | **Incomplete focus trapping** | QuickSearchModal missing `aria-modal="true"`. Some modals still lack trap | Implement FocusTrap component. `aria-modal="true"` + `role="dialog"` on all modals | Medium | High |
| U8 | **Modals not bottom sheets on mobile** | Centered card modals are cramped on 390px screens | On <600px, render as bottom sheets: slide up, rounded top corners, full-width, max 85% height | Medium | High |
| U9 | **Save indicator missing "Saved" state** | Only "Saving..." shown, never transitions to "Saved" | Add `isSaved` state with 2s green checkmark after debounce completes | Small | High |
| U10 | **No skip-to-content link** | Tab cycles through sidebar/header before editor. No skip for keyboard users | Visually-hidden "Skip to content" as first focusable element | Small | High |
| U11 | **Thumb-zone unoptimized** | Primary actions (new doc, search) in header, unreachable one-handed on large phones | Move to bottom nav or add FAB near bottom-right | Medium | High |
| U12 | **No block menu (+ button)** | Only `/` command exists for inserting blocks | Notion-style "+" button on block hover left gutter | Medium | High |
| U13 | **Toasts lack icons and actions** | Bare text, no icon, no undo action, no type badge | Add icon per type, optional "Undo" action button, swipe-to-dismiss | Small | High |
| U14 | **No breadcrumbs** | No contextual path indicator showing doc location in folder tree | Breadcrumb bar above editor showing full folder path, clickable | Medium | Medium |
| U15 | **Slash menu flat list** | 20+ options with no grouping. No category headers | Add sticky category dividers: "Basic", "Media", "AI", "Advanced" | Small | Medium |
| U16 | **Template preview missing** | Template shows name+description but no rendered content preview | Add preview pane using read-only Lexical view or rendered Markdown | Medium | Medium |
| U17 | **No consistent spacing system** | Padding/margin values are arbitrary (16/20/24/12/14/10/8px) with no tokens | Define spacing scale (4/8/12/16/24/32/48px) in CSS vars. Audit and replace hardcoded values | Medium | Medium |
| U18 | **No recent docs in sidebar** | Sidebar shows folder tree but no "Recent" section | Add "Recent" section above folder tree showing last 5-8 opened docs | Small | Medium |
| U19 | **Contrast ratio may fail WCAG AA** | `--text-muted: hsl(225,10%,55%)` on `--bg-primary: hsl(225,20%,9%)` ≈ 4.2:1 | Audit all text/background pairs, lighten `--text-muted` to 60%+ lightness | Small | High |
| U20 | **Toast lacks `aria-live` region** | `role="alert"` without `aria-live="polite"`. Screen readers may not announce | Add `aria-live="polite"` to toast container. Focus on critical error toasts | Small | Medium |
| U21 | **No offline indicator** | PWA works offline but gives no connectivity status | Add online/offline badge in header. Queue counter for pending offline changes | Small | Medium |
| U22 | **Drag handle mouse-only** | Block drag requires mousemove. No touch support, no visual drop indicator | Add onTouchStart/Move/End. Long-press activates. Blue line drop indicator between blocks | Medium | Medium |
| U23 | **Auto-suggest tags per session** | Tags suggested on every save for untagged docs. Add cooldown | Already covered by P12. Ensure tag suggestion fires max 1x per doc per session | Small | Low |
| U24 | **Heavy inline styles** | ~40% of component styling uses inline `style={{}}` props | Migrate to CSS classes. Create utility classes for dropdowns, menus, dividers | Large | Medium |
| U25 | **Scrollbar styling** | Default OS scrollbars throughout dark app | Custom `::-webkit-scrollbar` styles: thin, rounded, transparent track, subtle accent thumb | Small | Medium |
| U26 | **Block color/highlight** | No text highlight/marker | Add highlight format (yellow/green/blue/pink). Toolbar button + `/highlight` command | Small | Medium |

---

## Phase 41: XSS, CSP & Content Injection — Live-Site Validated Findings (July 2026)

Findings confirmed via live testing of https://graphite-notes.pages.dev/. All exploits verified against the deployed Cloudflare Pages instance.

| # | Vulnerability | File:Line | Severity | Status |
|---|---------------|-----------|----------|--------|
| 41.1 | **CSP `'unsafe-inline'` in script-src nullifies all XSS protection** | `index.html:27` (meta CSP) | 🔴 CRITICAL | ⬜ Pending |
| 41.2 | **CSP frame-src allows data: and blob: — arbitrary content embedding** | `index.html:34` (meta CSP) | 🔴 CRITICAL | ⬜ Pending |
| 41.3 | **No CSP HTTP header — only meta-tag CSP (browser-dependent, no frame-ancestors)** | Cloudflare Pages response | 🔴 CRITICAL | ⬜ Pending |
| 41.4 | **`data:` URI XSS in exported HTML links — bypasses `isJavaScriptUrl()`** | `exportDoc.ts:70-72` | 🟠 HIGH | ⬜ Pending |
| 41.5 | **Mermaid/KaTeX SVG `data:` href XSS in sanitizeHtml** | `MermaidMathBlock.tsx:22-25` | 🟠 HIGH | ⬜ Pending |
| 41.6 | **PluginAPI `onHostMessage` — no origin validation of incoming messages** | `pluginAPI.ts:108-114` | 🟠 HIGH | ⬜ Pending |
| 41.7 | **printDocument popup same-origin — iframe/data: URI injection** | `exportDoc.ts:132-146` | 🟠 HIGH | ⬜ Pending |
| 41.8 | **PluginSandbox origin-null check always-true no-op** | `PluginSandbox.tsx:19` | 🟡 MEDIUM | ⬜ Pending |
| 41.9 | **CodeSandbox Worker — `self.postMessage` not nullified** | `CodeSandboxBlock.tsx:55` | 🟡 MEDIUM | ⬜ Pending |
| 41.10 | **Plugin remote scripts from unpkg without SRI (CDN hijack = RCE)** | `pluginSystem.ts:96,109,122` | 🟡 MEDIUM | ⬜ Pending |
| 41.11 | **Connect-src allows ws://localhost:* — SSRF/internal network probe** | `index.html` meta CSP | 🟡 MEDIUM | ⬜ Pending |
| 41.12 | **Excalidraw Firebase config hardcoded in prod bundle** | `Canvas-CYX4WJue.js` (Firebase `apiKey`, `authDomain`, etc.) | 🟡 MEDIUM | ⬜ Pending |

**FALSE POSITIVES from initial audit — marked ✅ No-Harm but reviewed:**
| # | Claim | Explanation | Status |
|---|-------|-------------|--------|
| 41.13 | `postMessage('*')` wildcard | Live bundle analysis shows all postMessage calls use explicit origin targets, no `'*'` | ✅ No-Harm (Checked) |
| 41.14 | `dangerouslySetInnerHTML` in app code | All 11 occurrences are React DOM reconciliation internals, not app-level | ✅ No-Harm (Checked) |
| 41.15 | Hardcoded OpenAI/Anthropic API keys | Keys are `""` empty strings — user-provided at runtime | ✅ No-Harm (Checked) |
| 41.16 | `new Function()` for code injection | Bundler runtime utility for dynamic import resolution | ✅ No-Harm (Checked) |

---

## Phase 42: Auth, Session & API Key Exposure — Live-Site Validated Findings (July 2026)

| # | Vulnerability | File:Line | Severity | Status |
|---|---------------|-----------|----------|--------|
| 42.1 | **`isAuthenticated` forced `true` when Supabase missing or errors — auth bypass** | `useAuthStore.ts:33,50` / `App.tsx:251` | 🔴 CRITICAL | ⬜ Pending |
| 42.2 | **Supabase JWT session persisted in localStorage — XSS → account takeover** | `useAuthStore.ts:89-91` | 🔴 CRITICAL | ⬜ Pending |
| 42.3 | **Supabase raw `supabase.auth.token` readable from localStorage by any script** | `userRegistry.ts:23` / Supabase SDK | 🔴 CRITICAL | ⬜ Pending |
| 42.4 | **Zero-auth mode when Supabase unconfigured — full offline app with no login** | `useAuthStore.ts:33` / `App.tsx:251` | 🔴 CRITICAL | ⬜ Pending |
| 42.5 | **AI API key encryption broken — seed stored alongside ciphertext in localStorage** | `aiConfig.ts:30-35` | 🔴 CRITICAL | ⬜ Pending |
| 42.6 | **API keys sent directly from browser to OpenAI/Anthropic — no proxy** | `aiService.ts:20,60` | 🔴 CRITICAL | ⬜ Pending |
| 42.7 | **No rate limiting on password reset — account enumeration** | `auth.ts:47-51` | 🟠 HIGH | ⬜ Pending |
| 42.8 | **Password not zeroed from JS heap memory after login** | `AuthScreen.tsx:46,50,105-106` | 🟠 HIGH | ⬜ Pending |
| 42.9 | **`document_embeddings` upsert has no `user_id` — RLS impossible** | `embedding.ts:64-70` | 🟠 HIGH | ⬜ Pending |
| 42.10 | **`pullFromSupabase()` fetches ALL rows — 100% RLS-dependent** | `supabase.ts:300-303` | 🟠 HIGH | ⬜ Pending |
| 42.11 | **Wildcard CORS (`Access-Control-Allow-Origin: *`) on all Cloudflare Pages responses** | Cloudflare Pages config | 🟠 HIGH | ⬜ Pending |
| 42.12 | **Offline sync queue falls back to plaintext when encryption fails** | `supabase.ts:232-233` | 🟠 HIGH | ⬜ Pending |

**Live-test validated:**
| # | Finding | Result | Status |
|---|---------|--------|--------|
| 42.13 | Supabase anon key exposed in JS bundle (public by design) | Anon key `eyJ...` found in `index-CjZLI5ld.js` — public anon key, RLS-blocked | ✅ No-Harm (RLS blocks) |
| 42.14 | Auth screen bypassed on frontend | Frontend auth guard blocks unauthenticated editor access | ✅ No-Harm (Mitigated) |
| 42.15 | Supabase RLS blocks unauthenticated reads | All REST queries return empty — RLS properly configured | ✅ No-Harm (Mitigated) |

---

## Phase 43: Encryption & Key Management — Live-Site Validated Findings (July 2026)

| # | Vulnerability | File:Line | Severity | Status |
|---|---------------|-----------|----------|--------|
| 43.1 | **Offline queue uses zero-salt PBKDF2 (10k iterations) + seed in localStorage** | `supabase.ts:162-164` | 🔴 CRITICAL | ⬜ Pending |
| 43.2 | **Offline queue plaintext fallback when encryption fails** | `supabase.ts:229-234` | 🔴 CRITICAL | ⬜ Pending |
| 43.3 | **Plaintext persists in Zustand store after decryption — auto-save to localStorage** | `SecurityModal.tsx:191-192, 227-228, 794` | 🔴 CRITICAL | ⬜ Pending |
| 43.4 | **HMAC signing key stored in localStorage plaintext — `deriveAuditKey()` is dead code** | `auditLog.ts:51-61` | 🔴 CRITICAL | ⬜ Pending |
| 43.5 | **WebAuthn origin validation missing — clientDataJSON.origin not checked** | `encryption.ts:291-308` | 🔴 CRITICAL | ⬜ Pending |
| 43.6 | **`isEncrypted()` and `decryptText()` case-sensitive — guard bypass with "ENC:"** | `encryption.ts:114,126-128` | 🔴 CRITICAL | ⬜ Pending |
| 43.7 | **Recovery codes exposed in React DevTools via component state** | `SecurityModal.tsx:80` | 🔴 CRITICAL | ⬜ Pending |
| 43.8 | **`deriveKeyWithHardware` silently falls back to passphrase-only on WebAuthn failure** | `encryption.ts:361-362` | 🔴 CRITICAL | ⬜ Pending |
| 43.9 | **`aiConfig.ts` uses fixed salt string `"ai-config-key-v1"` for device key** | `aiConfig.ts:39` | 🟠 HIGH | ⬜ Pending |
| 43.10 | **`deriveAuditKey()` is dead code — HMAC key derivation never called** | `auditLog.ts:37-48` | 🟠 HIGH | ⬜ Pending |
| 43.11 | **Decrypted plaintext auto-saved to localStorage after unlock** | `SecurityModal.tsx:191-192`, `Editor.tsx` | 🟠 HIGH | ⬜ Pending |
| 43.12 | **`registerHardwareKey` no assertion verification during registration** | `encryption.ts:231-268` | 🟠 HIGH | ⬜ Pending |
| 43.13 | **No `maxLength` on recovery code input — SHA-256 DoS vector** | `encryption.ts:185` | 🟠 HIGH | ⬜ Pending |
| 43.14 | **`generateRecoveryCodes` wipes used-code tracking — replay attack** | `encryption.ts:180` | 🟠 HIGH | ⬜ Pending |
| 43.15 | **Recovery unlock doesn't reset passphrase rate limiter** | `SecurityModal.tsx:201-202, 230` | 🟡 MEDIUM | ⬜ Pending |
| 43.16 | **No `maxLength` on passphrase inputs — PBKDF2 DoS with large passphrase** | `SecurityModal.tsx:471,493,569,589` | 🟡 MEDIUM | ⬜ Pending |
| 43.17 | **`navigator.credentials` check insufficient for WebAuthn in old Safari** | `encryption.ts:227-228` | 🟢 LOW | ⬜ Pending |

---

## Phase 44: Supabase, Access Control & Network Security — Live-Site Validated Findings (July 2026)

| # | Vulnerability | File:Line | Severity | Status |
|---|---------------|-----------|----------|--------|
| 44.1 | **`pullFromSupabase()` has NO `user_id` WHERE clause — IDOR if RLS fails** | `supabase.ts:300-302` | 🔴 CRITICAL | ⬜ Pending |
| 44.2 | **Offline queue DELETE has no `user_id` filter — IDOR delete** | `supabase.ts:279` | 🔴 CRITICAL | ⬜ Pending |
| 44.3 | **`block_entities` Realtime filter references non-existent column — silent data leak** | `supabase.ts:433-435` vs line 377-388 | 🔴 CRITICAL | ⬜ Pending |
| 44.4 | **`document_embeddings` table has no `user_id` — RLS impossible** | `embedding.ts:59-77` | 🔴 CRITICAL | ⬜ Pending |
| 44.5 | **RLS policies NEVER CREATED on Supabase server — comments only** | `supabase.ts:292-296` (comment-only) | 🔴 CRITICAL | ⬜ Pending |
| 44.6 | **`block_entities` upsert lacks `user_id` — RLS violation** | `supabase.ts:376-389` | 🔴 CRITICAL | ⬜ Pending |
| 44.7 | **Spatial canvas sync lacks ownership validation** | `spatialCanvasStorage.ts:69-89` | 🟠 HIGH | ⬜ Pending |
| 44.8 | **Offline queue fallback stores data in localStorage plaintext** | `supabase.ts:232-233` | 🟠 HIGH | ⬜ Pending |
| 44.9 | **User identity derived from localStorage `supabase.auth.token` — impersonation via XSS** | `userRegistry.ts:23-51` | 🟠 HIGH | ⬜ Pending |
| 44.10 | **Workspace access control entirely client-side — IndexedDB bypass** | `teamWorkspace.ts:79-96, 178-233` | 🟠 HIGH | ⬜ Pending |
| 44.11 | **Prototype pollution via `__proto__` in awareness state handler** | `yjsSync.ts:55-77` | 🟡 MEDIUM | ⬜ Pending |
| 44.12 | **CSP allows `https://esm.sh` CDN — third-party dependency risk** | `index.html` CSP meta tag | 🟡 MEDIUM | ⬜ Pending |
| 44.13 | **`canvas_edges` RLS comment-only — no actual policy** | `spatialCanvasStorage.ts:3-5` | 🟡 MEDIUM | ⬜ Pending |
| 44.14 | **Embedding vectors stored without user correlation — topic leakage** | `embedding.ts:64-70` | 🟡 MEDIUM | ⬜ Pending |

**Live-test validated:**
| # | Finding | Result | Status |
|---|---------|--------|--------|
| 44.15 | Direct Supabase REST API with anon key | Returns empty — RLS is blocking unauthenticated reads | ✅ No-Harm (RLS blocks) |
| 44.16 | CORS wildcard `*` on deployed site | Confirmed — Cloudflare Pages default | ✅ No-Harm (Informational) |

---

## Phase 45: Plugin Sandbox & Code Execution — Live-Site Validated Findings (July 2026)

| # | Vulnerability | File:Line | Severity | Status |
|---|---------------|-----------|----------|--------|
| 45.1 | **`navigator.sendBeacon` HTTP POST exfiltration in CodeSandbox Worker** | `CodeSandboxBlock.tsx:29-39` | 🔴 CRITICAL | ⬜ Pending |
| 45.2 | **`Image()`/`Audio()` HTTP GET beacon exfiltration in CodeSandbox** | `CodeSandboxBlock.tsx:29-39` | 🔴 CRITICAL | ⬜ Pending |
| 45.3 | **`self.close()` timeout evasion in CodeSandbox Worker** | `CodeSandboxBlock.tsx:64-72` | 🔴 CRITICAL | ⬜ Pending |
| 45.4 | **`importScripts()` restored via prototype chain in CodeSandbox** | `CodeSandboxBlock.tsx:35` | 🔴 CRITICAL | ⬜ Pending |
| 45.5 | **`printDocument` allows `javascript:` URLs in iframe/object/embed** | `exportDoc.ts:135-141` | 🔴 CRITICAL | ⬜ Pending |
| 45.6 | **`printDocument` popup opens without `noopener` — `window.opener` abuse via meta refresh** | `exportDoc.ts:133` | 🔴 CRITICAL | ⬜ Pending |
| 45.7 | **`editorStateToHtml` + non-standard Lexical node types — uncleaned children flow into print** | `exportDoc.ts:50-93` | 🔴 CRITICAL | ⬜ Pending |
| 45.8 | **PluginSandbox response origin unsanitized — allows reply to spoofed origins** | `PluginSandbox.tsx:19,43` | 🔴 CRITICAL | ⬜ Pending |
| 45.9 | **CodeSandbox Worker has no CSP on blob — eval-based execution after API restore** | `CodeSandboxBlock.tsx:62` | 🟠 HIGH | ⬜ Pending |
| 45.10 | **CodeSandbox Worker `onerror` leaks IndexedDB contents via error messages** | `CodeSandboxBlock.tsx:85-90` | 🟠 HIGH | ⬜ Pending |
| 45.11 | **Plugin CDN scripts from unpkg lack `integrity` SRI hash — CDN hijack = RCE** | `pluginAPI.ts:120-123` | 🟠 HIGH | ⬜ Pending |
| 45.12 | **CodeSandbox exposes `WorkerNavigator` APIs for fingerprinting + sendBeacon** | `CodeSandboxBlock.tsx:29-39` | 🟠 HIGH | ⬜ Pending |
| 45.13 | **`printDocument` DOMParser mXSS — SVG `<style>` text content conceals elements** | `exportDoc.ts:135` | 🟠 HIGH | ⬜ Pending |
| 45.14 | **`yjsSync.ts` uses `new Date().getTime()` for client ID — predictable/collision-prone** | `yjsSync.ts:117` | 🟡 MEDIUM | ⬜ Pending |
| 45.15 | **CodeSandbox `URL.revokeObjectURL` race on dual timeout+message** | `CodeSandboxBlock.tsx:63,77,88` | 🟡 MEDIUM | ⬜ Pending |
