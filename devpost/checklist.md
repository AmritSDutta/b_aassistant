---
doc: checklist
status: approved
---

# Build Checklist

Build mode: fast

## Slices

- [x] **1. Project scaffold, 20/80 cockpit layout, and Canvas drawing engine**
  Becomes usable: A running React application on Vite with the 20/80 responsive layout, Light/Dark theme toggle, and a working HTML5 Canvas engine with Clear button.
  Why now: Bootstraps the project and delivers the visual kernel early so subsequent tools have real UI destinations.
  PRD ref: `prd.md > Screens and Layout`, `prd.md > Features and Behavior > 3. Live HTML Canvas Rendering`
  Spec ref: `spec.md > Stack`, `spec.md > Components > 1. App`, `spec.md > Components > 3. CanvasArea`
  Build: Initialize Vite React TypeScript project, configure Tailwind CSS with dark mode, implement `CanvasArea` and `canvasEngine.ts` with shape/line primitives and Clear button.
  Verify (mechanical): Run Vitest tests verifying canvas engine command dispatching and compile check (`npm run build`).
  Learner check: Open http://localhost:5173, toggle Light/Dark theme, see 20/80 split with canvas ready.
  Commit: `Scaffold React cockpit layout and canvas engine`

- [x] **2. WebMCP Multi-Standard Provider Layer & Chat interaction**
  Becomes usable: Chat interface in bottom 60% with user text input (`user:` prefixing) and full WebMCP provider registering `navigator.modelContext`, `window.webmcp`, and `postMessage` JSON-RPC 2.0.
  Why now: Connects the communication bridge so external agents/inspectors can discover tools, read chat history, post text, and draw live on the canvas.
  PRD ref: `prd.md > Features and Behavior > 2. Chat Conversation & History`, `prd.md > Features and Behavior > 4. WebMCP Tool Suite`
  Spec ref: `spec.md > Components > 4. ChatArea`, `spec.md > Components > 6. WebMCPProvider`
  Build: Implement `webmcp/types.ts`, `webmcp/tools.ts`, `webmcp/provider.ts`, and `ChatArea.tsx`. Expose `get_chat_history`, `chat_post`, `canvas_draw`, `canvas_clear`.
  Verify (mechanical): Hermetic unit test dispatching WebMCP tools via `window.webmcp` and `postMessage`, asserting state changes.
  Learner check: Type a message into chat (see `user:` prefix), trigger WebMCP tool in browser console and observe canvas/chat updates.
  Commit: `Implement unified WebMCP provider and chat area`

- [x] **3. In-Browser Document Processing (LiteParse WASM + IndexedDB + BM25)**
  Becomes usable: Uploading Doc/PDF < 1MB parses pages client-side via LiteParse WASM, builds a client-side BM25 index in IndexedDB, and exposes `search_document` and `clean_document` WebMCP tools. Invalid files show rejection popup.
  Why now: Fulfills the core document capability, keeping all user data strictly local and queryable.
  PRD ref: `prd.md > Features and Behavior > 1. Document Upload & In-Browser Indexing`
  Spec ref: `spec.md > Components > 2. Sidebar`, `spec.md > Components > 5. NotificationModal`, `spec.md > Data Model > 1. IndexedDB`
  Build: Implement `liteparseService.ts`, `idbStorage.ts`, `bm25.ts`, `FileUpload.tsx`, and `NotificationModal.tsx`. Connect `search_document` and `clean_document` to WebMCP provider.
  Verify (mechanical): Hermetic unit tests for BM25 indexing, BM25 query scoring, size rejection validation, and IndexedDB reset.
  Learner check: Upload a sample document under 1MB, verify page count and "Indexed" badge, test error popup with an oversized file.
  Commit: `Add LiteParse WASM parsing, IndexedDB BM25 store, and document WebMCP tools`

- [x] **4. Free-tier External Research Tools (`search_web`, `search_research`, `calculate`)**
  Becomes usable: Visiting agents can call `search_web` (DuckDuckGo CORS query), `search_research` (ArXiv public query), and `calculate` (decimal arithmetic) via WebMCP.
  Why now: Completes the full suite of free tools promised to the visiting model.
  PRD ref: `prd.md > Features and Behavior > 4. WebMCP Tool Suite`
  Spec ref: `spec.md > External Services and Dependencies`, `spec.md > Components > 6. WebMCPProvider`
  Build: Implement `searchService.ts` and `mathEvaluator.ts`. Register `search_web`, `search_research`, and `calculate` in WebMCP provider.
  Verify (mechanical): Hermetic unit tests for decimal math evaluation and search API query builders.
  Learner check: Call `calculate`, `search_web`, and `search_research` via WebMCP and inspect results.
  Commit: `Add web search, arxiv search, and decimal calculator tools`

- [x] **5. Production build, Cloudflare Pages export, and Documentation Suite**
  Becomes usable: Complete production-ready package with Cloudflare Pages export, full documentation site via `docs7`, `README.md` for humans, `CLAUDE.md` for agents, and `AGENTS.md` reference.
  Why now: Finishes the deliverables, verifying build artifacts and providing full human and agent documentation.
  PRD ref: `prd.md > What We're Building`
  Spec ref: `spec.md > Where It Runs and How Someone Tries It`, `spec.md > File Structure`
  Build: Configure Cloudflare Pages static output, generate docs using `docs7`, write `README.md`, `CLAUDE.md`, and `AGENTS.md`.
  Verify (mechanical): `npm run build` succeeds generating `dist/`, all hermetic tests pass, documentation files exist and conform to rules.
  Learner check: Run `npm run preview` to test production build, review docs site and Markdown docs.
  Commit: `Add documentation suite and Cloudflare Pages build configuration`

## Hands-on Checkpoints

- [x] Early usable behavior explored — Slice 2 (Layout, Canvas engine, Chat, and WebMCP provider active)
- [x] Final kick-the-tires exploration and feedback completed — Slice 5 (Complete app with document parsing, tools, and docs)

## Final Review

- [x] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map

- [x] Learning activity complete — guided route, focused alternative, prior practice connected, or brief recap
- [x] Optional edit and transfer reflection addressed — offered/declined/already covered/not applicable as appropriate
- [x] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence: Slices 1 through 5 fully implemented and verified. 21/21 hermetic unit tests passing. Clean production build to dist/ for Cloudflare Pages.
Route and stops: Scaffolding -> 20/80 UI -> Canvas Engine -> WebMCP Provider -> LiteParse WASM & BM25 in IndexedDB -> Free Research/Math Tools -> docs7 & documentation suite.
Edit outcome: Zero server dependencies, private in-browser document querying, live diagramming, and WebMCP multi-standard interface.
Reflection: Reusable browser-first architecture pattern pairing WebMCP with WebAssembly parsers and client-side IndexedDB indexes.
Activity mode: fast build mode completed

## Revisions

