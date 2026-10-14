# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Codebase Overview
- **Project**: `bAssistant` — a zero-backend, 100% client-side React SPA on Vite, deployed to Cloudflare Pages. It equips visiting LLMs/WebMCP agents with in-browser tools for canvas diagramming, private document retrieval (LiteParse + BM25 in IndexedDB), and research lookups.
- **Stack**: React 18 + TypeScript + Tailwind (dark mode via `class` strategy). No backend, no server, no vector DB.
- `.agents/`, `agent/`, `devpost/`, and `skills-lock.json` are Devpost hackathon-course artifacts, not application code. All app code lives in `src/`.

## Development Commands
- `npm.cmd run dev`: Launch local Vite dev server (`http://localhost:5173`).
- `npm.cmd test`: Run the full Vitest suite once (`"test": "vitest run"` — no watch mode, no extra flags needed).
- `npm.cmd test -- src/tests/bm25.test.ts`: Run a single test file. Add `-t "name"` to filter by test name.
- `npm.cmd run build`: Type-check (`tsc`) and build the production bundle into `dist/`. This is the only lint/type gate — no ESLint is configured.
- `node C:\Users\amrit\.gemini\config\skills\docs7\scripts\validate_docs7.mjs docs`: Validate docs7 strict syntax.
- `npx docs7 dev docs`: Preview the `docs7` documentation site.
- Always use `npm.cmd` on Windows rather than `npm` to avoid PowerShell execution policy blocks.

## Key Technical Standards & Invariants

### Layout
- Strict 20/80 horizontal split: left 20% sidebar (Branding, FileUpload, Session Highlights, session strip); right 80% workspace split **60% CanvasArea** (HTML5 Canvas2D scene graph) over **40% ChatArea** (humanized message stream). See `src/App.tsx`.

### Long-Dwell UI Layer
- Theming is a **semantic CSS token system** in `src/index.css` (`--paper/--panel/--card/--ink/--line` + `--accent` coral / `--you` mint / `--note` violet). Light = warm paper & navy ink; dark = warm ink surfaces (never cold `slate-950`). Style surfaces with `var(--token)` values, not raw slate Tailwind classes.
- `ChatArea` includes dwell features: full-screen reader popup (⤢, Escape closes), A-/A+ font steps persisted in `localStorage['b_font_size']`, 2px reading-progress bar, star highlights (`ChatMessage.highlighted`), copy button, "agent is thinking" pulse.
- `WelcomeModal` shows how-to-use onboarding on first load (`localStorage['b_onboarded']`); the sidebar "tips" link re-opens it.
- All animation lives in `index.css` keyframes and must respect the `prefers-reduced-motion` kill-switch.

### State Architecture (critical for any tool/UI change)
- `App.tsx` owns all React state. WebMCP tools never touch React state directly — they receive a `ToolContext` of closures (`src/webmcp/tools.ts`), and `updateWebMCPContext()` re-binds fresh closures to the provider whenever messages change (`src/App.tsx`). Any new tool capability must flow through `ToolContext`.
- Module-level singletons bridge the React UI and the WebMCP tool layer: `globalCanvasEngine` (`src/lib/canvasEngine.ts`), `globalIDBStorage` (`src/lib/idbStorage.ts`), `globalLiteParseService` (`src/lib/liteparseService.ts`).

### WebMCP Bridge
- `src/webmcp/provider.ts` exposes **16 tools** on every discovery surface simultaneously: `document.modelContext`, `navigator.modelContext` + `navigator.modelContextTesting`, `window.webmcp` / `window.modelContext`, hidden DOM `<form toolname=...>` elements, `window.addEventListener('message')` (JSON-RPC 2.0), and `webmcp:ready` / `modelcontext:ready` custom events.
- Tool registry (definitions + dispatch in `src/webmcp/tools.ts`): `get_tool_usage_prompt` (read-only, zero-arg; returns the agent operating guide from `src/webmcp/agentGuide.ts` — visiting agents should call it first), `chat_post`, `canvas2d_draw_shapes`, `canvas2d_inspect_shapes`, `canvas2d_modify_shape`, `canvas2d_clear`, `export_pdf`, `canvas_draw`, `draw_diagram`, `canvas_clear`, `get_chat_history`, `search_document`, `clean_document`, `search_web`, `search_research`, `calculate`.

### Canvas2D Scene Graph
- Shapes are typed in `src/types/canvas2d.ts`: `rectangle`, `ellipse`, `diamond`, `text`, `arrow`, `line`, `freedraw`, `sticker`. State persists as `Canvas2dShape[]` in the engine, not as pixels.
- Arrows/lines bind to nodes via `startId`/`endId` and stay attached when shapes move. Redraw is two-pass: nodes/containers first, then connectors with edge-to-edge perimeter docking and pill labels (`canvasEngine.redraw()`).
- `canvas2d_draw_shapes` descriptions embed the approved translucent color palette (client/gateway/db/queue/decision rgba values) — keep tool descriptions in sync with renderer capabilities.

### Document Ingestion & Retrieval
- Files must be strictly `< 1MB` and `.pdf`, `.doc`, or `.docx`; violations trigger the `NotificationModal` popup (`src/App.tsx`).
- Pipeline: FileUpload → LiteParse WASM (`@llamaindex/liteparse-wasm`, with browser stream-parser fallback) → page chunks → `BM25Index` → IndexedDB. On mount, the app restores doc/chunks/index from IndexedDB; `search_document` lazily rehydrates from IDB when memory is empty.
- BM25 search returns top-3 chunks; if the query has no keyword overlap it falls back to returning the first 3 chunks as a preview.

### PDF Export Engine
- `src/lib/pdfExportService.ts` exports dual-section executive PDFs (canvas snapshot on top, chat transcript beneath). Enforces blank-session protection (no canvas content AND no messages → modal error), cleans LLM markdown noise, and rasterizes complex scripts (Bengali বাংলা, Hindi हिन्दी) via 3x HiDPI Canvas2D text strips because jsPDF can't shape Indic scripts natively.

### Chat Rules
- `src/components/HumanizedMessage.tsx` cleans raw markdown asterisk syntax (`**bold**` → clean bold, `*item` → clean bullet) for executive readability.
- All user messages rendered in chat history must be prefixed with `user:` (agents get `agent:`) — see `src/components/ChatArea.tsx`.

### Storage
- Pure IndexedDB database `bAssistantDB` with stores `documents`, `chunks`, `bm25_index`. No external servers, no vector databases.

### Testing
- All unit tests live in `src/tests/` (10 Vitest suites) and must remain strictly hermetic and isolated — no network, no real IndexedDB dependencies leaking between tests.
- Vitest is configured inside `vite.config.ts` (`environment: 'jsdom'`, `globals: true`); there is no separate vitest config file.

## Documentation Reference
- [README.md](file:///C:/codebase/b_aassistant/README.md) — human-facing quickstart.
- [docs/docs.json](file:///C:/codebase/b_aassistant/docs/docs.json) — full docs7 component and architecture documentation (`architecture.mdx`, `webmcp.mdx`, `canvas-and-pdf.mdx`, `document-processing.mdx`, `deployment.mdx`).
