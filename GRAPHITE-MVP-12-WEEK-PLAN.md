# Graphite MVP — 12-Week Ship Plan
## Free, Secure, Synced Notes for Friends

**Goal:** Ship a working, encrypted, multi-device note app to friends in 12 weeks. Not Notion. Not Bear. Better than Google Keep. Free forever.

**Stack:**
- Frontend: React SPA + Tailwind + shadcn/ui
- Mobile: Capacitor (Android/iOS in native shells)
- Backend: Firebase Firestore (free tier)
- Security: End-to-end encryption (TweetNaCl.js)
- UI generation: v0.app (free tier)
- Code help: OpenCode free models (Hy3, DeepSeek Flash, North Mini Code)

---

## PART 1: THE MVP SCOPE (5 SCREENS ONLY)

### What you're shipping (v1.0):

| Screen | Purpose | Components | Buttons |
|---|---|---|---|
| **Onboarding/Login** | Email signup, password setup, encryption key generation | AuthScreen, EmailInput, PasswordInput, KeyGenDialog | 2 (Sign up, Login) |
| **Notes List** | See all notes, search, create new, delete | NotesList, NoteItem, SearchBar, DeleteConfirm | 2 (+ New, ⋮ More) |
| **Note Editor** | Write/edit markdown, formatting toolbar, auto-save | Editor, Toolbar, StatusBar | 6 (Bold, Italic, List, Link, Code, More…) |
| **Settings** | Dark mode toggle, export, sign out, encryption info | SettingsPanel, ThemeToggle, EncryptionInfo | 4 (Toggle, Export, Info, Logout) |
| **Search Results** | Full-text search across all notes | SearchResults, ResultItem | 1 (Back) |

**Total:** 5 screens, ~25 components, ~40 buttons.

### What you're NOT shipping (v1.0 - save for v2):

- ❌ Canvas, Spatial, Graph, Kanban views
- ❌ Team/comments/sharing
- ❌ Plugins, Templates, Marketplace
- ❌ Publish, Export MD/HTML (too much, do in v2)
- ❌ History/Version UI (git versioning can wait)
- ❌ Semantic AI Search (complex, needs real backend)
- ❌ AI Assistant, AI Chat panels
- ❌ Audit logs, granular permissions

**Delete from your codebase:**
- AppHeader (replace with simple TopBar: search + settings + logout)
- AppBottomNav with 7 modes (not needed, use Notes List sidebar)
- All modals except Settings
- All those 30 components from the button audit
- Custom CSS in index.css (switch to Tailwind)

---

## PART 2: 12-WEEK TIMELINE

### Week 1-2: Backend & Security Foundation

**Goal:** Firebase + encryption working locally. Confirm you can read/write encrypted data.

**Tasks:**

1. **Firebase setup (day 1)**
   ```bash
   npm install firebase
   ```
   - Create Firebase project (free tier)
   - Get config (apiKey, projectId, etc.)
   - Create `src/firebase/config.ts` with config constants
   - Create `src/firebase/firestore.ts` with Firestore init

2. **TweetNaCl encryption (day 1-2)**
   ```bash
   npm install tweetnacl tweetnacl-util
   ```
   - Create `src/crypto/encryption.ts`
   - Write `encryptNote()` and `decryptNote()` functions
   - Test: encrypt "Hello" → decrypt → verify it matches

3. **User auth layer (day 2-3)**
   - Firebase Auth setup (email/password)
   - Create `src/firebase/auth.ts` with signUp/login/logout
   - Test: create account → login → logout

4. **Firestore data model (day 3-4)**
   - Create `notes` collection with fields: `id, userId, content, title, createdAt, updatedAt, encryptedContent`
   - Create `src/firebase/noteStore.ts` with addNote/updateNote/deleteNote/getNotes
   - **Test on two devices simultaneously:** create note on device A, see it appear on device B within 2 seconds

5. **Test checklist:**
   - [ ] Firebase console shows data in Firestore
   - [ ] Can encrypt/decrypt a note without errors
   - [ ] Two browser tabs: create note in one, see it in other (real-time sync working)
   - [ ] Offline test: close internet, create note, reconnect, note syncs

**OpenCode prompt (week 2):**
> "I have a React app with Firebase Firestore initialized. Show me how to wire a React hook `useNotes()` that reads all notes from Firestore, decrypts them client-side using TweetNaCl, and returns them as an array. Include state management for loading/error states. Assume I have encryptNote/decryptNote functions already."

**Commit:** `git commit -m "backend: firebase + encryption foundation"`

---

### Week 3-4: Core UI — Functional (No Polish Yet)

**Goal:** 5 screens working, data flows end-to-end, no design polish. Ugly is OK right now.

**Tasks:**

1. **Remove old components (day 1-2)**
   ```bash
   rm src/components/AppHeader.tsx
   rm src/components/AppBottomNav.tsx
   # Delete all modal components except Settings
   # Delete Canvas, Spatial, Graph components
   ```

2. **Install shadcn/ui base (day 2)**
   ```bash
   npx shadcn@latest init
   npx shadcn@latest add button
   npx shadcn@latest add input
   npx shadcn@latest add card
   npx shadcn@latest add dialog
   ```

3. **Build 5 screens (day 3-8), ugly but functional**
   - `src/pages/AuthPage.tsx` — email/password inputs, sign up/login buttons
   - `src/pages/NotesListPage.tsx` — list of notes from Firestore, + New Note button
   - `src/pages/EditorPage.tsx` — textarea for editing, saves to Firestore on blur
   - `src/pages/SettingsPage.tsx` — dark mode toggle, logout button
   - `src/pages/SearchPage.tsx` — search input, display matching notes

4. **Wire state management (day 8-9)**
   - `src/hooks/useNotes.ts` — fetch all notes from Firestore
   - `src/hooks/useAuth.ts` — current user, logout
   - `src/context/AuthContext.tsx` — provide user globally
   - Test: create note in editor → see it appear in notes list immediately

5. **Routing (day 9-10)**
   ```bash
   npm install react-router-dom
   ```
   - Create routes: `/auth`, `/notes`, `/notes/:id`, `/settings`, `/search`
   - Test: clicking note opens editor, back button works

**Test checklist:**
- [ ] Can sign up, login, logout
- [ ] Can create a note (see it in list immediately)
- [ ] Can edit a note (auto-saves to Firestore)
- [ ] Can search for notes (searches in real-time)
- [ ] Can toggle dark mode
- [ ] All 5 screens navigate correctly
- [ ] Works in two browser tabs simultaneously

**OpenCode prompts (week 3-4):**

Prompt 1:
> "I have a React SPA with auth context and Firestore setup. Build me a NotesList component that: (1) shows all notes as cards in a grid, (2) has a search input at top, (3) has a + New Note button, (4) clicking a note opens it in editor. Use my useNotes() hook to fetch data. Include loading state."

Prompt 2:
> "Build me a Note Editor component with: (1) title input at top, (2) large textarea for content, (3) autosave to Firestore on blur, (4) status indicator (Saving... Saved), (5) back button. Content is decrypted on load, encrypted before saving to Firestore."

**Commit:** `git commit -m "ui: 5 functional screens, no design yet"`

---

### Week 5-7: Polish Top 2 Screens with v0

**Goal:** Notes List + Editor look beautiful. Dark mode + light mode working. Mobile-responsive.

**Tasks:**

1. **Pick your style (day 1)**
   - Warm off-white background: `#FAFAF8`
   - One accent color: teal (`#06b6d4`), amber (`#f59e0b`), or forest green (`#10b981`) — pick one
   - Font: Inter (body), Outfit (headings) — already in shadcn defaults
   - No more than 2 font weights per screen (regular + semibold)

2. **Redesign Notes List with v0 (day 2-4)**
   - Screenshot your current ugly NotesListPage
   - Go to v0.app, upload screenshot
   - Prompt:
     ```
     "Redesign this note list screen for a free, secure note app. 
     Style: Clean, minimal, warm. 
     Use shadcn/ui with Tailwind. 
     Keep: search bar, note cards, + New button.
     Design goals: 
     - One accent color (teal) for primary actions only
     - 16px spacing between cards
     - Card hover effect (subtle shadow increase)
     - Search has clear icon
     - + New button is filled teal, only filled button
     - Dark mode support
     - Mobile: full width, cards stack vertically"
     ```
   - v0 generates code → copy JSX into `src/pages/NotesListPage.tsx`
   - Replace hardcoded colors with Tailwind classes

3. **Redesign Editor with v0 (day 5-7)**
   - Screenshot your current ugly EditorPage
   - Prompt:
     ```
     "Redesign this markdown note editor. 
     Style: Clean, minimal, warm (off-white #FAFAF8).
     Use shadcn/ui with Tailwind.
     Keep: title input, content textarea, toolbar (bold/italic/list/link/code buttons).
     Design goals:
     - Title input is large, prominent (24px, semibold)
     - Textarea is full-width, min 400px height, monospace font for code blocks
     - Toolbar buttons: text, no fill, hover = light background
     - One teal button for 'Save as Template' or similar
     - Status: 'Saving...' text in gray bottom-right
     - Dark mode support
     - Mobile: full screen, no horizontal scroll"
     ```
   - v0 generates code → replace your EditorPage

4. **Dark mode (day 8)**
   - Install `next-themes`:
     ```bash
     npm install next-themes
     ```
   - Wrap app in `<ThemeProvider>` in main layout
   - Add theme toggle to Settings page
   - Tailwind already supports `dark:` classes — test it works

5. **Mobile responsive (day 9)**
   - Test in Chrome DevTools mobile view (375px width)
   - Fix any overflow issues
   - Buttons should be 48px+ min-height (tap targets)
   - Sidebar on desktop, hidden on mobile

**Test checklist:**
- [ ] Notes List looks clean, no purple oversaturation
- [ ] Editor toolbar is organized, max 6 buttons visible
- [ ] Only one filled button per screen
- [ ] Dark mode works (toggle in settings)
- [ ] Light mode works
- [ ] Mobile view: no horizontal scroll, buttons are tappable
- [ ] Spacing consistent (multiples of 8px or 16px)
- [ ] Sync still works after redesign

**Commits:**
```bash
git commit -m "ui: redesign notes list with v0"
git commit -m "ui: redesign editor with v0"
git commit -m "ui: dark mode + mobile responsive"
```

---

### Week 8-9: Security Hardening

**Goal:** Encryption is solid, Firebase rules prevent unauthorized reads, users can't be impersonated.

**Tasks:**

1. **Firebase security rules (day 1-2)**
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /notes/{noteId} {
         allow create, read, update, delete: if request.auth.uid == resource.data.userId;
         allow create: if request.auth.uid == request.resource.data.userId;
       }
     }
   }
   ```
   - Deploy rules in Firebase Console
   - Test: try to read another user's note from console → should fail

2. **Encryption test (day 2-3)**
   - Manually decrypt a note in Firefox DevTools
   - Confirm you can't read the raw `encryptedContent` without the decryption key
   - Test: log in as user A, create note, log out, log in as user B → can't see user A's note

3. **Password reset (day 3-4)**
   - Firebase Auth already handles this
   - Test: forgot password → email works → reset works

4. **Session management (day 4-5)**
   - Logout clears all localStorage/sessionStorage (except maybe app settings)
   - Test: logout → try to manually navigate to `/notes` → redirected to login

5. **HTTPS only in production (day 5)**
   - When deployed, ensure your app is HTTPS-only
   - Firebase hosting enforces this by default

**Test checklist:**
- [ ] Can't read encrypted content without decrypt key
- [ ] Can't access another user's notes
- [ ] Password reset email works
- [ ] Logout truly logs out
- [ ] No sensitive data in localStorage (only cache encrypted notes)

**Commit:** `git commit -m "security: firestore rules, encryption test, session handling"`

---

### Week 10-11: Mobile Build & Testing

**Goal:** App runs on real Android phone, Capacitor wrapper works, safe areas respected.

**Tasks:**

1. **Android build (day 1-2)**
   ```bash
   npm run build  # build React SPA
   npx cap add android
   npx cap sync android
   npx cap open android  # opens Android Studio
   ```
   - In Android Studio: Shift+F10 to build + run on emulator
   - Test: app launches, login works, can create note

2. **Safe areas (day 2-3)**
   - Add to `src/index.css`:
     ```css
     body {
       padding-top: env(safe-area-inset-top);
       padding-bottom: env(safe-area-inset-bottom);
     }
     ```
   - Test on notched phone: top bar shouldn't overlap content

3. **Status bar styling (day 3-4)**
   ```bash
   npm install @capacitor/status-bar
   npx cap sync
   ```
   - In `src/App.tsx`:
     ```ts
     import { StatusBar, Style } from '@capacitor/status-bar';
     StatusBar.setBackgroundColor({ color: '#FAFAF8' });
     StatusBar.setStyle({ style: Style.Light });
     ```
   - Test: status bar matches your app background

4. **Keyboard handling (day 4-5)**
   ```bash
   npm install @capacitor/keyboard
   ```
   - In EditorPage, when textarea is focused, keyboard should push content up (not cover it)
   - Test: tap textarea → keyboard appears → can still see content

5. **Test on real devices (day 5-11)**
   - Build APK: `npx cap build android --release`
   - Install on 3-5 real phones (ask friends)
   - Test: login, create note, edit, search, sync across devices
   - Collect bugs: keyboard behavior, spacing, colors on different screens

**Bugs to fix (as you find them):**
- Keyboard pushing content off-screen → add margin-bottom
- Text too small on phone → increase font sizes
- Buttons too close together → add more padding
- Dark mode colors wrong → adjust Tailwind config

**Test checklist:**
- [ ] App builds and installs on Android phone
- [ ] Login/signup works
- [ ] Notes sync across devices in <2 seconds
- [ ] Editor toolbar is usable on phone
- [ ] Search works
- [ ] Safe areas respected (no notch overlap)
- [ ] Dark mode works on phone
- [ ] Can logout and login again
- [ ] App doesn't crash on any screen
- [ ] No console errors in DevTools (remote debugging via Chrome)

**Commits:** (daily)
```bash
git commit -m "mobile: safe areas, status bar"
git commit -m "mobile: keyboard handling in editor"
git commit -m "mobile: bug fixes from real device testing"
```

---

### Week 12: Polish & Ship

**Goal:** Fix last bugs, submit to Google Play closed beta, friends install and test.

**Tasks:**

1. **Remaining UX bugs (day 1-3)**
   - Collect friend feedback from week 11 testing
   - Fix: spacing issues, color tweaks, missing error messages
   - Commit: `git commit -m "ux: final polish from feedback"`

2. **Google Play setup (day 4)**
   ```bash
   npx cap build android --release
   # generates app-release.aab (Android App Bundle)
   ```
   - Go to Google Play Console
   - Create app entry (free)
   - Upload AAB
   - Add screenshots (use your v0-designed screens!)
   - Add description: "Free, end-to-end encrypted notes. Syncs across devices. No account tracking."
   - Set as closed beta
   - Send beta link to friends

3. **TestFlight (iOS optional for MVP)**
   - If shipping iOS too: `npx cap add ios`, repeat build process
   - Submit to TestFlight (takes ~30 mins for review)

4. **Launch (day 5)**
   - Send link to 10 friends
   - Ask: "Can you create a note, edit it, and see it sync to your other device?"
   - Collect 1 week of feedback
   - Fix critical bugs (crashes, sync not working, login broken)

**Commit:** `git commit -m "release: v1.0 shipped to closed beta"`

---

## PART 3: HOW TO USE v0.APP

v0 is a **code generator**, not a library. You don't install it or integrate it into your project. Here's the workflow:

### v0 Workflow (5 min per screen)

1. **Screenshot your current ugly screen**
   - Open browser DevTools (F12)
   - Right-click screen → Take screenshot
   - Save as `current-noteslist.png`

2. **Go to v0.app**
   - Sign in (free, Vercel account)
   - Click "Create new"
   - Choose "From image" or "From prompt"

3. **Upload screenshot or write a prompt**
   - Prompt: (copy one from the timeline above)
   - v0 generates a preview in ~30 seconds

4. **Copy the code**
   - v0 shows React/TSX code on the right
   - Copy the entire component code
   - Click "Copy code"

5. **Paste into your project**
   - Open your file: `src/pages/NotesListPage.tsx`
   - Delete the old code
   - Paste v0's code
   - Fix imports if needed (v0 might import things you don't have)

6. **Test in browser**
   ```bash
   npm run dev
   # navigate to notes list page
   # does it look good? click buttons, test interactivity
   ```

7. **Commit**
   ```bash
   git add .
   git commit -m "ui: redesign notes list with v0"
   ```

**Important:** v0 generates *visual* code. You still need to wire state/data yourself. After pasting v0 code:
- Keep your `useNotes()` hook intact
- Keep your `onClick` handlers intact
- Only replace the JSX visual structure

---

## PART 4: OPENCODE INTEGRATION

Use your free OpenCode models for:
- Wiring React hooks to Firestore
- Firebase authentication helper functions
- Tailwind responsive tweaks
- Debugging sync issues
- Mobile-specific CSS fixes

### OpenCode Workflow (save time on boilerplate)

1. **Take an existing prompt from this guide** (see "OpenCode prompt" sections in timeline)
2. **Paste into OpenCode (Hy3 or DeepSeek Flash)**
3. **Copy the generated code**
4. **Integrate into your project**
5. **Test and commit**

**Example:**
```
Prompt: "I have React state for notes. Show me a custom hook useNotes() 
that fetches from Firestore, decrypts client-side, and handles loading/error."

OpenCode output: ~50 lines of solid, usable code

You: Paste into src/hooks/useNotes.ts, test it works, commit
```

---

## PART 5: TESTING CHECKLIST (BEFORE SHIPPING)

### Functional

- [ ] Login works (create account, email verified)
- [ ] Can create a note (appears in list immediately)
- [ ] Can edit a note (changes save to Firestore within 2s)
- [ ] Can delete a note (with confirmation dialog)
- [ ] Can search notes (real-time, by title or content)
- [ ] Can toggle dark mode (persists across sessions)
- [ ] Can logout (clears session, redirects to login)

### Multi-device Sync

- [ ] Create note on phone A
- [ ] Open app on phone B
- [ ] Note appears on phone B within 2 seconds
- [ ] Edit note on phone A
- [ ] Change appears on phone B within 2 seconds
- [ ] Edit same note on both phones simultaneously (last-write-wins, no crash)

### Security

- [ ] Encrypted content is unreadable in Firestore console
- [ ] User A cannot read User B's notes
- [ ] Password reset email works
- [ ] Logout truly logs out (can't access /notes without re-login)

### Mobile

- [ ] App installs on Android phone
- [ ] Notch/safe areas respected (no overlap)
- [ ] Editor toolbar is usable on 375px width screen
- [ ] Keyboard doesn't cover content input
- [ ] Buttons are 48px+ height (easily tappable)
- [ ] No horizontal scrolling
- [ ] Dark mode works on phone

### Edge Cases

- [ ] App works offline (notes load from cache, sync queued)
- [ ] Reconnect internet (queued notes sync automatically)
- [ ] Create note, close app immediately (note synced when reopened)
- [ ] Clear browser cache (can still login with password, notes re-fetch)
- [ ] Very long note (1000+ lines) opens without lag
- [ ] Search 100+ notes (fast, < 200ms)

---

## PART 6: WHAT TO DO AFTER SHIPPING (v1.1, v2.0 ideas)

Once friends use it for 2 weeks, ask them:
- "What's missing that would make this better?"
- "Where did you get confused?"
- "What's slow or clunky?"

Common requests to plan for v1.1:
- Export notes to Markdown
- Import notes from Google Keep / Obsidian
- Pinned notes (pin to top)
- Collections/folders (organize better)
- Rich text formatting (colors, highlighting, etc.)

Plan for v2.0 (once you have 50+ users):
- Canvas view (like you designed, now with actual purpose)
- Sharing (read-only links, collaborate)
- Plugins system (custom templates, shortcuts)
- AI features (summarize, categorize) — now with real backend

---

## FINAL COMMIT STRUCTURE

```
Week 1-2:  backend: firebase + encryption foundation
Week 3-4:  ui: 5 functional screens, no design yet
Week 5-7:  ui: redesign notes list with v0
           ui: redesign editor with v0
           ui: dark mode + mobile responsive
Week 8-9:  security: firestore rules, encryption test, session handling
Week 10-11: mobile: safe areas, status bar
            mobile: keyboard handling in editor
            mobile: bug fixes from real device testing
Week 12:   ux: final polish from feedback
           release: v1.0 shipped to closed beta
```

**Total commits:** ~15 focused, reviewable commits. Clean history for you to reference later.

---

## CHECKLIST TO START RIGHT NOW

- [ ] Clone your GitHub repo to a new branch: `git checkout -b mvp-scope`
- [ ] Install Firebase: `npm install firebase`
- [ ] Create Firebase project (free tier)
- [ ] Install TweetNaCl: `npm install tweetnacl tweetnacl-util`
- [ ] Delete AppHeader, AppBottomNav, unused components
- [ ] Initialize shadcn/ui: `npx shadcn@latest init`
- [ ] Create `src/firebase/config.ts` (start with placeholder)
- [ ] Create 5 empty page components (stub with "Coming soon")
- [ ] Set up React Router for 5 routes
- [ ] First commit: `git commit -m "mvp: initial scope setup"`

**You're ready. Start week 1 now.**

---

## Quick Reference — All Free Tools

| Tool | Purpose | Cost | URL |
|---|---|---|---|
| Firebase | Backend, Firestore DB, Auth | Free tier (excellent) | firebase.google.com |
| TweetNaCl.js | End-to-end encryption | Free, open-source | tweetnacl.js.org |
| shadcn/ui | React components | Free, open-source | shadcn.com |
| Tailwind CSS | Styling | Free, open-source | tailwindcss.com |
| v0.app | UI code generation | Free tier (200 credits/mo) | v0.app |
| OpenCode free models | Code help | Free (rate-limited) | opencode (your setup) |
| React Router | Routing | Free, open-source | reactrouter.com |
| Capacitor | Mobile wrapper | Free, open-source | capacitorjs.com |
| Google Play Console | App distribution | Free (one-time $25 dev account) | play.google.com |

**Grand total cost:** $25 (Google Play dev account) + free tier usage. **Not $0, but close enough for a friend project.**

---

**You've got this. Ship in 12 weeks.**
