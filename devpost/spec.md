---
doc: spec
status: approved
---

# bAssistant — Technical Specification

A zero-backend, React-based single-page browser assistant deployed to Cloudflare Pages that exposes browser-native WebMCP tools for live HTML canvas diagramming, in-browser LiteParse + BM25 document querying, decimal math, and public research search.

## How This Works, In Plain Language
`bAssistant` is a client-side application built with React and Vite. When a user opens it:
1. The page renders a 20/80 layout: a left sidebar (branding with light/dark toggle, file upload, and a blank reserved space) and an 80% main area split into a top 60% HTML canvas and a bottom 40% chat interface.
2. If the user uploads a Doc or PDF file (< 1MB), `LiteParse` runs directly inside the browser using WebAssembly (WASM). It extracts text page-by-page. A client-side BM25 indexer tokenizes and scores the text, saving the chunks and index into the browser's IndexedDB.
3. The user types messages into the chat box. Each message is tagged with a `user:` prefix and kept in application state.
4. The page initializes a **Unified WebMCP Provider** that registers 16 tools onto six discovery surfaces: `document.modelContext`, `navigator.modelContext`, `window.webmcp`, hidden DOM tool forms, ready custom events, and `window.postMessage` for standard JSON-RPC 2.0 MCP commands.
5. Any visiting LLM, extension, or WebMCP inspector discovers the exposed tools:
   - `get_tool_usage_prompt`: returns the read-only operating guide for using all other tools (call first).
   - `search_document`: queries the local BM25 index in IndexedDB.
   - `clean_document`: wipes the IndexedDB chunks and resets the upload box.
   - `get_chat_history`: retrieves conversation logs including `user:` prompts.
   - `canvas2d_draw_shapes` / `canvas2d_inspect_shapes` / `canvas2d_modify_shape` / `canvas2d_clear`: structured scene-graph drawing, inspection, and in-place editing.
   - `export_pdf`: generates the session PDF report (canvas snapshot + transcript).
   - `canvas_draw` / `draw_diagram` / `canvas_clear`: legacy drawing commands onto the HTML canvas.
   - `chat_post`: streams or posts agent explanations into the chat log.
   - `calculate`: runs exact decimal math in the browser.
   - `search_web`: calls DuckDuckGo's browser-accessible search API.
   - `search_research`: calls ArXiv's public query API.
6. The entire application contains zero server code and runs entirely in the browser, compiling to static assets deployed to Cloudflare Pages.

## The Core Journey Through the System
Traces `prd.md > The Core Journey`:
1. **User loads page:** Browser loads static HTML/JS bundle from Cloudflare Pages. React mounts `App`, reads local theme preference (Light/Dark), and initializes the `WebMCPBridge` service. Canvas and Chat initialize blank.
2. **File dropped (< 1MB):** `FileUpload` component validates size (< 1MB) and extension (.pdf, .doc, .docx). If valid, passes bytes to `LiteParseService` (WASM), extracts pages, passes text to `BM25Indexer`, and stores records in `DocumentStore` (IndexedDB). UI displays file name, page count, and "Indexed" badge. If invalid, `Modal` popup displays error.
3. **User submits prompt:** `ChatView` appends `{ sender: 'user', text: input }` to state.
4. **Visiting Agent accesses WebMCP:** Agent invokes `get_chat_history` via `window.webmcp.callTool` or `postMessage({ method: 'tools/call' })`.
5. **Agent executes queries & math:** Agent invokes `search_document` (queries IndexedDB BM25), `search_web` (DDGS), `search_research` (ArXiv), or `calculate`.
6. **Agent outputs visually and textually:** Agent calls `chat_post` to append response to `ChatView`, and calls `canvas_draw` to instruct `CanvasEngine` to draw diagram lines, boxes, labels, and graphs.
7. **Reset / Cleanup:** User clicks "Clear Canvas" (calls `canvas_clear`) or triggers `clean_document` to wipe IndexedDB.

## Stack
- **Language & Framework:** TypeScript, React 18/19. Rationale: Standard component model, fast rendering, strict type hints.
- **Build System:** Vite. Rationale: Fast HMR, direct static export to `dist/` compatible with Cloudflare Pages. [Vite Docs](https://vitejs.dev/)
- **Styling:** Tailwind CSS. Rationale: Utility-first styling with built-in dark/light mode toggle. [Tailwind Docs](https://tailwindcss.com/)
- **Document Parser:** `@llamaindex/liteparse-wasm`. Rationale: Zero-backend, browser-native WebAssembly PDF and document extraction with spatial page parsing. [LiteParse Docs](https://developers.llamaindex.ai/liteparse/)
- **Client Storage:** Native `IndexedDB` with custom lightweight wrapper. Rationale: Built into all modern browsers, handles structured chunk and BM25 index persistence without backend dependencies.
- **Search Engine:** Custom client-side BM25 implementation (`bm25.ts`). Rationale: Pure client-side lexical relevance scoring over document pages without server dependencies.
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
- **Theme:** Dual-theme system (Light mode with slate/white neutrals; Dark mode with rich dark `#0f172a` cockpit aesthetic).
- **Typography:** Sans-serif for navigation and controls; clean monospace font for code blocks, chat metadata, and WebMCP logs.
- **Layout:** Strict 20% left sidebar / 80% main workspace layout.
- **Visual Dividers:** Subtle border dividers (`border-slate-700` in dark, `border-slate-200` in light).
- **Initial State:** Canvas and chat areas render completely clean and blank on initial load.

## Components

### 1. `App`
Implements `prd.md > Screens and Layout`.
Root container orchestrating layout, theme state (Light/Dark), and lifecycle initialization of the `WebMCPBridge`.

### 2. `Sidebar`
Implements `prd.md > Screens and Layout > Left Sidebar (20% width)`.
Hosts:
- `Branding`: App title "bAssistant", logo placeholder, and theme toggle switch.
- `FileUpload`: Dropzone and file picker for Doc/PDF files < 1MB. Displays parsing status, page count, and "Indexed" badge. Triggers `NotificationModal` on rejection.
- `BlankSlot`: Unallocated 3rd section reserved for future tools.

### 3. `CanvasArea`
Implements `prd.md > Features and Behavior > 3. Live HTML Canvas Rendering & Scene Graph`.
Top 60% pane of the main workspace. Renders the HTML5 `<canvas>` element and toolbar:
- Toolbar with "Clear Canvas" and "Export PDF" buttons (mirrored by `canvas2d_clear` and `export_pdf` WebMCP tools).
- `CanvasEngine`: Manages reactive scene graph (`Canvas2dShape[]`), perimeter-docked connectors, soft-translucent colors, HiDPI scaling, and snapshot capture.

### 4. `ChatArea`
Implements `prd.md > Features and Behavior > 2. Chat Conversation & History`.
Bottom 40% pane of the main workspace:
- Message feed displaying dialogue history in **Lora** serif typography calibrated for longform reading (17px, line-height 1.75, max-width ~72ch measure). User messages rendered with uppercase `user:` badge and agent messages with `agent:` badge.
- **Humanized Markdown Rendering:** Parses incoming messages to render structured React elements (headings, styled bullet and numbered lists, monospace code blocks with background tint, blockquotes, and inline bold/italic/code/links) without exposing raw markdown syntax.
- Automatic scrolling (`scrollIntoView({ behavior: 'smooth' })`) to the latest chat turn upon new message arrivals.
- Multi-line textarea prompt input supporting Enter to submit and Shift+Enter for newlines.
- Updates chat state and registers messages for `get_chat_history`.

### 5. `NotificationModal`
Implements `prd.md > States and Boundaries > Error State (File Rejected)`.
Modal popup showing rejection details when a file is ≥ 1MB or unsupported.

### 6. `WebMCPProvider`
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

### 7. `pdfExportService`
Implements `prd.md > Features and Behavior > 4. Client-Side PDF Generation`.
In-browser report generation engine:
- **Blank Session Guard:** Validates session content; prevents exporting empty sessions and triggers `NotificationModal` validation alert.
- **LLM Markdown Humanizer:** Parses Markdown headers (`#`, `##`, `###`), lists (`•`, `1.`), code blocks (Courier font with background tint), blockquotes, dividers, and strips inline tokens (`**`, `*`, `` ` ``, `[label](url)`) into clean typography.
- **Multilingual Indic Script Support (Bengali & Hindi):** Detects Indic Unicode characters (`[\u0900-\u09FF]`) and renders them using browser Canvas2D text shaping (HarfBuzz/Uniscribe engine) embedded into jsPDF as high-resolution vectors/images, ensuring perfect ligature and matra rendering for Bengali (বাংলা) and Hindi (हिन्दी).
- Fits canvas diagram snapshot and formats dialogue transcript with pagination.

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

### 2. Application State (React State / Local Storage)
- `theme`: `'dark' | 'light'` (persisted in `localStorage`).
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
│   │   ├── ChatArea.tsx         # 40% chat stream, user input & send button
│   │   └── HumanizedMessage.tsx # Markdown-noise cleaner for chat bubbles
│   ├── lib/
│   │   ├── canvasEngine.ts      # Canvas2D scene graph & legacy command renderer
│   │   ├── pdfExportService.ts  # Multilingual dual-section PDF export engine
│   │   ├── liteparseService.ts  # LiteParse WASM initialization and parser
│   │   ├── idbStorage.ts        # IndexedDB connection and document store
│   │   ├── bm25.ts              # Client-side BM25 indexer and query scorer
│   │   ├── searchService.ts     # DDGS search & ArXiv API fetch handlers
│   │   └── mathEvaluator.ts     # Decimal math calculator
│   ├── webmcp/
│   │   ├── types.ts             # WebMCP tool interfaces & JSON-RPC schema
│   │   ├── tools.ts             # 16 tool declarations (schemas & dispatch)
│   │   ├── agentGuide.ts        # Read-only get_tool_usage_prompt guide text
│   │   └── provider.ts          # Unified bridge (6 discovery surfaces)
│   └── tests/                   # 9 hermetic Vitest suites
│       ├── bm25.test.ts         # BM25 indexing & scoring
│       ├── mathEvaluator.test.ts# Decimal calculations
│       ├── webmcp.test.ts       # WebMCP tool dispatching
│       ├── canvasEngine.test.ts # Canvas command engine
│       ├── canvas2dAdvanced.test.ts  # Scene graph shapes & arrows
│       ├── pdfExportService.test.ts  # PDF export & markdown cleaning
│       ├── humanizedMessage.test.tsx # Chat humanization
│       ├── documentProcessing.test.ts# LiteParse parsing pipeline
│       └── searchService.test.ts# Web/research fallbacks
├── docs/                        # docs7 documentation site
├── devpost/                     # Devpost hackathon project artifacts
│   ├── learner-profile.md
│   ├── scope.md / scope.html
│   ├── prd.md / prd.html
│   └── spec.md / spec.html
├── README.md                    # Human-facing project overview & quickstart
├── CLAUDE.md                    # AI agent instructions & build rules
└── AGENTS.md                    # Pointer referencing CLAUDE.md & README.md
```

## External Services and Dependencies
- **DuckDuckGo API:** Public CORS-accessible endpoint for web search summaries (`https://api.duckduckgo.com/?q={query}&format=json`). Free, zero auth.
- **ArXiv API:** Public export search endpoint (`https://export.arxiv.org/api/query?search_query=all:{query}&max_results=5`). Free, zero auth.
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
