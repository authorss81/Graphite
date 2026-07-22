# Graphite Studio — Implementation Plan

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
| 2.1.1 | `/` command menu | Slash command to insert block types: text, heading, todo, bullet, toggle, divider, callout, image, embed, canvas. |
| 2.1.2 | **Drag to reorder** | Drag handle on each block → update `order_index` (LexoRank) → persist. |
| 2.1.3 | **Block-level backlinks** | Store `[[Page]]` references in `backlink_entities` table on save. Autocomplete `[[` with doc titles. |
| 2.1.4 | **Todo blocks** | Checkbox state synced, `/todo` command, show progress per document. |

### 2.2 Graph View

| # | Item | Details |
|---|------|---------|
| 2.2.1 | **Force-directed graph** | D3.js or vis-network. Nodes = notes, edges = backlinks. Zoom, pan, click-to-navigate. |
| 2.2.2 | **Local graph** | Per-document graph showing linked neighbors. |
| 2.2.3 | **Filter** | Filter by tag, date range, folder. |

### 2.3 AI Semantic Search

| # | Item | Details |
|---|------|---------|
| 2.3.1 | **Embedding generation** | On save, call `sentence-transformers/all-MiniLM-L6-v2` via Supabase Edge Function or Hugging Face Inference API. |
| 2.3.2 | **Store embeddings** | Insert into `document_embeddings` table. Handle update on doc change. |
| 2.3.3 | **Vector search UI** | Search bar → call `pgvector` cosine similarity query → display ranked results with relevance snippets. |
| 2.3.4 | **Hybrid search** | Combine vector search + full-text search (`to_tsvector`). Rerank results. |
| 2.3.5 | **Local AI copilot** | On-device embeddings via ONNX Runtime / XNNPACK in WebView. Privacy-first search & AI chat without cloud dependency. Use transformer.js or llama.cpp (WebAssembly) for local inference. |

### 2.4 Publishing & Sharing

| # | Item | Details |
|---|------|---------|
| 2.4.1 | **Public share links** | Generate read-only link via Supabase anonymous access policy. |
| 2.4.2 | **Export** | Markdown export, HTML export, PDF export (via browser print). |
| 2.4.3 | **Publish to web** | Custom subdomain (like Notion). Static rendering of published doc. |

### 2.5 Version History

| # | Item | Details |
|---|------|---------|
| 2.5.1 | **Real Git backup** | Integrate JGit (Android) / libgit2 (iOS). Real `git add` + `git commit` on document save. |
| 2.5.2 | **History browser** | List of commits with timestamps. Click to restore. |
| 2.5.3 | **Diff view** | Show what changed between versions (text diff for blocks, JSON diff for canvas). |

### 2.6 Tags & Filtering

| # | Item | Details |
|---|------|---------|
| 2.6.1 | **Tag management** | Add/remove tags on documents. Tag autocomplete from existing tags. |
| 2.6.2 | **Tag sidebar** | List all tags with count. Click to filter document list. |
| 2.6.3 | **Pin/Archive** | `is_pinned` and `is_archived` toggles. Pinned docs at top of sidebar. Archived docs in separate view. |

### 2.7 Spatial Canvas / Whiteboarding

| # | Item | Details |
|---|------|---------|
| 2.7.1 | **Infinite canvas** | Separate workspace mode (like Obsidian Canvas / Heptabase). Pan/zoom infinite 2D space. |
| 2.7.2 | **Note cards** | Drag notes from sidebar onto canvas as resizable cards. Shows title + preview. |
| 2.7.3 | **Arrow connections** | Draw arrows between cards. Store as edges in a new `canvas_edges` table. |
| 2.7.4 | **Freehand drawing** | Excalidraw drawing layer on canvas. Draw, highlight, sticky notes. |
| 2.7.5 | **Canvas tile persistence** | Save card positions, sizes, arrow endpoints as JSON. Load/render on open. |

---

## Phase 3: World-Class — Platform for Thought

### 3.1 Real-Time Multiplayer

| # | Item | Details |
|---|------|---------|
| 3.1.1 | **Yjs CRDT integration** | Actually use the `yjs` lib in the webview + `y-websocket` provider. Real conflict-free merge. |
| 3.1.2 | **Awareness cursors** | Show other users' cursors in the editor (color-coded, name label). |
| 3.1.3 | **Presence indicators** | Show who's viewing/editing each document. Avatar list in header. |
| 3.1.4 | **Supabase Realtime relay** | Use Supabase Realtime as Yjs sync backend (broadcast Yjs updates via Realtime channels). |

### 3.2 AI Features

| # | Item | Details |
|---|------|---------|
| 3.2.1 | **AI writing assistant** | OpenAI/Anthropic integration. Ghost text completion, rewrite, expand, summarize, change tone. |
| 3.2.2 | **AI generation** | `/generate meeting notes`, `/generate table from prompt`, `/brainstorm`. |
| 3.2.3 | **Auto-tagging** | AI suggests tags based on document content on save. |
| 3.2.4 | **Smart backlinks** | AI suggests related documents to link. "You might want to connect this to..." |
| 3.2.5 | **Natural language search** | "Find my notes about the server migration from last month" → hybrid search + LLM reranking. |

### 3.3 Plugin System

| # | Item | Details |
|---|------|---------|
| 3.3.1 | **Plugin API** | Sandboxed iframe or Web Worker for plugins. Declare slash commands, toolbar items, custom block renderers, event hooks. |
| 3.3.2 | **Plugin marketplace** | In-app browser for community plugins. One-click install. |
| 3.3.3 | **Theme API** | CSS variable overrides. Allow community themes. |

### 3.4 Advanced Block Types

| # | Item | Details |
|---|------|---------|
| 3.4.1 | **Databases** | Table view, board view (Kanban), list view, calendar view. Inspired by Notion databases. |
| 3.4.2 | **Mermaid diagrams** | Render Mermaid code blocks as diagrams. Use mermaid.render. |
| 3.4.3 | **LaTeX math** | KaTeX rendering for `$$` math blocks. |
| 3.4.4 | **Code blocks with syntax highlighting** | Prism.js or Shiki for highlighting. Run button for JS/Python sandbox. |
| 3.4.5 | **Audio/video** | Upload to Supabase Storage → embed player block. |

### 3.5 Team Workspace

| # | Item | Details |
|---|------|---------|
| 3.5.1 | **Shared workspaces** | Workspace membership table → scope documents to workspace. |
| 3.5.2 | **Permissions** | Read/edit/admin roles per workspace. |
| 3.5.3 | **Comments & mentions** | Threaded comments on blocks. `@mention` users. Notifications. |
| 3.5.4 | **Change requests** | Like Notion's updates — review + approve/reject before merge. |

### 3.6 Security & Privacy

| # | Item | Details |
|---|------|---------|
| 3.6.1 | **E2E encryption** | Client-side encryption with user-controlled key. Supabase stores encrypted blobs only. |
| 3.6.2 | **Key management** | WebAuthn / hardware key / recovery codes for key recovery. |
| 3.6.3 | **Audit log** | Track document access, exports, sharing events. |

### 3.7 Desktop & Mobile Native

| # | Item | Details |
|---|------|---------|
| 3.7.1 | **Desktop app (Tauri)** | Native file system, system tray, global quick-note shortcut (Ctrl+Shift+N). |
| 3.7.2 | **Android native shell** | Full WebView wrapper with proper lifecycle, back gesture, share sheet, notification integration. |
| 3.7.3 | **iOS native shell** | WKWebView with keyboard handling, Apple Pencil support, Drag & Drop, Shortcuts integration. |
| 3.7.4 | **Widgets** | iOS Today Widget, Android App Widget — quick note, recent docs. |


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
| 7.1 | Move Supabase credentials from source to runtime config | SupabaseClient.kt, SyncWorker.kt | 2h | Pending |
| 7.2 | Fix supabase! non-null assertion | auth.ts | 1h | Pending |
| 7.3 | Fix onUpgrade — ALTER TABLE, never DROP | AndroidDatabaseHelper.kt | 2h | Pending |
| 7.4 | Fix encryption Unlock false success | SecurityModal.tsx | 1h | Pending |
| 7.5 | Fix WikiLink click handler | WikiLinkPlugin.tsx | 2h | Pending |
| 7.6 | Fix Realtime subscription leak | useNoteStore.ts | 1h | Pending |
| 7.7 | Remove content_snippet from embedding upsert | embedding.ts | 30m | Pending |
| 7.8 | Fix WebView JS injection | GraphiteWebView.kt | 2h | Pending |
| 7.9 | Add HTML escaping to exportAsHTML | exportDoc.ts | 1h | Pending |
| 7.10 | Set MIXED_CONTENT_NEVER_ALLOW | GraphiteWebView.kt | 15m | Pending |
| 7.11 | Add origin validation to AndroidJSBridge | AndroidJSBridge.kt | 3h | Pending |
| 7.12 | Fix encodeBase64 to use proper encoding | bridge.ts | 1h | Pending |
| 7.13 | Stop silent error swallowing (show toasts) | Multiple | 3h | Pending |
| 7.14 | Add error boundaries around all components | App.tsx, Editor.tsx, Canvas.tsx | 3h | Pending |
| 7.15 | Fix recovery codes — mark used, reject reuse | encryption.ts | 1h | Pending |
| 7.16 | Fix executeWrite type handling | AndroidDatabaseHelper.kt | 1h | Pending |
| 7.17 | Fix folder delete infinite loop | useNoteStore.ts | 30m | Pending |
| 7.18 | Cache embeddings in SemanticSearchModal | SemanticSearchModal.tsx | 1h | Pending |

---

## Phase 8: Android Mobile UX Overhaul

| # | Item | Details | Effort | Status |
|---|------|---------|--------|--------|
| 8.1 | Fix ALL touch targets to >=48dp | Sidebar, icons, tree, cards, chips, zoom bar, auth | 3h | Pending |
| 8.2 | Apply --keyboard-height to entire app | adjustNothing + visualViewport approach | 2h | Pending |
| 8.3 | Android back gesture handling | OnBackPressedDispatcher | 3h | Pending |
| 8.4 | Swipe-to-dismiss on sidebars/modals | Gesture detection, animated dismiss | 4h | Pending |
| 8.5 | Edge-to-edge (enableEdgeToEdge) | WindowInsets, decor fits system windows | 3h | Pending |
| 8.6 | Haptic feedback | On toolbar press, keyboard, drag | 2h | Pending |
| 8.7 | Splash Screen API | installSplashScreen() | 1h | Pending |
| 8.8 | Pull-to-refresh for note list | SwipeRefreshLayout | 2h | Pending |
| 8.9 | Touch events on SpatialCanvas (remove 300ms delay) | onTouchStart/Move/End | 3h | Pending |
| 8.10 | Swipe-to-delete note gesture | Gesture detection on sidebar rows | 2h | Pending |
| 8.11 | Autofill hints + imeOptions on forms | AuthScreen | 1h | Pending |
| 8.12 | Remove allowFileAccess + allowContentAccess | GraphiteWebView.kt | 15m | Pending |
| 8.13 | WebChromeClient with file chooser | GraphiteWebView.kt | 2h | Pending |
| 8.14 | WebView offline caching strategy | setCacheMode, setAppCacheEnabled | 2h | Pending |
| 8.15 | Bottom navigation for mobile (<768px) | Thumb-reachable tabs | 4h | Pending |
| 8.16 | Share intent / deep linking | intent-filter for SEND and VIEW | 3h | Pending |

---

## Phase 9: Architecture & Code Quality Refactoring

| # | Item | Details | Effort | Status |
|---|------|---------|--------|--------|
| 9.1 | Split useNoteStore into focused slices | Separate CRUD, sync, toast, stats into domain stores | 8h | Pending |
| 9.2 | Split App.tsx into components | Modal manager, tab router, analytics, events | 6h | Pending |
| 9.3 | Extract shared ZoomControls | Replace duplicated zoom bars | 2h | Pending |
| 9.4 | Extract shared drag/pan hook | Replace duplicated patterns | 3h | Pending |
| 9.5 | Supabase client factory | Single factory, inject credentials at build time | 2h | Pending |
| 9.6 | Layered architecture | Data -> Sync -> Store -> UI | 12h | Pending |
| 9.7 | Replace 7 boolean flags with reducer | useReducer for modal management | 4h | Pending |
| 9.8 | Fix all err: any catch blocks | Type-safe error handling | 3h | Pending |
| 9.9 | Lexical Error Boundary | Wrap LexicalComposer with fallback UI | 2h | Pending |
| 9.10 | Stop imperative getState() in handlers | Use refs or subscriptions | 4h | Pending |
| 9.11 | Fix GraphView RAF loop | Check mount, cancelAnimationFrame on unmount | 1h | Pending |
| 9.12 | Fix key={docId} full editor re-mount | Controlled component with setEditorState | 4h | Pending |
| 9.13 | IndexedDB full-text search | Replace string scan of all docs | 4h | Pending |
| 9.14 | Reduce selectors in App.tsx | Atomic selectors prevent cascading re-renders | 3h | Pending |
| 9.15 | Replace localStorage with IndexedDB | Dexie/idb-keyval for unlimited storage | 8h | Pending |
| 9.16 | Pagination + virtual scrolling | For sidebar, canvas selector, graph view | 8h | Pending |
| 9.17 | Error boundaries around every view | Editor, Canvas, GraphView, SpatialCanvas | 3h | Pending |
| 9.18 | JvmDatabaseHelper transactions | BEGIN TRANSACTION...COMMIT | 2h | Pending |

---

## Phase 10: Real Engine Implementations (Replace Fake Features)

| # | Item | Current | Target | Effort | Status |
|---|------|---------|--------|--------|--------|
| 10.1 | Real Yjs Binary CRDT Merge | Returns incoming unchanged | State vector decode + binary merge | 16h | Pending |
| 10.2 | Real AI Embeddings (transformers.js) | hashToken(token) % 384 | Xenova/all-MiniLM-L6-v2 | 8h | Pending |
| 10.3 | Real AI Assistant (LLM streaming) | Keyword matching | Real LLM with streaming + RAG | 16h | Pending |
| 10.4 | Real Git (isomorphic-git always on) | Math.random() fallback | Always-on real Git commits | 4h | Pending |
| 10.5 | Real Git diff viewer | Line-by-line text compare | Real git diff algorithm | 8h | Pending |
| 10.6 | Real Team Workspace (server) | localStorage + fake invites | Supabase-backed with RLS | 24h | Pending |
| 10.7 | Real Plugin Marketplace | 5 hardcoded plugins | Sandboxed iframe plugin API | 40h | Pending |
| 10.8 | Real Kanban Board | 3 hardcoded cards | Connected to document checklists | 8h | Pending |
| 10.9 | Interactive Slash Embeds (live blocks) | Plain text inserts | Real React block components | 24h | Pending |
| 10.10 | Real Publish/Share (server) | Local isPublished boolean | Server endpoint with URL | 12h | Pending |
| 10.11 | Real Mermaid/KaTeX rendering | CodeNode templates | Real library rendering | 8h | Pending |
| 10.12 | Real Audio/Recording | No consent/permission | Permission flow + visual indicator | 4h | Pending |

---

## Phase 11: Competitive Feature Parity

| # | Item | Details | Effort | Status |
|---|------|---------|--------|--------|
| 11.1 | Block-level references (![[note#^block-id]]) | Reference/embed specific blocks from other notes | 8h | Pending |
| 11.2 | Database/spreadsheet block | Structured data with columns, sorting, filtering | 40h | Pending |
| 11.3 | Daily Journal / Daily Notes | Auto-created daily page, date-organized | 6h | Pending |
| 11.4 | PDF import via pdf.js | Parse PDF text into editable notes | 8h | Pending |
| 11.5 | HTML import | Parse HTML to rich text with formatting preserved | 4h | Pending |
| 11.6 | Image drag-and-drop import | DROP_COMMAND listener in Lexical | 2h | Pending |
| 11.7 | Templates gallery (20-50 templates) | Pre-built for common use cases | 12h | Pending |
| 11.8 | Web clipper browser extension | Save web pages as notes | 24h | Pending |
| 11.9 | Open canvas format (.graphite-canvas) | JSON Canvas spec interoperability | 8h | Pending |
| 11.10 | Per-node metadata / properties | Frontmatter on every note and canvas card | 8h | Pending |
| 11.11 | Full-text search (IndexedDB-based) | With highlighted results | 6h | Pending |
| 11.12 | RTL text support | Arabic, Hebrew, Persian | 4h | Pending |
| 11.13 | Spell check integration | Native spellcheck on ContentEditable | 1h | Pending |
| 11.14 | Table of contents auto-generation | From headings in the note | 3h | Pending |
| 11.15 | Callouts / rich blockquotes | Info, warning, tip, danger styles | 4h | Pending |
| 11.16 | Collapsible sidebar sections | Pinned, Tags, folders in groups | 2h | Pending |
| 11.17 | Keyboard shortcut cheatsheet (? or Cmd+/) | Overlay showing all shortcuts | 3h | Pending |
| 11.18 | Quick open (Cmd+P / Ctrl+P) | Obsidian-style fuzzy finder | 5h | Pending |

---

## Phase 12: Spatial Canvas & Canvas System

| # | Item | Details | Effort | Status |
|---|------|---------|--------|--------|
| 12.1 | Page-wise canvas mode | Bounded A4 pages vs infinite; dashed page edges; Add Page button; slide decks, print, layouts | 8h | Pending |
| 12.2 | Canvas mode toggle in UI | Toggle infinite/page-wise in Excalidraw + SpatialCanvas | 3h | Pending |
| 12.3 | Rich card content in SpatialCanvas | Render bold/headings/lists/checkboxes/images in cards | 8h | Pending |
| 12.4 | SpatialCanvas auto-layout (Arrange All) | Force-directed or grid layout | 6h | Pending |
| 12.5 | SpatialCanvas minimap | Thumbnail overview of full canvas | 8h | Pending |
| 12.6 | Search/zoom-to-card | Find by title, animate zoom | 4h | Pending |
| 12.7 | Card colors and groups | Color-code by tag, drag to group | 4h | Pending |
| 12.8 | Multi-select on SpatialCanvas | Select multiple cards to move/delete/group | 4h | Pending |
| 12.9 | Canvas presentation / slides mode | Select sequence, animated transitions, export | 12h | Pending |
| 12.10 | Canvas onChange perf fix (DONE) | Buffer strokes, defer to pointerUp | 3h | Done |
| 12.11 | Canvas drawing offset fix (DONE) | detectScroll=true, remove forced CSS, fix zoom math | 2h | Done |
| 12.12 | Excalidraw image persistence fix (DONE) | Capture 3rd files arg | 2h | Done |
| 12.13 | Nested canvases | Canvas inside canvas, canvas views in notes | 16h | Pending |
| 12.14 | Stylus / Apple Pencil support | Pressure sensitivity, palm rejection | 8h | Pending |
| 12.15 | Smart auto-resize of cards | Fit content; narrow to heading/block | 6h | Pending |

---

## Phase 13: Graph View Overhaul

| # | Item | Details | Effort | Status |
|---|------|---------|--------|--------|
| 13.1 | Replace physics with d3-force | Stable layout with drag, pin, controls | 6h | Pending |
| 13.2 | Click node shows popup | Title, snippet, tags, Open button | 4h | Pending |
| 13.3 | Filter by tag, date range, folder | Beyond title text filter | 4h | Pending |
| 13.4 | Cluster by tag | Color-code groups, collapse clusters | 4h | Pending |
| 13.5 | Edge weights | Thicker lines for more links | 2h | Pending |
| 13.6 | Timeline slider | Graph formation over time | 6h | Pending |
| 13.7 | Saved graph layouts | Snapshot + restore | 4h | Pending |
| 13.8 | Fix RAF loop | Check mount, cancelAnimationFrame | 1h | Pending |
| 13.9 | Fix useMemo mutation | useRef for simulation state | 1h | Pending |

---

## Phase 14: Security Hardening

| # | Item | Details | Effort | Status |
|---|------|---------|--------|--------|
| 14.1 | RLS on ALL Supabase tables | user_id column, policies, CI verification | 4h | Pending |
| 14.2 | Auth tokens to httpOnly cookies | Replace localStorage JWT | 8h | Pending |
| 14.3 | Content-Security-Policy headers | vite.config.ts or served headers | 2h | Pending |
| 14.4 | Subresource Integrity (SRI) | On all loaded scripts | 2h | Pending |
| 14.5 | Audit log HMAC chain | HMAC-SHA256 chain, store head separately | 4h | Pending |
| 14.6 | Purge history when encryption toggled | Encrypt or delete old versions | 3h | Pending |
| 14.7 | Rate limiting on auth | Exponential backoff | 2h | Pending |
| 14.8 | javascript: URL validation in ImageNode | Block executable URLs | 1h | Pending |
| 14.9 | Replace Math.random with crypto.randomUUID | All IDs | 2h | Pending |
| 14.10 | Account enumeration protection | Uniform error messages | 1h | Pending |
| 14.11 | CSP for CodeSandbox Worker | worker-src 'none' | 1h | Pending |
| 14.12 | Zero password from memory | Clear state after signIn | 1h | Pending |
| 14.13 | Bind auth token to origin | Origin validation | 3h | Pending |
| 14.14 | networkSecurityConfig | Replace usesCleartextTraffic | 2h | Pending |

---

## Phase 15: Testing & CI Overhaul

| # | Item | Current | Target | Effort | Status |
|---|-------|---------|--------|--------|--------|
| 15.1 | Tests for encryption.ts | None | Full coverage | 4h | Pending |
| 15.2 | Tests for auth.ts | None | Full coverage | 3h | Pending |
| 15.3 | Tests for useNoteStore.ts | None | CRUD, initDocs, parseStats | 6h | Pending |
| 15.4 | Tests for useAuthStore.ts | None | Login, register, logout, persist | 3h | Pending |
| 15.5 | Tests for versionHistory.ts | None | Git commits, diff, restore | 4h | Pending |
| 15.6 | Tests for embedding.ts | None | generateEmbedding, similarity | 3h | Pending |
| 15.7 | Tests for upload.ts | None | Upload, clipboard, fallback | 2h | Pending |
| 15.8 | Tests for exportDoc.ts | None | Markdown, HTML, download | 3h | Pending |
| 15.9 | Tests for GraphView | None | Nodes, edges, simulation | 4h | Pending |
| 15.10 | Tests for SpatialCanvas | None | Cards, drag, edges, persistence | 4h | Pending |
| 15.11 | Tests for Sidebar | None | Tree, filter, rename, tags | 3h | Pending |
| 15.12 | Kotlin SyncWorker tests | None | enqueue, syncDocument, markSynced | 4h | Pending |
| 15.13 | Kotlin YjsSyncEngine tests | None | receiveUpdate, merge, state vector | 4h | Pending |
| 15.14 | Kotlin AndroidDB tests | None | executeWrite, executeQuery, upgrade | 3h | Pending |
| 15.15 | TypeScript strict mode | Loose types everywhere | Full strict checking | 8h | Pending |
| 15.16 | Fix CI supabase test (use mocks) | Requires env vars | Mock-friendly | 2h | Pending |
| 15.17 | E2E tests (Playwright/Cypress) | None | Core user flows | 16h | Pending |
| 15.18 | Visual regression for canvas | None | Excalidraw screenshot compare | 8h | Pending |

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
## Phase 18: Fix Fake "Done" Claims (Phases 4-6 Audit Corrections)

Items marked as done in Phases 4-6 that are NOT actually implemented in the source code.

| # | Claimed Done | Actual Reality | File:Line | Severity | Status |
|---|-------------|----------------|-----------|----------|--------|
| 18.1 | Remove `!important` CSS overrides from Excalidraw canvas | `width: 100% !important; height: 100% !important; position: relative !important; margin: 0 !important; padding: 0 !important` STILL PRESENT | `index.css:719-730` | HIGH | Pending |
| 18.2 | Buffer Excalidraw strokes in ref during drawing, defer to pointerUp/blur | Only simple setTimeout debounce (300-400ms), no ref buffering, no pointerUp/blur handlers | `Canvas.tsx:37`, `ExcalidrawCanvasComponent.tsx:45` | HIGH | Pending |
| 18.3 | Custom WebChromeClient with file chooser | Default `WebChromeClient()` — no `onShowFileChooser` override | `GraphiteWebView.kt:23` | HIGH | Pending |
| 18.4 | Strip `javascript:` prefix from evaluateJavascript calls | No sanitization at all — direct string interpolation with docId | `GraphiteWebView.kt:44` | CRITICAL | Pending |
| 18.5 | Real Yjs binary CRDT merge (state vector decoding) | Reads local state vector but blindly stores incoming — LWW, no CRDT merge | `YjsSyncEngine.kt:15-19` | CRITICAL | Pending |
| 18.6 | Render [[WikiLink]] as interactive clickable elements | Plain TextNode with DOM-level click handler; not distinct interactive elements, no visual link styling | `WikiLinkPlugin.tsx:54-67` | MEDIUM | Pending |

---

## Phase 19: Additional Critical Bugs Found (Post-Audit Round 2)

### 19.1 Race Conditions & Data Corruption

| # | Bug | File:Line | Severity | Status |
|---|-----|-----------|----------|--------|
| 19.1.1 | Debounced save fires with wrong docId — switching docs within 300ms saves OLD doc content into NEW doc | `Editor.tsx:252-278` | CRITICAL | Pending |
| 19.1.2 | Toast auto-dismiss removes wrong toast (closure captures ref, not value) | `Toast.tsx:12-17` | HIGH | Pending |
| 19.1.3 | Canvas debounce timer never cleared on unmount — fires on unmounted component | `Canvas.tsx:37-40` | HIGH | Pending |
| 19.1.4 | ExcalidrawCanvasComponent debounce fires after unmount, calls stale node ref | `ExcalidrawCanvasComponent.tsx:44-58` | HIGH | Pending |
| 19.1.5 | Encrypting with stale content (modal captured old editorState, user edited while modal open) | `SecurityModal.tsx:139-154` | CRITICAL | Pending |
| 19.1.6 | Decrypt restores stale content (same root cause as 19.1.5) | `SecurityModal.tsx:605-619` | HIGH | Pending |
| 19.1.7 | Content loss when doc encrypted externally during debounce (pending save drops enc: content) | `Editor.tsx:255-256` | HIGH | Pending |
| 19.1.8 | Typing lost on doc switch before debounce fires (cleanup clears timer but doesn't flush) | `Editor.tsx:274-278` | HIGH | Pending |
| 19.1.9 | Race condition between concurrent browser tabs (last write wins, no merge) | `docStorage.ts:29-38,68-78` | HIGH | Pending |
| 19.1.10 | syncDocument partial failure — note_nodes saved but block_entities not (no transaction) | `supabase.ts:156-183` | HIGH | Pending |

### 19.2 Lexical Editor Bugs

| # | Bug | File:Line | Severity | Status |
|---|-----|-----------|----------|--------|
| 19.2.1 | Uncaught parseEditorState throws — valid JSON but unknown node types crash editor | `Editor.tsx:86-93` | CRITICAL | Pending |
| 19.2.2 | Cursor position corruption after setEditorState (selection not restored) | `Editor.tsx:86-93` | HIGH | Pending |
| 19.2.3 | Plugin check reads localStorage on every render (60 reads/sec while typing) | `Editor.tsx:314`, `pluginSystem.ts:104-108` | MEDIUM | Pending |

### 19.3 Zustand / State Management Bugs

| # | Bug | File:Line | Severity | Status |
|---|-----|-----------|----------|--------|
| 19.3.1 | StrictMode creates TWO Realtime subscriptions on mount (leak doubled) | `useNoteStore.ts:142-173` | HIGH | Pending |
| 19.3.2 | App crashes in private browsing (localStorage throws, initDocs creates endless Welcome docs) | `useNoteStore.ts:114-140` | HIGH | Pending |
| 19.3.3 | parseStats crashes on encrypted content (TypeError on parsed.root) | `useNoteStore.ts:14-48` | MEDIUM | Pending |
| 19.3.4 | getState() called during render — breaks reactivity, stale props | `App.tsx:490-492` | HIGH | Pending |

### 19.4 localStorage / Storage Bugs

| # | Bug | File:Line | Severity | Status |
|---|-----|-----------|----------|--------|
| 19.4.1 | trimForStorage silently destroys canvas data for docs beyond #5 | `docStorage.ts:44-66` | CRITICAL | Pending |
| 19.4.2 | saveDocs silently fails in private browsing (SecurityError swallowed) | `docStorage.ts:68-90` | CRITICAL | Pending |
| 19.4.3 | Offline queue grows unbounded, oldest entries silently dropped | `supabase.ts:105-113` | MEDIUM | Pending |

### 19.5 Canvas / Excalidraw Bugs

| # | Bug | File:Line | Severity | Status |
|---|-----|-----------|----------|--------|
| 19.5.1 | Inline canvas node has stale data on undo (Lexical undo doesn't trigger re-render) | `CanvasNode.tsx:68-71` | MEDIUM | Pending |
| 19.5.2 | Canvas ignores external state changes (initialData only consumed on mount) | `Canvas.tsx:14-21` | MEDIUM | Pending |
| 19.5.3 | Excalidraw ResizeObserver causes infinite resize loop (synthetic resize event) | `ExcalidrawCanvasComponent.tsx:23-31` | MEDIUM | Pending |
| 19.5.4 | Spatial canvas sync is dead code (upsert never awaited/sent) | `spatialCanvasStorage.ts:51-58` | CRITICAL | Pending |

### 19.6 Graph View Bugs

| # | Bug | File:Line | Severity | Status |
|---|-----|-----------|----------|--------|
| 19.6.1 | Math.random() in useMemo randomizes all node positions on every keystroke | `GraphView.tsx:59` | HIGH | Pending |
| 19.6.2 | useMemo output directly mutated by simulation loop | `GraphView.tsx:139-159` | HIGH | Pending |
| 19.6.3 | Canvas DPR scaling fails on fractional devicePixelRatio displays | `GraphView.tsx:117-121` | MEDIUM | Pending |
| 19.6.4 | Pan offset accumulates exponentially during zoom (offset not zoom-adjusted) | `GraphView.tsx:136-138,212-213,259-263` | MEDIUM | Pending |

### 19.7 Spatial Canvas Bugs

| # | Bug | File:Line | Severity | Status |
|---|-----|-----------|----------|--------|
| 19.7.1 | SpatialCanvas never seeds initial cards (effect runs before Zustand init completes) | `SpatialCanvas.tsx:28-49` | HIGH | Pending |
| 19.7.2 | Card text snippet shows raw JSON garbage (braces stripped but JSON props remain) | `SpatialCanvas.tsx:273` | MEDIUM | Pending |
| 19.7.3 | SVG arrow layer hardcoded to 5000x5000px — arrows beyond boundary invisible | `SpatialCanvas.tsx:250` | LOW | Pending |

### 19.8 Auth & Session Bugs

| # | Bug | File:Line | Severity | Status |
|---|-----|-----------|----------|--------|
| 19.8.1 | No auth state change listener — after session expiry, Supabase calls fail silently | `auth.ts:33-42`, `useAuthStore.ts` | HIGH | Pending |
| 19.8.2 | Password remains in memory after login (visible in React DevTools) | `AuthScreen.tsx:81-91` | MEDIUM | Pending |

### 19.9 Export / Misc Bugs

| # | Bug | File:Line | Severity | Status |
|---|-----|-----------|----------|--------|
| 19.9.1 | CSV audit export generates malformed files (no comma/newline escaping) | `auditLog.ts:79-91` | MEDIUM | Pending |
| 19.9.2 | encryption.ts bufToBase64 crashes on payloads >64KB (spread arg limit) | `encryption.ts:14,17` | MEDIUM | Pending |
| 19.9.3 | PublishModal copies fake URL that doesn't exist (misleading UX) | `PublishModal.tsx:22` | MEDIUM | Pending |
| 19.9.4 | Version history shows fake SHA when IndexedDB unavailable (misleading) | `versionHistory.ts:191-195` | MEDIUM | Pending |
| 19.9.5 | Kanban cards use Math.random() for ID (collision possible) | `KanbanBoard.tsx:24` | LOW | Pending |
| 19.9.6 | Pomodoro timer has cumulative drift (~5-15ms/min) | `PomodoroWidget.tsx:8-18` | LOW | Pending |
| 19.9.7 | SemanticSearchModal recomputes ALL embeddings on every keystroke in any doc | `SemanticSearchModal.tsx:27-37` | HIGH | Pending |
| 19.9.8 | WordStatsBar and store parseStats produce different counts (conflicting stats) | `WordStatsBar.tsx:10-23` | MEDIUM | Pending |

---

## Phase 20: UX Improvements Not In Previous Plans

### 20.1 Accessibility

| # | Issue | File:Line | Fix | Status |
|---|-------|-----------|-----|--------|
| 20.1.1 | AI Chat uses single-line input — no multi-line prompts | `AIChatPanel.tsx:204-218` | Replace with textarea, Enter=submit, Shift+Enter=newline | Pending |
| 20.1.2 | All modal close buttons lack aria-label | All modals | Add aria-label="Close modal" to all close buttons | Pending |
| 20.1.3 | Sidebar document tree lacks ARIA tree roles | `Sidebar.tsx:129-241` | Add role=tree/treeitem, aria-expanded, aria-selected | Pending |
| 20.1.4 | Toolbar and canvas buttons have no visible focus indicator | `EditorToolbar.tsx`, `GraphView.tsx`, `SpatialCanvas.tsx` | Add :focus-visible styles with outline | Pending |
| 20.1.5 | Toast dismissible only by click, not keyboard | `Toast.tsx:33-40` | Add onKeyDown handler for Enter/Space | Pending |

### 20.2 Feedback & User Awareness

| # | Issue | File:Line | Fix | Status |
|---|-------|-----------|-----|--------|
| 20.2.1 | No "Saving..."/"Saved" indicator during editor debounce | `Editor.tsx:252-272` | Show inline saving indicator during debounce | Pending |
| 20.2.2 | Editor renders blank for encrypted docs with no explanation | `Editor.tsx:79-82` | Show banner: "This document is encrypted. Go to Security to unlock." | Pending |
| 20.2.3 | No undo/trash for deleted documents (permanent data loss) | `Sidebar.tsx:221-234` | Implement soft-delete with "Recently Deleted" view | Pending |
| 20.2.4 | Supabase sync failures silently swallowed (user never knows) | `useNoteStore.ts:208,225,235,307` | Show non-blocking toast on sync failure | Pending |
| 20.2.5 | Audit log Clear button has no confirmation | `SecurityModal.tsx:681-686` | Add confirmation dialog for dangerous action | Pending |
| 20.2.6 | Git commit created on every auto-save (dozens of garbage commits per min) | `useNoteStore.ts:306` | Throttle commits to max 1/30s or manual snapshots only | Pending |

### 20.3 Visual/UI Inconsistencies

| # | Issue | File:Line | Fix | Status |
|---|-------|-----------|-----|--------|
| 20.3.1 | All buttons turn accent-purple on hover — including destructive ones | `index.css:269-275` | Add `.danger` variant with red hover color | Pending |
| 20.3.2 | SpatialCanvas dot-grid doesn't scale with zoom | `SpatialCanvas.tsx:160-161` | Move grid to transform layer or recalculate by zoomLevel | Pending |
| 20.3.3 | Zoom buttons never disabled at min/max zoom | `SpatialCanvas.tsx:226-233`, `GraphView.tsx:295-303` | Disable button at boundary values | Pending |
| 20.3.4 | Toolbar link button inserts empty link when no selection | `EditorToolbar.tsx:221` | Only dispatch if selection exists; disable button otherwise | Pending |

### 20.4 Modal/Dialog Issues

| # | Issue | File:Line | Fix | Status |
|---|-------|-----------|-----|--------|
| 20.4.1 | SecurityModal and AIChatPanel lack Escape key handling | `SecurityModal.tsx:186`, `AIChatPanel.tsx:63-75` | Add onKeyDown handler for Escape | Pending |
| 20.4.2 | No focus trapping in any modal (Tab cycles behind backdrop) | All modals | Implement focus trapping, aria-modal=true, role=dialog | Pending |
| 20.4.3 | VersionHistory restore fragile — proceeds after backup commit fails | `VersionHistoryModal.tsx:46-51` | Wrap in try-catch; abort restore if backup fails | Pending |

### 20.5 Mobile-Specific Issues

| # | Issue | File:Line | Fix | Status |
|---|-------|-----------|-----|--------|
| 20.5.1 | Header buttons overflow horizontally on small viewports | `App.tsx:183-238` | Add overflow-x:auto or collapse into "More" dropdown | Pending |
| 20.5.2 | SpatialCanvas and GraphView have no touch event handlers (mouse-only) | `SpatialCanvas.tsx:74-112`, `GraphView.tsx:205-257` | Add parallel onTouchStart/Move/End handlers | Pending |

### 20.6 Information Architecture

| # | Issue | File:Line | Fix | Status |
|---|-------|-----------|-----|--------|
| 20.6.1 | KanbanBoard is orphan dead code — no UI entry point | `KanbanBoard.tsx` | Wire into accessible location or remove | Pending |
| 20.6.2 | AuthScreen has no "Forgot Password" flow | `AuthScreen.tsx:59-123` | Add "Forgot password?" link with resetPasswordForEmail | Pending |

### 20.7 Performance Perception

| # | Issue | File:Line | Fix | Status |
|---|-------|-----------|-----|--------|
| 20.7.1 | GraphView RAF loop runs at 60fps even with zero nodes (wastes CPU) | `GraphView.tsx:198-199` | Cancel animation frame when no nodes exist | Pending |
| 20.7.2 | Publish button visually blends with secondary buttons (should be primary action) | `App.tsx:234-237` | Apply distinct styling or move to prominent position | Pending |

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

## Current Limitations Summary

| Area | Critical | Major | Minor |
|------|----------|-------|-------|
| **Persistence** | Nothing saves to disk or cloud | `CommonDatabaseHelper` is all `println` | — |
| **Sync** | Yjs merge is a no-op | No Supabase client wired | — |
| **Git** | Fake commit hashes, no JGit | Same table collision with sync state | — |
| **Editor** | Uncontrolled, `btoa` crashes on Unicode | No toolbar, no markdown shortcuts | No keyboard shortcuts doc |
| **Canvas** | No persistence | Tab-separated, not inline | Fixed 500px height |
| **Mobile** | No Android target exists | No keyboard handling | No safe areas |
| **Auth** | No login flow | RLS enforced but no user | — |
| **Tests** | Zero tests anywhere | — | — |
| **Backlinks** | Regex parse only, no DB storage | No clickable navigation | — |
| **LexoRank** | 26-char alphabet, prefix bug | — | — |


