# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Codebase Overview
- **Project**: `bAssistant` — a zero-backend, 100% client-side React SPA on Vite, deployed to Cloudflare Pages. It equips visiting LLMs/WebMCP agents with in-browser tools for canvas diagramming, private document retrieval (LiteParse + BM25 in IndexedDB), and research lookups.
- **Stack**: React 18 + TypeScript + Tailwind (dark mode via `class` strategy). No backend, no app server, no vector DB. The only non-browser code is the thin `functions/` Cloudflare Pages Functions that proxy `/api` search (dev equivalents live in `vite.config.ts`).
- `.agents/`, `agent/`, `devpost/`, and `skills-lock.json` are Devpost hackathon-course artifacts, not application code. All app code lives in `src/`; the docs7 site lives in `docs/`.

## Development Commands
- `npm.cmd run dev`: Launch local Vite dev server (`http://localhost:5173`).
- `npm.cmd test`: Run the full Vitest suite once (`"test": "vitest run"` — no watch mode, no extra flags needed).
- `npm.cmd test -- src/tests/bm25.test.ts`: Run a single test file. Add `-t "name"` to filter by test name.
- `npm.cmd run build`: Type-check (`tsc`) and build the production bundle into `dist/`. This is the only lint/type gate — no ESLint is configured.
- `npx docs7 dev docs`: Preview the `docs7` documentation site at http://localhost:3333. Validate diagrams with the `docs7-playbook` skill scripts: `validate-mermaid.mjs` (strict-mode Mermaid parse) and, against the running server, `check-pages.mjs` (every nav page serves 200, no orphaned `.mdx`) and `render-check.mjs` (real browser render + legibility scale).
- `npx wrangler pages dev dist`: Run the real `/api` Cloudflare Pages Functions locally (the Vite dev server uses a proxy + middleware instead; plain `npm run dev` does not execute Functions).
- Always use `npm.cmd` on Windows rather than `npm` to avoid PowerShell execution policy blocks.

## Key Technical Standards & Invariants

### Layout
- Strict 20/80 horizontal split: left 20% sidebar (Branding with dynamic theme-aware logo, FileUpload, ReferenceUrls manager, Session Highlights, session strip); right 80% workspace split **60% CanvasArea** (HTML5 Canvas2D scene graph) over **40% ChatArea** (humanized message stream). See `src/App.tsx`.
- Enboldened section headers: `REFERENCE URLS` (up to 10 cached URLs verified via client-side probes) and `Session Highlights` (with instant click-to-turn revisit scroll).

### Long-Dwell UI Layer
- Theming is a **semantic CSS token system** in `src/index.css` (`--paper/--panel/--card/--ink/--line` + `--accent` coral / `--you` mint / `--note` violet). Light = warm paper & navy ink; dark = warm ink surfaces (never cold `slate-950`). Style surfaces with `var(--token)` values, not raw slate Tailwind classes.
- Dynamic branding logo in top-left sidebar: `bassistant_light.jpg` in dark mode, `bassistant_dark.jpg` in light mode (transparent, borderless). Also sets the tab favicon.
- `ChatArea` includes dwell features: full-screen reader popup (⤢, Escape closes), A-/A+ font steps persisted in `localStorage['b_font_size']`, 2px reading-progress bar, star highlights (`ChatMessage.highlighted`), copy button, "agent is thinking" pulse.
- `WelcomeModal` shows how-to-use onboarding on first load (`localStorage['b_onboarded']`); the sidebar "tips" link re-opens it.
- All animation lives in `index.css` keyframes and must respect the `prefers-reduced-motion` kill-switch.

### State Architecture (critical for any tool/UI change)
- `App.tsx` owns all React state. WebMCP tools never touch React state directly — they receive a `ToolContext` of closures (`src/webmcp/tools.ts`), and `updateWebMCPContext()` re-binds fresh closures to the provider whenever messages or reference URLs change (`src/App.tsx`). Any new tool capability must flow through `ToolContext`.
- Module-level singletons bridge the React UI and the WebMCP tool layer: `globalCanvasEngine` (`src/lib/canvasEngine.ts`), `globalIDBStorage` (`src/lib/idbStorage.ts`), `globalLiteParseService` (`src/lib/liteparseService.ts`).
- **Session vault**: `App.tsx` records every deliberation turn to IndexedDB via `globalIDBStorage.saveSessionTurn()` (stores `session_turns` + `session_meta` in `bAssistantDB` version 2) and restores the active session (messages + latest canvas `canvasShapes`) on mount. `HistoryModal.tsx`, opened from the sidebar `sessions` button, lists sessions via `getAllSessionsSummary()` with Restore / PDF / Delete actions handled in `App.tsx`.

### WebMCP Bridge
- `src/webmcp/provider.ts` exposes **17 tools** on every discovery surface simultaneously: `document.modelContext`, `navigator.modelContext` + `navigator.modelContextTesting`, `window.webmcp` / `window.modelContext`, hidden DOM `<form toolname=...>` elements, `window.addEventListener('message')` (JSON-RPC 2.0), and `webmcp:ready` / `modelcontext:ready` custom events.
- Lifecycle: native `registerTool` returns a promise that rejects on teardown, so `register()` captures and `.catch()`es it and `unregister()` calls `controller.abort('unregister')` — no unhandled `AbortError`. `App.tsx` constructs the provider **once** and proxies handlers through a ref (`updateWebMCPContext()` swaps closures in place), so message/URL changes never re-register or mid-session abort the tool set.
- Tool registry (definitions + dispatch in `src/webmcp/tools.ts`): `get_tool_usage_prompt` (read-only, zero-arg; returns the agent operating guide from `src/webmcp/agentGuide.ts` — visiting agents should call it first), `get_reference_url` (read-only, zero-arg; returns comma-separated stored reference URLs), `chat_post`, `canvas2d_draw_shapes`, `canvas2d_inspect_shapes`, `canvas2d_modify_shape`, `canvas2d_clear`, `export_pdf`, `canvas_draw`, `draw_diagram`, `canvas_clear`, `get_chat_history`, `search_document`, `clean_document`, `search_web`, `search_research`, `calculate`.

### Canvas2D Scene Graph
- Shapes are typed in `src/types/canvas2d.ts`: `rectangle`, `ellipse`, `diamond`, `text`, `arrow`, `line`, `freedraw`, `sticker`. State persists as `Canvas2dShape[]` in the engine, not as pixels.
- Arrows/lines bind to nodes via `startId`/`endId` and stay attached when shapes move. Redraw is two-pass: nodes/containers first, then connectors with edge-to-edge perimeter docking and pill labels (`canvasEngine.redraw()`).
- Live DOM theme synchronization: `CanvasEngine` constructor mounts a `MutationObserver` on `document.documentElement` (`class` attribute) and exposes `getTheme(): 'dark' | 'light'`, instantly re-rendering canvas scenes upon theme toggles.
- Artistic rendering (Rough.js ^4.6.6): nodes render via `rough.canvas()` with hachure fills by default (`fillStyle: 'hachure'`, `hachureGap: 6`, `fillWeight = max(strokeWidth, 1)`); `roughness: 0` falls back to the plain path. Connectors are orientation-aware cubic Bézier splines with tangent arrowheads (`curved: false` for a straight edge). `resolveHarmonizedFill` maps archetype tokens (`client`/`gateway`/`db`/`queue`/`logic`) and Risograph palette tokens to translucent tones.
- Geometry normalization (critical): `sanitizeCanvas2dShapes` coerces every numeric field (`width`/`height`/`strokeWidth`/`fontSize`/`roughness`/`bowing`/`hachureAngle`/`hachureGap` + connector coords) via `toFiniteNumber`; `renderShape`/`renderConnector` re-guard with `finiteOr`. **Why:** Rough.js computes rectangle corners as `x + width`, so a string dimension (`"160"`) string-concatenates to `"100160"` and the rectangle flies off-canvas. Type aliases are normalized (`rect`/`box`/`card`/`node`/`container`/`square` → `rectangle`, `circle`/`oval`/`db` → `ellipse`, `note`/`sticky` → `sticker`, …) and the `renderShape` switch ends in a `default` that renders unknown types as a rectangle with a warning — never silently dropped.
- Fill transparency (uniform): `renderShape` rewrites every fill to `rgba(r, g, b, 0.2)` (`DARK_FILL_ALPHA = 0.2` → 80% transparent) via `normalizeRgba` (parses hex/`rgb()`/`rgba()`/named) — applied in **both** themes so the hachure strips are always see-through. `renderShape`/`drawLabel` trust the passed `theme` argument; only `CanvasEngine.syncThemeFromDom()` reads the `<html class="dark">` DOM state.
- Fill-aware contrast: `resolveThemeTextColor(color, theme, isConnectorPill, fillColor)` evaluates luminance/opacity (`parseColorLuminance`, `isLightColor`, `isDarkColor`); white/off-white/black/washed-out colors resolve to the universal amber `#d97706` (`MEDIUM_DARK_YELLOW`), custom accents pass through. Stroke colors adapt via `resolveThemeStrokeColor` (default `#94a3b8` dark / `#334155` light).
- Stateless canvas logic (geometry, color/theme contrast, and the ctx-based render pipeline — `getRoughCanvas`, `resolveHarmonizedFill`, `normalizeRgba`, `toFiniteNumber`, `getShapeBounds`, `perimeterEdgeToEdge`, `sanitizeCanvas2dShapes`, `computeContentBounds`, `renderScene`, `renderShape`, `renderConnector`, `drawLabel`, `renderLegacyCommand`, `resolveThemeTextColor`, etc.) lives in `src/lib/canvasHelper.ts`. `CanvasEngine` (`src/lib/canvasEngine.ts`) keeps only state, viewport math, shape CRUD, and orchestration, delegating all drawing and geometry to the helper. Tests import the pure helpers directly from `canvasHelper`.
- `canvas2d_draw_shapes` descriptions embed the approved translucent color palette (client/gateway/db/queue/decision rgba values) — keep tool descriptions in sync with renderer capabilities.
- Interactive viewport controls live in `src/components/CanvasArea.tsx`: drag-to-pan, cursor-anchored wheel-zoom (`zoomAtPoint`, scale clamp `[0.2, 4]`), `Fit View` (`fitToContent`, clamp `[0.2, 1.5]`), `Reset` (`resetView`), plus `New Session` / `Export PDF` / `Clear`. `canvasEngine.getSnapshotDataUrl()` returns a tight-cropped PNG (40px padding) used for PDF and session snapshots.

### Document Ingestion & Retrieval
- Files must be strictly `< 2MB` and `.pdf`, `.doc`, or `.docx`; violations trigger the `NotificationModal` popup (`src/App.tsx`).
- Pipeline: FileUpload → LiteParse WASM (`@llamaindex/liteparse-wasm`, with browser stream-parser fallback, hex token decoding `<...> Tj` / `[...] TJ`, and in-browser DOCX PKZip `word/document.xml` decompression) → natural page chunks → `BM25Index` → IndexedDB. On mount, the app restores doc/chunks/index from IndexedDB; `search_document` lazily rehydrates from IDB when memory is empty.
- BM25 search returns top-3 chunks; if the query has no keyword overlap it falls back to returning the first 3 chunks as a preview.

### Research & Search (Web + ArXiv)
- Third-party search hosts (`export.arxiv.org`, `api.duckduckgo.com`) send no CORS headers, so `searchService.ts` (`searchWeb`, `searchResearch`) calls **same-origin relative URLs** — `/api/websearch?query=` and `/api/arxiv?search_query=all:...` — never the upstream hosts directly.
- The `/api` layer has two implementations that must stay in sync: the Vite dev proxy (`/api/arxiv` → `export.arxiv.org`) plus a `dev-search-endpoints` middleware for `/api/websearch` in `vite.config.ts`; and Cloudflare Pages Functions `functions/api/arxiv.ts` + `functions/api/websearch.ts` in production, scoped by `public/_routes.json` (`include: ["/api/*"]`). The DuckDuckGo HTML→JSON parser is shared at `src/lib/ddgSearch.ts`.
- Both functions return a `SearchOutcome<T>` (`{ results, fetchedAt, source, unavailable?, error? }`), never a bare array and never fabricated fallback data; results carry `fetchedAt`/`source`. `tools.ts` returns the outcome directly and `agentGuide.ts` tells agents to report `unavailable` instead of inventing answers. Requests use a 20s `AbortController` timeout.

### PDF Export Engine
- `src/lib/pdfExportService.ts` exports sequential executive deliberation PDFs:
  - Header stamps the top-left branding logo (`bassistant_light.jpg`) alongside title `"bAssistant Deliberation Session"`, session ID, and timestamp metadata.
  - Sequential turn-by-turn deliberation reporting (`TURN X [HH:MM]`): renders user prompt (when present), per-turn canvas diagram snapshot (when present, fitted without distortion), and AI response with structured Markdown blocks.
  - Backward-compatible single snapshot + dialogue transcript fallback.
  - Chat dialogue rendered with shared `PdfCursor` across blocks, reserving a 10mm bottom buffer for automatic multipage pagination.
  - Full H1–H6 heading parsing hierarchy (`#` to `######`) rendered with scaled bold typography.
  - Every page stamps the exact centered disclaimer: `AI generated analysis, verify before applying.` with right-aligned page counter (`Page X of Y`).
  - Rasterizes complex scripts (Bengali বাংলা, Hindi हिन्दी) via 3x HiDPI Canvas2D text strips because jsPDF can't shape Indic scripts natively.
  - Enforces blank-session protection (no canvas content AND no messages → modal error).

### Chat Rules & Humanization
- `src/lib/symbolHumanizer.ts` humanizes LaTeX math arrows (`$\rightarrow$`, `\rightarrow`) and ASCII flow arrows (`-->`, `==>`) into clean Unicode characters (`→`), preserving line breaks.
- `src/components/HumanizedMessage.tsx` cleans raw markdown noise and formats H1–H6 headings (`#` to `######`) into clean semantic typography (`h1`–`h4` / `<h6>`) without raw hash tokens.
- All user messages rendered in chat history must be prefixed with `user:` (agents get `agent:`) — see `src/components/ChatArea.tsx`.

### Storage
- Pure IndexedDB database `bAssistantDB` (version 2) with stores:
  - `documents`: uploaded document metadata (< 2MB)
  - `chunks`: natural per-page text chunks
  - `bm25_index`: serialized BM25 inverted index
  - `session_turns`: sequential turn-by-turn records (`id`, `sessionId`, `turnNumber`, `userPrompt?`, `agentMessage?`, `canvasSnapshot?`, `timestamp`)
  - `session_meta`: key-value metadata store (`active_session_id`)
- Reference URLs cached in `localStorage['b_reference_urls']`. No external servers, no vector databases.

### Testing
- All unit tests live in `src/tests/` (28 Vitest suites, 184 tests) and must remain strictly hermetic and isolated — no network, no real IndexedDB dependencies leaking between tests.
- Vitest is configured inside `vite.config.ts` (`environment: 'jsdom'`, `globals: true`); there is no separate vitest config file.
- Canvas tests must exercise the real Rough.js path: mock `getContext()` with an object whose `canvas.getContext()` returns itself, or `getRoughCanvas()` returns `null` and Rough never runs (this blind spot previously hid a rectangle regression).
- If React component tests fail with `act(...) is not supported in production builds of React`, the shell has `NODE_ENV=production`; run `NODE_ENV=test npm test` (`set NODE_ENV=test&& npx vitest run` on Windows cmd) instead.

## Documentation Reference
- [README.md](file:///C:/codebase/b_aassistant/README.md) — human-facing quickstart.
- [docs/docs.json](file:///C:/codebase/b_aassistant/docs/docs.json) — full docs7 component and architecture documentation (`index.mdx`, `indroduction.mdx`, `architecture.mdx`, `cockpit-ui.mdx`, `webmcp.mdx`, `canvas-and-pdf.mdx`, `document-processing.mdx`, `research-tools.mdx`, `tavily-search.mdx`, `sessions-vault.mdx`, `voice-agent.mdx`, `background-tasks.mdx`, `dwell-time-research.mdx`, `liteparse-research.mdx`, `learnings.mdx`, `deployment.mdx`). `docs/custom.css` widens Mermaid frames; every page must be listed in `docs.json` navigation or it renders nowhere.
