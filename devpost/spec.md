---
doc: spec
status: approved
---

# bAssistant — Technical Specification

A zero-backend, React-based single-page browser assistant deployed to Cloudflare Pages that exposes browser-native WebMCP tools for live HTML canvas diagramming, in-browser LiteParse + BM25 document querying, decimal math, and public research search.

## How This Works, In Plain Language
`bAssistant` is a client-side application built with React and Vite. When a user opens it:
1. The page renders a 20/80 layout: a left sidebar (branding with dynamic transparent logo, light/dark toggle, file upload, Reference URLs manager for up to 10 verified links, and Session Highlights) and an 80% main area split into a top 60% HTML canvas and a bottom 40% chat interface.
2. If the user uploads a Doc or PDF file (< 1MB), `LiteParse` runs directly inside the browser using WebAssembly (WASM). It extracts text page-by-page, with stream decompressor fallback, hex PDF string token decoding (`<...> Tj` and `[...] TJ`), and in-browser DOCX PKZip `word/document.xml` decompression. A client-side BM25 indexer tokenizes and scores the text, saving the chunks and index into the browser's IndexedDB.
3. The user types messages into the chat box. Each message is tagged with a `user:` prefix and kept in application state.
4. The page initializes a **Unified WebMCP Provider** that registers 17 tools onto six discovery surfaces: `document.modelContext`, `navigator.modelContext`, `window.webmcp`, hidden DOM tool forms, ready custom events, and `window.postMessage` for standard JSON-RPC 2.0 MCP commands.
5. Any visiting LLM, extension, or WebMCP inspector discovers the exposed tools:
   - `get_tool_usage_prompt`: returns the read-only operating guide for using all other tools (call first).
   - `get_reference_url`: returns comma-separated reference URLs stored in browser cache.
   - `search_document`: queries the local BM25 index in IndexedDB.
   - `clean_document`: wipes the IndexedDB chunks and resets the upload box.
   - `get_chat_history`: retrieves conversation logs including `user:` prompts.
   - `canvas2d_draw_shapes` / `canvas2d_inspect_shapes` / `canvas2d_modify_shape` / `canvas2d_clear`: structured scene-graph drawing, inspection, and in-place editing.
   - `export_pdf`: generates the session PDF report (top-left branding logo, canvas snapshot, multipage dialogue, and mandatory AI disclaimer footer).
   - `canvas_draw` / `draw_diagram` / `canvas_clear`: legacy drawing commands onto the HTML canvas.
   - `chat_post`: streams or posts agent explanations into the chat log.
   - `calculate`: runs exact decimal math in the browser.
   - `search_web`: calls DuckDuckGo's browser-accessible search API.
   - `search_research`: calls ArXiv's public query API.
6. The entire application contains zero server code and runs entirely in the browser, compiling to static assets deployed to Cloudflare Pages.

## The Core Journey Through the System
Traces `prd.md > The Core Journey`:
1. **User loads page:** Browser loads static HTML/JS bundle from Cloudflare Pages. React mounts `App`, reads local theme preference (Light/Dark), and initializes the `WebMCPBridge` service. Canvas and Chat initialize blank.
2. **File dropped (< 1MB):** `FileUpload` component validates size (< 1MB) and extension (.pdf, .doc, .docx). If valid, passes bytes to `LiteParseService` (WASM / stream / docx zip), extracts pages, passes text to `BM25Indexer`, and stores records in `DocumentStore` (IndexedDB). UI displays file name, page count, and "Indexed" badge. If invalid, `Modal` popup displays error.
3. **User submits prompt:** `ChatView` appends `{ sender: 'user', text: input }` to state.
4. **Visiting Agent accesses WebMCP:** Agent invokes `get_chat_history` via `window.webmcp.callTool` or `postMessage({ method: 'tools/call' })`.
5. **Agent executes queries & math:** Agent invokes `search_document` (queries IndexedDB BM25), `get_reference_url`, `search_web` (DDGS), `search_research` (ArXiv), or `calculate`.
6. **Agent outputs visually and textually:** Agent calls `chat_post` to append response to `ChatView`, and calls `canvas_draw` to instruct `CanvasEngine` to draw diagram lines, boxes, labels, and graphs.
7. **Reset / Cleanup:** User clicks "Clear Canvas" (calls `canvas_clear`) or triggers `clean_document` to wipe IndexedDB.

## Stack
- **Language & Framework:** TypeScript, React 18/19. Rationale: Standard component model, fast rendering, strict type hints.
- **Build System:** Vite. Rationale: Fast HMR, direct static export to `dist/` compatible with Cloudflare Pages. [Vite Docs](https://vitejs.dev/)
- **Styling:** Tailwind CSS over a semantic CSS token layer (`src/index.css`: `--paper/--panel/--card/--ink/--line` + coral/mint/violet accents). Rationale: utility-first speed with one warm palette that swaps per theme (light = paper & ink, dark = warm ink surfaces). [Tailwind Docs](https://tailwindcss.com/)
- **Artistic Canvas Engine:** `roughjs` (^4.6.6, MIT License). Rationale: Procedural hand-drawn sketching on standard HTML5 canvas contexts (double-stroke borders, organic contours, and textured hachure/cross-hatch fills) at ~11 kB min+gzip with zero external dependencies. [Rough.js Docs](https://roughjs.com/)
- **Document Parser:** `@llamaindex/liteparse-wasm` with browser stream decompressor (`DecompressionStream('deflate-raw')`) and DOCX zip extraction. Rationale: Zero-backend, browser-native WebAssembly PDF and document extraction with spatial page parsing. [LiteParse Docs](https://developers.llamaindex.ai/liteparse/)
- **Client Storage:** Native `IndexedDB` with custom lightweight wrapper. Rationale: Built into all modern browsers, handles structured chunk and BM25 index persistence without backend dependencies. Reference URLs persisted in `localStorage`.
- **Search Engine:** Custom client-side BM25 implementation (`bm25.ts`). Rationale: Pure client-side lexical relevance scoring over document pages without server dependencies.
- **Web Search Client:** Keyless Tavily search (`src/lib/tavilySearch.ts`) via `X-Tavily-Access-Mode: keyless` with DuckDuckGo HTML scraping fallback.
- **Live Voice SDK:** `@google/genai` (^2.30.0). Rationale: Direct browser WebSocket support for bidirectional duplex audio (`ai.live.connect`) and subagent structured generation (`ai.models.generateContent`).
- **Cryptographic Storage:** Web Cryptography API (`window.crypto.subtle`). Rationale: Native browser-grade AES-GCM-256 encryption with non-extractable keys in IndexedDB (`SecureVault`) preventing script exfiltration.
- **Testing:** Vitest + React Testing Library. Rationale: Fast, strictly hermetic testing execution without external network calls.
- **Hosting:** Cloudflare Pages. Rationale: Instant static distribution with zero operational server overhead.

## Where It Runs and How Someone Tries It
- **Runtime:** Browser-only static web application. No Node/Python backend required at runtime.
- **Local Dev Start:** `npm run dev` (opens `http://localhost:5173`).
- **Production Build:** `npm run build` (outputs to `dist/`).
- **Deploy Target:** Cloudflare Pages (Direct deploy of `dist/` folder via Cloudflare Pages dashboard or Wrangler).
- **Hermetic Test Run:** `npm run test` (executes isolated Vitest test suite).

## Look and Feel
Carried forward from `prd.md > Look and Feel` and `scope.md > Inspiration & Identity`:
- **Theme:** Dual-theme system (Light mode with warm paper/navy ink; Dark mode with rich warm dark ink aesthetic). Dynamic transparent logo and favicon.
- **Typography:** Sans-serif for navigation and controls; clean monospace font for code blocks, chat metadata, and WebMCP logs.
- **Layout:** Strict 20% left sidebar / 80% main workspace layout.
- **Visual Dividers:** Subtle border dividers (`border-slate-700` in dark, `border-slate-200` in light).
- **Initial State:** Canvas and chat areas render completely clean and blank on initial load.

## Components

### 1. `App`
Implements `prd.md > Screens and Layout`.
Root composition container orchestrating the 20/80 layout, theme state (Light/Dark), and lifecycle initialization of the `WebMCPBridge`. Delegates domain state and operations to three custom modular controller hooks (`src/hooks/`):
- **`useSessionController`**: Manages active session ID, sequential turn records, chat messages, star highlights, session elapsed time, history modal state, and publication-ready PDF exports.
- **`useDocumentController`**: Manages file validation (< 2MB, PDF/Word), in-browser LiteParse extraction, BM25 indexing, lazy chunk rehydration, and lexical search.
- **`useVoiceOrchestrator`**: Coordinates full-duplex Gemini Live voice interactions, subagent background diagram dispatch via `VoiceBridge`, hardware preflight checks, and encrypted settings.

### 2. `Sidebar`
Implements `prd.md > Screens and Layout > Left Sidebar (20% width)`.
Hosts:
- `Branding`: App title "bAssistant", transparent theme-aware logo (`bassistant_light.jpg` in dark mode, `bassistant_dark.jpg` in light mode), and theme toggle switch.
- `FileUpload`: Dropzone and file picker for Doc/PDF files < 2MB. Displays parsing status, page count, and "Indexed" badge. Triggers `NotificationModal` on rejection. Highlights (border + tint) while a file drags over.
- `ReferenceUrls`: Enboldened `REFERENCE URLS` manager caching up to 10 probe-verified links.
- `BlankSlot` → **Session Highlights**: Enboldened `Session Highlights` section collecting starred (☆/★) messages with sender badges and snippets; clicking an entry scrolls the dialogue to that message.
- Session strip (bottom of sidebar): gentle mono counter `messages · highlights · minutes` plus a "tips" link that re-opens the `WelcomeModal`.

### 3. `CanvasArea`
Implements `prd.md > Features and Behavior > 3. Live HTML Canvas Rendering & Scene Graph`.
Top 60% pane of the main workspace. Renders the HTML5 `<canvas>` element and toolbar:
- Toolbar with "New Session", "Fit View", "Reset View", "Export PDF", and "Clear Canvas" buttons.
- `CanvasEngine`: Manages reactive scene graph (`Canvas2dShape[]`), auto-centering viewport matrix (`fitToContent`), interactive drag-to-pan, cursor-pinned wheel zoom (`zoomAtPoint`), perimeter-docked connectors with pill badges, 2.5D drop shadows, live DOM theme synchronization (`getTheme` + `MutationObserver` on `<html>` for instant theme repaint), universal **medium dark yellow** (`#d97706` / Amber 600) **bold labels** anchored at the **top of elements** (`topCenter` with top padding) and on connector pills to guarantee sharp, readable contrast across both light mode and dark mode, adaptive theme strokes (`resolveThemeStrokeColor`), light-mode alpha scaling, HiDPI scaling, and snapshot capture.
- **Artistic Illustration Upgrades:**
  - **Procedural Sketching:** Integrates `roughjs` for organic, hand-drawn node boundaries, double strokes, and textured fills (`hachure`, `zigzag`, `cross-hatch`).
  - **Fluid Generative Connectors:** Replaces rigid straight lines with smooth cubic Bézier splines (`ctx.bezierCurveTo`) whose control points curve gracefully based on relative orientation, terminating in tangent-aligned arrowheads with rounded line caps.
  - **Tactile Paper Backdrops:** Composites a subtle warm parchment and paper grain texture in the viewport and offscreen snapshot captures.
  - **Editorial Color Harmonies:** Built-in Risograph palettes (terracotta, sage mint, warm cobalt, sunflower gold) that soften harsh saturated primaries into print-grade tones.
  - **Organic Depth & Glassmorphism:** 2-stop linear gradient lighting, soft-focus ambient shadows, and simulated paper fold contours on stickers.

### 4. `ChatArea`
Implements `prd.md > Features and Behavior > 2. Chat Conversation & History` and `> 6. Long-Dwell Reading Comfort`.
Bottom 40% pane of the main workspace, plus a full-screen reader popup:
- Message feed displaying dialogue history in **Lora** serif typography (user-adjustable 15/17/19px via A-/A+, persisted; line-height 1.75, max-width ~72ch measure). User messages rendered with uppercase `user:` badge and agent messages with `agent:` badge.
- **Humanized Markdown Rendering:** Parses incoming messages to render structured React elements (headings H1–H6 without raw hash symbols, styled bullet and numbered lists, monospace code blocks with background tint, blockquotes, and inline bold/italic/code/links) without exposing raw markdown syntax.
- **Symbol Humanization & Sequence Formatting (`symbolHumanizer.ts`):** Transforms LaTeX math notations, arrows (`$\rightarrow$`, `\rightarrow`, `$\to$`, `$\Rightarrow$`, `$\Leftarrow$`, `$\leftrightarrow$`), and comparison/math operators into clean Unicode symbols (`→`, `⇒`, `≤`, `≠`, `×`). Applies `whitespace-pre-line` to preserve multi-line sequence flows (e.g. `Client → Gateway → Service → DB`) on distinct lines rather than collapsing into run-on paragraphs. Protects currency values like `$100` and `$50M`.
- **Reading-progress bar:** 2px violet bar at the top of the stream tracking scroll position.
- **Popup maximize:** ⤢ opens the chat as a full-screen reader overlay (same stream/input/controls); Escape or ✕ closes.
- **Per-message actions:** ☆/★ highlight toggle (violet) and copy-to-clipboard, revealed on hover; "agent is thinking" pulse while the last message is from the user; 0.18s entrance fades (disabled under `prefers-reduced-motion`).
- Automatic scrolling (`scrollIntoView({ behavior: 'smooth' })`) to the latest chat turn upon new message arrivals.
- Multi-line textarea prompt input supporting Enter to submit and Shift+Enter for newlines.
- Updates chat state and registers messages for `get_chat_history`.

### 5. `NotificationModal`
Implements `prd.md > States and Boundaries > Error State (File Rejected)`.
Modal popup showing rejection details when a file is ≥ 1MB or unsupported.

### 6. `WelcomeModal`
Implements `prd.md > States and Boundaries > Onboarding State`.
First-load how-to-use popup (shown while `localStorage['b_onboarded']` is unset; dismissal persists):
- Six numbered steps over the warm paper token surface: upload a document → connect your AI agent (WebMCP) → ask questions → star key answers → read comfortably (A-/A+, expand) → export the session PDF.
- "Get started" dismisses; backdrop click also dismisses; the sidebar "tips" link re-opens it at any time.

### 7. `HistoryModal`
Implements `prd.md > Features and Behavior > 4. Session History Management`.
Modal dialog listing all past deliberation sessions stored in IndexedDB:
- Displays session ID, turn counts, initial question preview, and formatted timestamps.
- Action buttons: "Restore" (rehydrates messages and diagram shapes into cockpit), "Export PDF" (downloads the session's PDF directly), and "Delete" (purges from IndexedDB).

### 8. `WebMCPProvider`
Implements `prd.md > Features and Behavior > 5. WebMCP Tool Suite`.
Central service registering and dispatching all 16 WebMCP tools:
- Registers on six discovery surfaces: `document.modelContext`, `navigator.modelContext` (+ `modelContextTesting`), `window.webmcp`, hidden DOM tool forms, `webmcp:ready`/`modelcontext:ready` custom events, and `window.addEventListener('message')` JSON-RPC 2.0. Forwards `readOnlyHint` annotations for read-only tools.
- Tools exposed:
  - `get_tool_usage_prompt`: Read-only, zero-arg tool returning the agent operating guide (sourced from `webmcp/agentGuide.ts`); agents should call it before other tools.
  - `search_web`: DuckDuckGo query API.
  - `search_research`: ArXiv API export query.
  - `calculate`: Evaluates decimal math strings.
  - `search_document`: BM25 query over IndexedDB chunks. Removes query stop words, returns top 3 ranked pages, and provides keyword guidance to visiting LLMs.
  - `clean_document`: Purges IndexedDB tables and resets `FileUpload` UI.
  - `get_chat_history`: Returns chat logs with `user:` messages.
  - `canvas2d_draw_shapes`: Appends structured Canvas2D shapes and perimeter-docked arrows.
  - `canvas2d_inspect_shapes`: Returns active scene shapes and an ASCII topology graph for agent inspection.
  - `canvas2d_modify_shape`: In-place shape editing (label, position, colors).
  - `canvas2d_clear`: Clears Canvas2D scene graph.
  - `export_pdf`: Generates and triggers download of the session PDF report.
  - `canvas_draw` / `draw_diagram` / `canvas_clear`: Backwards-compatible legacy drawing tools.
  - `chat_post`: Appends agent text into `ChatArea`.

### 8. `pdfExportService`
Implements `prd.md > Features and Behavior > 4. Client-Side PDF Generation`.
In-browser report generation engine:
- **Blank Session Guard:** Validates session content; prevents exporting empty sessions and triggers `NotificationModal` validation alert.
- **LLM Markdown Humanizer:** Parses Markdown headers (`#` to `######`, H1–H6 with proportional sizing: H1 12.5pt, H2 11pt, H3 10pt, H4–H6 9.5pt), lists (`•`, `1.`), code blocks (Courier font with background tint), blockquotes, dividers, and strips inline tokens (`**`, `*`, `` ` ``, `[label](url)`) into clean typography.
- **Multilingual Indic Script Support (Bengali & Hindi):** Detects Indic Unicode characters (`[\u0900-\u09FF]`) and renders them using browser Canvas2D text shaping (HarfBuzz/Uniscribe engine) embedded into jsPDF as high-resolution vectors/images, ensuring perfect ligature and matra rendering for Bengali (বাংলা) and Hindi (हिन्दी).
- Fits canvas diagram snapshots and formats dialogue transcript with sequential turn-by-turn pagination.

### 9. `symbolHumanizer`
Implements `prd.md > Features and Behavior > 2. Chat Conversation & History > Symbol Humanization`.
Dedicated standalone string normalization utility module (`src/lib/symbolHumanizer.ts`):
- `humanizeSymbols(text: string): string`: Normalizes LaTeX directional arrows (`$\rightarrow$`, `$\to$`, `\rightarrow`, etc.), relations (`$\leq$`, `$\neq$`, etc.), arithmetic (`$\times$`, `$\pm$`, etc.), and Greek characters to clean Unicode for UI display. Preserves currency quantities (`$100`, `$50M`).
- `humanizeSymbolsForPdf(text: string): string`: Translates LaTeX and Unicode symbols to clean, non-crashing ASCII strings (`->`, `<-`, `=>`, `<=`, `>=`, `!=`, `~=`) for standard jsPDF Latin-1 typefaces.

### 10. `tavilySearch`
Implements `prd.md > Features and Behavior > 8. Keyless Tavily Web Search`.
Standalone module (`src/lib/tavilySearch.ts`) querying `https://api.tavily.com/search` with header `X-Tavily-Access-Mode: keyless` and returning `{ title, snippet, url, score }`. Backed by DuckDuckGo fallback in the `/api/websearch` proxy.

### 11. `src/voice/` Module Suite
Implements `prd.md > Features and Behavior > 9. Live Voice Mode & Pluggable Architecture`.
Self-contained, decoupled voice package:
- `types/provider.ts`: Declares abstract interfaces `ILiveVoiceProvider` (connect, stream, interrupt, tool response), `ILiveVoiceSession`, and `ISubagentProvider` (generateTask).
- `config/cryptoStorage.ts`: AES-GCM-256 non-extractable key encryption via `window.crypto.subtle` stored in IndexedDB (`bassistant_secure_vault`).
- `config/modelRegistry.ts`: Model provider registry with defaults `gemini-3.8-live` (Live audio) and `gemini-3.5-flash-lite` (Subagent text).
- `prompts.ts`: Centralized prompt templates (`VOICE_LIVE_AGENT_PROMPT_TEMPLATE`, `SUBAGENT_SYSTEM_PROMPT_TEMPLATE`), runtime temporal anchor `{current_date}` replacement (`resolvePromptWithCurrentDate`), and complete embedded WebMCP tool suite catalogs.
- `audio/recorder.ts`: `AudioWorkletRecorder` loading `/audio-capture-processor.js` for 16 kHz PCM stream.
- `audio/player.ts`: `StreamingAudioPlayer` gapless 24 kHz scheduler with instant barge-in `interrupt()`.
- `providers/geminiLiveProvider.ts`: `ILiveVoiceProvider` implementation via `@google/genai` (`ai.live.connect`). `close()` terminates the active WebSocket via `session.conn.close(1000, 'Normal Closure')` and disposes `StreamingAudioPlayer`.
- `providers/geminiSubagentProvider.ts`: `ISubagentProvider` implementation via `@google/genai` (`ai.models.generateContent`).
- `bridge/voiceBridge.ts`: WebMCP tool translation and subagent task coordination (clears canvas, draws fresh shapes, posts answer to chat, returns voice summary).
- `hooks/useVoiceAgent.ts`: React voice agent lifecycle hook equipped with an `isSessionActiveRef` cancellation token guarding asynchronous events (`onEnd`, `onTurnComplete`, `onStart`) from mutating state when stopped, guaranteeing reliable `standby` reset.
- `components/VoiceLiveController.tsx`, `VoiceSettingsModal.tsx`, `AudioPreflightModal.tsx`.

## Data Model

### 1. `IndexedDB` (`bAssistantDB`)
- **Store `documents`**:
  - `id`: string (UUID or file hash)
  - `name`: string
  - `size`: number (< 1MB)
  - `pageCount`: number
  - `createdAt`: timestamp
- **Store `chunks`**:
  - `id`: string
  - `docId`: string
  - `pageNumber`: number
  - `text`: string
  - `tokens`: string[]
- **Store `bm25_index`**:
  - `id`: string (`default_index`)
  - `docCount`: number
  - `avgDocLength`: number
  - `docLengths`: Record<string, number>
  - `invertedIndex`: Record<string, Array<{ chunkId: string, tf: number }>>
- **Store `session_turns`**:
  - `id`: string (`turn_<timestamp>_<rand>`)
  - `sessionId`: string (foreign key index)
  - `turnNumber`: number (sequential 1-based order)
  - `userPrompt`: optional string
  - `agentMessage`: optional string
  - `canvasSnapshot`: optional string (base64 PNG)
  - `canvasShapes`: optional array (Canvas2D shapes snapshot)
  - `timestamp`: number (index)
- **Store `session_meta`**:
  - `key`: string (`active_session_id`)
  - `value`: string

### 2. `IndexedDB` (`bassistant_secure_vault`)
- **Store `bassistant_keys`**:
  - `id`: string (`bassistant_device_master_key_v1`)
  - `key`: CryptoKey (non-extractable 256-bit AES-GCM master key)

### 3. Application State (React State / Local Storage)
- `theme`: `'dark' | 'light'` (persisted in `localStorage['b_theme']`).
- `apiKey`: encrypted string `__BASSISTANT_ENC__:v1:<iv>:<cipher>` (persisted in `localStorage['bassistant_gemini_api_key']`).
- `liveModel`: `'gemini-3.8-live'` (persisted in `localStorage['bassistant_voice_live_model']`).
- `subagentModel`: `'gemini-3.5-flash-lite'` (persisted in `localStorage['bassistant_subagent_model']`).
- `studioVoice`: `'Puck'` (persisted in `localStorage['bassistant_studio_voice']`).
- `sessionId`: string (persisted in IndexedDB `session_meta`).
- `sessionTurns`: Array<SessionTurnRecord> (persisted in IndexedDB `session_turns`).
- `chatMessages`: Array<{ id: string, sender: 'user' | 'agent', text: string, timestamp: number }>.
- `activeDocument`: `{ name: string, pageCount: number, status: 'idle' | 'parsing' | 'indexed' | 'error' } | null`.

## File Structure

```
C:/codebase/b_aassistant/
├── index.html                   # HTML entry point with canvas and root mount
├── package.json                 # Project dependencies & scripts
├── tsconfig.json                # TypeScript configuration
├── vite.config.ts               # Vite bundler configuration (WASM support)
├── tailwind.config.js           # Tailwind CSS theme configuration
├── src/
│   ├── main.tsx                 # React entry point
│   ├── App.tsx                  # Root cockpit layout & theme provider
│   ├── components/
│   │   ├── Branding.tsx         # Title, logo placeholder, theme toggle
│   │   ├── FileUpload.tsx       # Dropzone, LiteParse trigger, status badge
│   │   ├── BlankSlot.tsx        # Reserved 3rd sidebar section
│   │   ├── NotificationModal.tsx# Rejection / blank-session error popup
│   │   ├── CanvasArea.tsx       # 60% HTML5 canvas view & toolbar
│   │   ├── ChatArea.tsx         # 40% chat stream + full-screen reader popup
│   │   ├── HumanizedMessage.tsx # Markdown-noise cleaner for chat bubbles
│   │   └── WelcomeModal.tsx     # First-load how-to-use onboarding popup
│   ├── lib/
│   │   ├── canvasEngine.ts      # Canvas2D scene graph & legacy command renderer
│   │   ├── pdfExportService.ts  # Multilingual dual-section PDF export engine
│   │   ├── liteparseService.ts  # LiteParse WASM initialization and parser
│   │   ├── idbStorage.ts        # IndexedDB connection and document store
│   │   ├── bm25.ts              # Client-side BM25 indexer and query scorer
│   │   ├── searchService.ts     # DDGS search & ArXiv API fetch handlers
│   │   ├── tavilySearch.ts      # Keyless Tavily search client (primary)
│   │   ├── symbolHumanizer.ts   # LaTeX symbol & arrow normalizer (UI & PDF)
│   │   └── mathEvaluator.ts     # Decimal math calculator
│   ├── voice/                   # Isolated Voice Live & Pluggable Model Package
│   │   ├── index.ts             # Public package exports
│   │   ├── types/               # Provider & audio interfaces (ILiveVoiceProvider, ISubagentProvider)
│   │   ├── config/              # Crypto storage (AES-GCM-256) & model registry (gemini-3.8-live)
│   │   ├── audio/               # AudioWorklet recorder (16 kHz) & gapless player (24 kHz)
│   │   ├── providers/           # GeminiLiveProvider & GeminiSubagentProvider implementations
│   │   ├── bridge/              # Tool adapter & subagent task bridge
│   │   ├── hooks/               # useVoiceSettings & useVoiceAgent
│   │   └── components/          # VoiceLiveController, VoiceSettingsModal, AudioPreflightModal
│   ├── webmcp/
│   │   ├── types.ts             # WebMCP tool interfaces & JSON-RPC schema
│   │   ├── tools.ts             # 17 tool declarations (schemas & dispatch)
│   │   ├── agentGuide.ts        # Read-only get_tool_usage_prompt guide text
│   │   └── provider.ts          # Unified bridge (6 discovery surfaces)
│   └── tests/                   # Hermetic Vitest suites
│       ├── bm25.test.ts         # BM25 indexing & scoring
│       ├── mathEvaluator.test.ts# Decimal calculations
│       ├── symbolHumanizer.test.ts # Symbol normalization for UI and PDF
│       ├── webmcp.test.ts       # WebMCP tool dispatching
│       ├── canvasEngine.test.ts # Canvas command engine
│       ├── canvas2dAdvanced.test.ts  # Scene graph shapes & arrows
│       ├── pdfExportService.test.ts  # PDF export & markdown cleaning
│       ├── humanizedMessage.test.tsx # Chat humanization
│       ├── documentProcessing.test.ts# LiteParse parsing pipeline
│       ├── searchService.test.ts# Web/research fallbacks
│       ├── tavilySearch.test.ts # Keyless Tavily search & mapping
│       ├── cryptoStorage.test.ts# AES-GCM-256 key encryption
│       ├── modelRegistry.test.ts# Voice model provider registry
│       ├── audioUtils.test.ts   # Audio scheduler and interrupt
│       ├── voiceLiveController.test.tsx # Voice HUD widget rendering
│       ├── seoAndRobots.test.ts # robots.txt, sitemap, meta tags & JSON-LD schema
│       └── chatArea.test.tsx    # Dwell enrichments: popup, fonts, highlights
├── public/                      # Static assets & crawler standards
│   ├── robots.txt               # Search engine crawler directives & sitemap reference
│   ├── sitemap.xml              # Canonical URL sitemap for indexing
│   ├── bassistant_light.jpg     # Light-mode branding logo
│   ├── bassistant_dark.jpg      # Dark-mode branding logo
│   ├── liteparse_wasm_bg.wasm   # LiteParse WASM binary
│   └── audio-capture-processor.js # 16 kHz AudioWorklet processor
├── docs/                        # docs7 documentation site (includes tavily-search.mdx, voice-agent.mdx)
├── devpost/                     # Devpost hackathon project artifacts
│   ├── learner-profile.md
│   ├── scope.md / scope.html
│   ├── prd.md / prd.html
│   ├── spec.md / spec.html
│   └── research.md              # Dwell-time UI research with sources
├── README.md                    # Human-facing project overview & quickstart
├── CLAUDE.md                    # AI agent instructions & build rules
└── AGENTS.md                    # Pointer referencing CLAUDE.md & README.md
```

## External Services and Dependencies
- **Tavily Search API:** Keyless AI search endpoint (`POST https://api.tavily.com/search`, `X-Tavily-Access-Mode: keyless`). Free, zero auth.
- **DuckDuckGo API:** Public CORS-accessible endpoint for web search summaries (`https://api.duckduckgo.com/?q={query}&format=json`). Free, zero auth.
- **ArXiv API:** Public export search endpoint (`https://export.arxiv.org/api/query?search_query=all:{query}&max_results=5`). Free, zero auth.
- **Gemini Live WebSocket API (`@google/genai`):** Direct client-side WebSocket communication for bidirectional duplex audio (`ai.live.connect`).
- **Cloudflare Pages:** Free static hosting.

## Important Failure Modes
- **File ≥ 1MB or Invalid Format:** Caught immediately by file validator in `FileUpload.tsx`. Triggers `NotificationModal` explaining the limit, clears the file selection, and leaves existing state untouched.
- **Blank Export Attempt:** Caught immediately by `handleExportPdf` and `pdfExportService`. Triggers `NotificationModal` explaining that the session is blank and returns an error for WebMCP `export_pdf`.
- **WASM Initialization Delay:** `LiteParseService` loads WASM asynchronously. Upload dropzone shows a subtle loading spinner until the parser is ready.
- **External Search Network Failure:** If DuckDuckGo or ArXiv is unreachable due to connectivity, the tool returns a clean error object (`{ error: "Search service unavailable" }`) rather than failing silently.

## What Was Simplified and Why
- **BM25 In-Browser Lexical Search** instead of cloud vector embeddings: keeps user documents 100% private in browser storage, avoids API keys and token costs, and runs instantly in IndexedDB.
- **HTML Canvas Drawing Primitives** instead of generative image AI: generates instantaneous diagrams, graphs, and visual illustrations at zero cost with lightweight LLM tool calls.
- **Unified In-Browser WebMCP Bridge** instead of building a separate custom in-page inspector UI: conforms directly to standard WebMCP protocols, allowing external browser extensions and agents to plug in natively.

## Decisions and Open Issues
- **Learner Decisions:**
  - Build stack: React + Vite SPA.
  - Deployment: Cloudflare Pages.
  - Ingestion: LiteParse (browser WASM) for pagewise chunking + BM25 index in IndexedDB (< 1MB Doc/PDF).
  - WebMCP standard: Multi-standard support (`document.modelContext`, `navigator.modelContext`, `window.webmcp`, DOM forms, `postMessage`).
  - Documentation: `docs7`, `README.md`, `CLAUDE.md`, `AGENTS.md`.
  - Development Rules: Strict token efficiency, hermetic tests only, no subagents without permission, no reading `.env` / system variables, only `git status` permitted.
- **Open Issues:**
  - None blocking technical implementation. Ready for build checklist and execution (`5-build`).
