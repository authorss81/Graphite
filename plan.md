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
| 1.6.1 | **Unit tests (JS)** | Vitest — bridge utilities, LexoRank-like ordering, analytics text extraction. |
| 1.6.2 | **Unit tests (KMP)** | kotlin.test — `LexoRank.between()`, `YjsSyncEngine` logic. |
| 1.6.3 | **Component tests** | @testing-library/react — Editor mounting, tab switching, Canvas rendering. |
| 1.6.4 | **CI** | GitHub Actions — lint + typecheck + test on every PR. | ⬜ Pending |
| 1.6.5 | **Build CI (Android + iOS)** | GitHub Actions — `build-android.yml` (ubuntu, assembleDebug → AAR) and `build-ios.yml` (macos, linkDebugFrameworkIosArm64 + IosSimulatorArm64 → framework). Both green. | ✅ Done |

### 1.7 UX Hardening

| # | Item | Details |
|---|------|---------|
| 1.7.1 | **Touch targets** | Increase `graphite-btn` padding to meet 48dp minimum. |
| 1.7.2 | **Keyboard handling** | Add `visualViewport` API listener for mobile keyboard. Adjust editor height on keyboard open. |
| 1.7.3 | **Safe areas** | Add `env(safe-area-inset-*)` padding for notched devices. |
| 1.7.4 | **Loading states** | Skeleton screens for doc load, canvas load, sync operations. |
| 1.7.5 | **Error states** | Toast/banner for sync failures, save errors, network errors. |

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

## Differentiation & Positioning

### How Graphite Differs From Competitors

| Feature | Graphite (planned) | Notion | Obsidian | Logseq | Apple Notes |
|---------|-------------------|--------|----------|--------|-------------|
| Local-first encrypted | ✅ | ❌ cloud-only | ✅ | ✅ | ✅ |
| Rich text + canvas | ✅ (inline) | ❌ limited draw | ❌ plugin | ❌ | ❌ sketch only |
| CRDT real-time sync | ✅ Yjs | ❌ OT (cloud) | ❌ file-based | ❌ Datascript | ❌ CloudKit |
| Git version history | ✅ built-in | ❌ | ✅ plugin | ❌ | ❌ |
| AI semantic search | ✅ pgvector | ✅ AI (paid) | ❌ plugin | ❌ | ❌ |
| Open/exportable format | ❌ (planned) | ❌ | ✅ Markdown | ✅ | ❌ |
| Plugin ecosystem | ❌ (phase 3) | ❌ | ✅ 12,000+ | ✅ | ❌ |
| Block databases | ❌ (phase 3) | ✅ core | ❌ | ❌ | ❌ |
| Graph view | ❌ (phase 2) | ❌ | ✅ core | ✅ | ❌ |
| Mobile offline | ✅ (planned) | ❌ limited | ✅ | ✅ | ✅ |

### Unique Value Proposition (UVP)

**"The only note-taking app with local-first encryption, built-in Excalidraw canvas, CRDT real-time sync, AND Git version history — all in one native mobile app."**

### Target Audience

- **Phase 1:** Solo developers, privacy-conscious students/researchers, KMP enthusiasts
- **Phase 2:** PKM practitioners migrating from Obsidian/Notion, technical writers, designers
- **Phase 3:** Teams wanting Notion-like collaboration with offline-first security

---

## Monetization Strategy

### Model: Freemium Cloud + Local Hybrid

| Tier | Price | Key Limits |
|------|-------|------------|
| **Free** | $0 | 50 MB cloud sync, 2 devices, 7-day version history, basic search, 5 template library |
| **Pro** | $6/mo ($60/yr) | 10 GB cloud sync, unlimited devices, 1-year history, AI semantic search, custom publish domain, full template library |
| **Business** | $15/seat/mo | 100 GB, unlimited history + point-in-time restore, multi-user collaboration, roles, Slack support |

### Always Free (never paywall)
- Local editor + canvas (fully offline)
- Local folder management + tags
- Backlinks + graph view
- Markdown/HTML export

### Competitive Pricing
- Undercuts Obsidian Sync ($5/mo) + Publish ($10/mo) = $15 combined → Graphite Pro at $6 covers both
- Undercuts Notion ($10/mo personal, $18/mo team) → Graphite Business at $15/seat
- Above zero — local-first users are price-sensitive but will pay for reliable cloud sync

### Monetization Risks
1. **Never charge for local editing** — users will churn to Obsidian/Logseq instantly
2. **Sync pricing ceiling** — note-taking community considers $5-10/mo the max for sync
3. **Self-hosted leakage** — schema is Postgres + static webview. Offer paid self-host license ($20/mo)
4. **Import/export required** — users won't pay without migration path from Obsidian/Notion

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
