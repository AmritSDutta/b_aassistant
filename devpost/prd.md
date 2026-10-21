---
doc: prd
status: approved
---

# bAssistant — Product Requirements

A zero-backend, single-page React browser assistant deployed to Cloudflare Pages that enables visiting LLMs via standard WebMCP to draw live diagrams on an HTML canvas, search documents locally with BM25, and use free research tools.
Source: `scope.md > The Unique Kernel`, `scope.md > Who It's For`.

## The Core Journey
Source: `scope.md > The Core Loop`, `scope.md > What "Working" Looks Like`.

1. **Arrival:** User loads `bAssistant` in their browser. The UI renders the 20/80 layout in their chosen theme (Light/Dark toggle in branding header). Both canvas and chat areas initialize blank.
2. **Document Ingestion (Optional):** User drags or selects a Doc or PDF file (< 1MB) into the upload area. LiteParse (browser WASM) parses the document pagewise, and a client-side BM25 index is generated in IndexedDB. The upload area updates to display the file name, page count, and an "Indexed" badge. If a file is ≥ 1MB or unsupported, a popup explains why it was rejected.
3. **User Input:** User enters an inquiry or prompt into the chat text input. The message is displayed in the chat stream with a `user:` prefix.
4. **Agent Connection & Tool Discovery:** A visiting LLM connects to `bAssistant` using standard browser-native WebMCP, discovering the exposed tools without requiring a specialized in-app inspector UI. The read-only `get_tool_usage_prompt` tool returns the operating guide for every other tool, so the agent learns the intended workflow before acting.
5. **Tool Execution:** The visiting LLM queries the user's message history, calls `search_document` (BM25), `search_web` (DDGS), `search_research` (ArXiv), or `calculate` as appropriate.
6. **Multimodal Output:** The visiting LLM streams its written explanation into the 40% chat area and simultaneously calls canvas tools to render live diagrams, graphs, and illustrations on the top 60% canvas.
7. **Canvas & Storage Control:** User or agent can clear the canvas via a UI button or corresponding WebMCP tool. User or agent can execute `clean_document` to wipe stored IndexedDB chunks and reset the upload interface.

## Screens and Layout
Source: `scope.md > Inspiration & Identity`.

A responsive, single-page cockpit filling 100% of the viewport, vertically partitioned:
- **Left Sidebar (20% width):**
  - **Section 1 (Top) — Branding:** App title "bAssistant", transparent theme-aware logo (`bassistant_light.jpg` in dark mode, `bassistant_dark.jpg` in light mode), and Light/Dark mode toggle.
  - **Section 2 (Middle) — File Upload:** Dropzone and file picker for Doc/PDF files strictly under 1MB. Status display showing filename, page count, and "Indexed" badge upon processing.
  - **Section 3 — Reference URLs:** Enboldened `REFERENCE URLS` header with count badge (up to 10 URLs). Click `+ Add` to open a reachability verification modal before caching to browser storage.
  - **Section 4 (Bottom) — Session Highlights:** Enboldened `Session Highlights` section collecting starred dialogue messages for instant revisit.
- **Main Workspace (80% width):**
  - **Top Area (60% height) — HTML Canvas:** Interactive visual display area for programmatic drawing (shapes, lines, graphs, diagrams). Includes UI action buttons (such as "Clear Canvas") that mirror exposed WebMCP tools.
  - **Bottom Area (40% height) — Chat Area:** Scrollable dialogue log displaying `user:` messages and agent responses, formatted with Lora longform reading typography and auto-scrolling to the latest turn, with a bottom text input and send button. The dialogue header bar docks the compact `VoiceLiveController` (animated mic toggle, live status pill, real-time transient caption preview, and quick settings gear).
- **Modals & Overlays:**
  - `VoiceSettingsModal`: Modal for configuring Gemini API key (AES-GCM-256 encrypted), Live audio model (`gemini-3.8-live` default), Subagent model (`gemini-3.5-flash-lite`), and Prebuilt Studio Voice (Puck, Charon, Kore, Fenrir, Aoede).
  - `AudioPreflightModal`: Quick 1-second microphone permission and volume meter check before connecting to the live audio socket.

## Look and Feel
- **Theme:** Dual-mode theme support (Light and Dark mode) switched via a toggle in the branding header.
- **Style:** Clean, utilitarian cockpit feel with precise panel dividers, high contrast, readable monospaced/sans typography for code and chat, and responsive proportions.
- **Initial Visual State:** Both the HTML canvas and the chat conversation list start completely blank on initial load.

## Features and Behavior

### 1. Document Upload & In-Browser Indexing
Source: `scope.md > The POC Boundary`.
- **Capability:** Ingestion of Doc and PDF files strictly < 1MB.
- **Processing:** Client-side parsing using LiteParse (browser WASM) into page-level chunks, with stream decompressor fallback, hex string decoding (`<...> Tj` and `[...] TJ`), and in-browser DOCX PKZip `word/document.xml` decompression.
- **Storage:** Chunks and BM25 search index stored directly in IndexedDB.
- **Feedback:**
  - Valid file: Displays filename, total page count, and "Indexed" confirmation.
  - Invalid file (≥ 1MB or invalid format): Triggers a clear notification popup explaining the exact rejection reason.

### 2. Chat Conversation & History
Source: `scope.md > The Core Loop`.
- **Input:** Bottom text input and send button allowing the user to type messages.
- **Formatting:** User messages are stored and rendered with a `user:` prefix.
- **Humanized Text Rendering:** The chat area renders humanized typography without exposing raw markdown syntax:
  - Headings (`#`, `##`, `###`, `####`, `#####`, `######`) format as proportional styled headers without `#` symbols (H1–H3 as primary section titles, H4–H6 as compact high-contrast sub-headings).
  - Lists (`-`, `*`, `+`, `1.`) format as structured bullet and numbered lists with indented alignment.
  - Fenced code blocks (```` ``` ````) format into dedicated monospace containers with subtle background contrast.
  - Blockquotes (`>`) render as indented callouts with border accents.
  - Inline tokens (`**bold**`, `*italic*`, `` `code` ``, `[label](url)`) format as bold, italic, inline code pills, and clean clickable links without raw markdown characters.
- **Symbol Humanization & Sequence Formatting (`symbolHumanizer.ts`):**
  - Directional and logic arrows (`$\rightarrow$`, `\rightarrow`, `$\to$`, `$\Rightarrow$`, `$\Leftarrow$`, `$\leftrightarrow$`, `$\uparrow$`, `$\downarrow$`) format as elegant Unicode symbols (`→`, `⇒`, `⇐`, `↔`, `↑`, `↓`).
  - Relational and mathematical operators (`$\leq$`, `$\geq$`, `$\neq$`, `$\approx$`, `$\times$`, `$\pm$`, `$\cdot$`, `$\dots$`, `$\in$`, `$\notin$`, `$\infty$`) format as clean Unicode characters (`≤`, `≥`, `≠`, `≈`, `×`, `±`, `·`, `…`, `∈`, `∉`, `∞`).
  - Currency protection: Values like `$100`, `$50M`, and `$12.50` are strictly preserved without stripping.
  - Multi-line sequence layout preservation: Preserves line breaks in multi-step system architecture flows (e.g. `Client → Gateway → Service → DB`) so steps render on separate lines instead of collapsing into a run-on paragraph.
- **Retrieval:** Visiting LLM can retrieve previous user messages and conversation context through an exposed WebMCP tool.
- **Streaming/Posting:** Visiting agent can append structured textual explanations directly into the chat stream.

### 3. Live HTML Canvas Rendering & Scene Graph
Source: `scope.md > The Unique Kernel`.
- **Artistic Drawing Engine:** Executes drawing tool calls from visiting agents to render structured Canvas2D shapes (`rectangle`, `ellipse`, `diamond`, `text`, `sticker`) and dynamic perimeter-docked connectors (`arrow`, `line`) using procedural hand-drawn sketch techniques powered by **Rough.js** (MIT).
- **Procedural Hand-Drawn Sketching:** Renders organic, double-stroked boundaries, sketchy jittered contours, and textured hachure/cross-hatch fills rather than rigid CAD-like vector polygons.
- **Fluid Generative Connectors (Bézier Splines):** Replaces rigid straight lines with graceful cubic Bézier splines (`ctx.bezierCurveTo`) whose control points curve naturally according to relative orientation, terminating in tangent-aligned arrowheads with rounded caps.
- **Tactile Paper Backdrops:** Composites a subtle warm parchment and paper grain texture across the canvas viewport and in offscreen snapshot captures for PDF export.
- **Curated Editorial & Risograph Color Harmonies:** Built-in artistic palettes (terracotta `#e06d53`, warm cobalt `#3b66cf`, sage mint `#4e9a7e`, sunflower gold `#e5a93b`, plum `#7c4a73`) that automatically harmonize raw primary hex inputs into magazine-grade illustration tones.
- **Edge-to-Edge Perimeter Docking:** Connectors anchor to shape borders and stay attached when shapes move.
- **Viewport Auto-Centering (`fitToContent`):** Measures total bounding box of all shapes and computes uniform scaling and offsets so diagrams never clip or land outside the visible canvas viewport.
- **Interactive Pan & Smooth Wheel Zoom:** Allows users to drag-to-pan across the infinite canvas and zoom with mouse wheel (`zoomAtPoint`), keeping cursor focus stationary.
- **Visual Elevation (2.5D Drop Shadows):** Ambient drop shadows on containers (`shadowOffsetY: 4`, `shadowBlur: 14`) for sharp contrast above the grid, cleared before stroking borders.
- **Universal Medium Dark Yellow Bold Labels at Top of Elements:** To ensure crisp, unambiguous contrast across both light mode (on light/translucent fills and warm paper) and dark mode (on dark fills and ink surfaces), element labels on shapes use **medium dark yellow** (`#d97706` / Amber 600) in **bold typography**, anchored at the **top of the element** (`topCenter` with top padding). Connector pills similarly use bold medium dark yellow text on protective backdrops.
- **Theme-Conducive Contrast Colors for Shapes & Connectors:** Dynamically resolves shape strokes and connector lines based on active theme mode to guarantee crisp readability in both light and dark modes:
  - Live DOM Theme Synchronization & MutationObserver: The canvas engine automatically queries `document.documentElement` class state and listens via a `MutationObserver` on `<html>` to guarantee immediate live canvas repaint on theme toggle without state lag.
  - In Light Mode: Translucent and light shape fills scale with boosted alpha (`alpha * 1.8`); connector lines adapt to deep slate (`#334155`); connector label pills use warm translucent white backdrop with `#cbd5e1` borders.
  - In Dark Mode: Connector lines use crisp slate (`#94a3b8`); connector label pills use dark backdrop (`#0f172a`) with `#334155` borders.
- **Color Palette:** Soft-translucent multi-tier palette (indigo client, emerald gateway, purple database, orange cache/queue, amber logic, and sticky-note stickers) with backdrop pills behind edge labels.
- **Manual Control:** "New Session", "Fit View", "Reset View", "Clear Canvas", and "Export PDF" buttons on the canvas toolbar; also callable as WebMCP tools.

### 4. Client-Side PDF Generation & Session History Management
Source: `scope.md > The POC Boundary`.
- Pure in-browser PDF generation using `jspdf` and persistent browser session storage in IndexedDB.
- **Active Session Persistence & History Modal:**
  - Maintains single active session state in `bAssistantDB` across browser reloads via `session_turns` and `session_meta` stores.
  - Dedicated **Session History Modal** accessible from the session strip: browse all past sessions, view turn counts and dates, restore past sessions, export historical sessions directly to PDF, or delete old sessions.
  - Automatically records sequential deliberation turns (user prompt if present, canvas diagram snapshot if updated, and AI deliberation).
  - Handles turns where user prompt is present or absent (e.g. autonomous agent calling `canvas2d_draw_shapes` or `chat_post` directly).
  - Provides a clean "New Session" restart mechanism in the UI to reset state and initialize a fresh session ID.
- **Sequential Turn-by-Turn PDF Export (`exportSessionPdf`):**
  - Generates publication-ready A4 reports compiling active session turns sequentially in chronological order.
  - Features top-left embedded branding logo (`bassistant_light.jpg`), session title `"bAssistant Deliberation Session"`, session ID, and timestamp metadata.
  - For each turn:
    - Renders turn section badge: `TURN X [HH:MM]`.
    - Renders `USER INQUIRY` block with formatted text (when user prompt is present).
    - Renders turn canvas visual diagram snapshot (aspect ratio preserved via PNG IHDR dimension parsing and `fitContain()`, enclosed in a subtle card frame).
    - Renders `AI DELIBERATION` block with rich markdown parsing.
- **Blank Content Validation:** Validates that at least one of either the canvas scene graph or the dialogue stream has substantive content before export. If both are blank, the export is aborted, a validation modal alert is presented to the user, and WebMCP `export_pdf` returns a descriptive rejection error.
- **Markdown Humanization for LLM Content:** Parses and converts raw LLM-generated Markdown in the dialogue stream:
  - Formats headings (`#`, `##`, `###`, `####`, `#####`, `######`) in bold Helvetica with proportional sizing (H1: 12.5pt, H2: 11pt, H3: 10pt, H4–H6: 9.5pt) and clean vertical spacing.
  - Formats bullet points (`- `, `* `, `+ `) as clean bullets (`• `) with indented margins.
  - Formats numbered lists (`1. `, `2. `) with indented alignment.
  - Formats blockquotes (`> `) in italic with subtle vertical border accents.
  - Formats fenced code blocks in Courier monospace with light-slate background tinting.
  - Cleans inline markup (`**bold**`, `*italic*`, `` `code` ``, `[label](url)`) into clean readable text.
  - Normalizes LaTeX and Unicode arrow/math symbols to clean ASCII equivalents (`->`, `<-`, `=>`, `<=`, `>=`, `!=`, `~=`) for standard jsPDF core fonts, preventing encoding corruption or broken glyphs.
- **Multilingual Indic Script Support (Bengali & Hindi):**
  - Resolves standard PDF Latin-1 font limitations for Indic complex scripts by utilizing native browser text-shaping (HarfBuzz/Uniscribe via Canvas2D rasterization).
  - Accurately renders Bengali (বাংলা, যেমন যুক্তাক্ষর 'ক্ষ', 'জ্ঞ') and Hindi (हिन्दी, जैसे संयुक्त व्यंजन 'क्त', 'त्र', मात्राएं) with 100% typographic fidelity, preventing missing characters or broken ligatures.
- **Multipage Pagination:** Automatically computes block height against a 10mm bottom margin buffer, advancing to new pages seamlessly.
- **Mandatory AI Disclaimer Footer:** Every page stamps the exact centered disclaimer:
  > `AI generated analysis, verify before applying.`
  with a right-aligned page counter (`Page X of Y`).

### 5. WebMCP Tool Suite
Source: `scope.md > The POC Boundary`.
The application exposes 17 standard WebMCP tools for visiting LLMs:
- `get_tool_usage_prompt`: Read-only, zero-argument tool returning the agent operating guide for using every other tool; marked `readOnlyHint: true` and meant to be called first.
- `get_reference_url`: Read-only, zero-argument tool returning comma-separated list of up to 10 stored reference URLs cached in browser storage.
- `search_web`: Executes web search queries using Keyless Tavily AI search as primary with automatic DuckDuckGo fallback.
- `search_research`: Executes academic literature searches via ArXiv.
- `calculate`: Evaluates decimal math expressions.
- `search_document`: Searches ingested document chunks in IndexedDB using the BM25 index with stop-word filtering.
- `clean_document`: Purges stored document chunks from IndexedDB and resets upload section.
- `get_chat_history`: Returns chat messages including `user:` prefixed prompts.
- `canvas2d_draw_shapes`: Appends structured Canvas2D shapes and perimeter-docked arrows.
- `canvas2d_inspect_shapes`: Returns active scene shapes and an ASCII topology graph for agent self-inspection.
- `canvas2d_modify_shape`: Surgical in-place editing of shape label, position, or colors.
- `canvas2d_clear`: Clears the Canvas2D scene graph (mirrors UI button).
- `export_pdf`: Generates and triggers download of the session PDF report.
- `chat_post`: Appends or streams text into the chat stream.
- `canvas_draw` / `draw_diagram` / `canvas_clear`: Legacy canvas tools for quick single-command drawing and connected node/edge graphs.

### 6. Long-Dwell Reading Comfort & Session Engagement
Source: `research.md` (dwell-time mechanisms 1–6).
- **Warm dual themes:** semantic CSS token layer — light mode is warm paper with navy ink; dark mode uses warm ink surfaces instead of cold blue-black, reducing eye fatigue over long sessions.
- **First-load onboarding popup:** a WelcomeModal explains how to use bAssistant (upload → connect agent → ask → highlight → maximize → export) on first visit; dismissal persists and a sidebar "tips" link re-opens it.
- **Chat popup maximize:** ⤢ expands the dialogue into a full-screen reader (Escape/✕ closes) with the same stream, input, and font controls — the zen reading mode.
- **Reading comfort:** A- / A+ font steps (15/17/19px) persisted across sessions; 2px reading-progress bar atop the stream for a sense of investment.
- **Session Highlights:** users star (☆/★) any message; starred messages collect in sidebar Section 3 and clicking one scrolls the dialogue to it — the revisit loop.
- **Alive-but-calm feedback:** "agent is thinking" pulse while awaiting a reply, 0.18s message entrance fades, per-message copy button, dropzone drag-over highlight, and gentle session strip (messages · highlights · minutes). All motion disabled under `prefers-reduced-motion`.

### 7. SEO, Crawler Discoverability & Indexing Standards
- **Meta Description & Content Summary:** Comprehensive `<meta name="description">` defining bAssistant as a 100% private, client-side AI Business Analyst workstation with interactive HTML5 canvas diagramming, local document retrieval, and WebMCP agent tools.
- **Crawler Discoverability & Semantic HTML:** Structured metadata including Open Graph (`og:title`, `og:description`, `og:type`, `og:url`, `og:image`), Twitter cards (`twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`), theme color meta tags, and schema.org JSON-LD structured data (`WebApplication`).
- **Crawler Fallback Content:** Semantic `<noscript>` block inside `<body>` outlining the workstation's core capabilities, architecture, and WebMCP tools so search engine crawlers that do not execute JavaScript can index and understand the application's structure.
- **Valid robots.txt Directives:** Standalone plain-text `public/robots.txt` providing valid search engine crawling instructions and pointing to `sitemap.xml`, preventing SPA catch-all HTML fallback from producing crawler syntax errors.
- **Sitemap Indexing:** Standard `public/sitemap.xml` listing primary public routes for canonical search indexing.

### 8. Keyless Tavily Web Search with Automatic DuckDuckGo Fallback
- **Primary AI Search Engine**: Uses Tavily Search API (`POST https://api.tavily.com/search`) with `X-Tavily-Access-Mode: keyless` to fetch clean, ranked, and scored content optimized for LLM consumption without HTML garbage or token bloat.
- **Two-Tier Proxy Fallback**: Integrated in the same-origin `/api/websearch` layer (Vite dev middleware & Cloudflare Pages Functions). If Tavily is unavailable or rate-limited (HTTP 429), it immediately and seamlessly falls back to DuckDuckGo HTML scraping.
- **Honest Metadata**: All search outcomes carry `source: 'tavily'` or `source: 'duckduckgo'` along with the ISO `fetchedAt` timestamp.

### 9. Bidirectional Full-Duplex Live Voice Mode & Pluggable Architecture (`src/voice/`)
- **Dual-Tier Agent Topology**:
  - **Tier 1 (Conversational Audio Orchestrator)**: Default `gemini-3.8-live` handling 16 kHz microphone capture via `AudioWorkletProcessor` (`public/audio-capture-processor.js`), 24 kHz gapless PCM output playback, and zero-latency barge-in interruption (audio halts instantly on user speech).
  - **Tier 2 (Domain Subagent Engine)**: High-throughput text generator (`gemini-3.5-flash-lite`) invoked when diagrams or in-depth technical analysis are requested via the asynchronous bridge tool (`generate_diagram_and_explanation`). The bridge returns immediately to Tier 1 to prevent voice pauses, while the subagent runs in the background to clear the canvas, draw fresh shapes, and post the substantive technical explanation directly to the chat area and IndexedDB.
- **Ephemeral Spoken Conversation Policy**: Spoken speech turns and live audio chitchat remain ephemeral in the audio stream and Voice HUD caption pill. They are **not** written to the persistent dialogue history, keeping the reading notes and PDF reports clean and executive.
- **Pluggable Provider Contracts**: Abstract interfaces (`ILiveVoiceProvider` and `ISubagentProvider`) decouple the audio pipeline from Google Gemini, allowing OpenAI Realtime, Mistral, or local Ollama models to be plugged in effortlessly.
- **Hardware Preflight Modal**: Quick 1-second audio check verifying microphone permissions and visual volume meter before initiating the live socket connection.
- **Client-Side Key Encryption**: Encrypts user API keys with 256-bit AES-GCM via Web Cryptography API (`window.crypto.subtle`) using non-extractable keys in IndexedDB (`bassistant_secure_vault`), saving formatted ciphertext (`__BASSISTANT_ENC__:v1:...`) to `localStorage` under `bassistant_` prefix.
- **Centralized Prompts & Dynamic Temporal Anchoring (`src/voice/prompts.ts`)**:
  - System prompt templates for both Tier 1 Live Voice and Tier 2 Subagent are maintained in a dedicated module.
  - Dynamic runtime temporal anchoring replaces `{current_date}` with the real-time calendar date (`YYYY-MM-DD`) at dispatch time.
  - Prompts clearly differentiate between internal Voice Bridge delegation tools (asynchronous `generate_diagram_and_explanation`, `get_background_task_status` with explicit usage patterns) and client WebMCP tools (`canvas2d_*`, `search_*`, `calculate`, `export_pdf`). The Subagent prompt is purged of circular bridge calls.
- **Background Task Status Tracking in Browser Cache (`src/voice/tasks/taskManager.ts`)**:
  - Background subagent tasks are tracked with `bassistant_task_` IDs and lifecycle states (`queued`, `in_progress`, `completed`, `failed`).
  - Synced to browser `sessionStorage` under `bassistant_background_tasks` (LRU cap of 20 tasks).
  - Gemini Live can inspect task status mid-conversation via the `get_background_task_status` tool to answer user inquiries verbally.
  - The Voice HUD (`VoiceLiveController`) reactively renders an animated status badge (`⚡ Drawing Architecture...`) while a task is in progress.
- **Reliable Session Teardown & Lifecycle State Guarantee**:
  - Stopping the live voice agent explicitly terminates the underlying WebSocket connection (`session.conn.close(1000)`).
  - All asynchronous callback events (`onEnd`, `onTurnComplete`, `onStart`, `onToolCall`) are strictly guarded against an active-session cancellation token (`isSessionActiveRef`), preventing trailing server events from flipping the UI back to `Live Listening` once stopped.
  - In-flight session initialization or microphone startup is immediately aborted if the user cancels during connection.

## States and Boundaries

- **Initial State:** Canvas is blank; chat is blank; file upload shows empty dropzone; theme defaults to selected mode.
- **Onboarding State:** First load (per browser) shows the how-to-use WelcomeModal; dismissing persists the choice, and the sidebar "tips" link re-opens it any time.
- **Document Loaded State:** Upload box reflects file name, page count, and green "Indexed" badge.
- **Document Cleaned State:** Triggered by `clean_document` tool or user action; wipes IndexedDB tables and returns upload box to empty.
- **Error State (File Rejected):** Popup alerts user to size limit (≥ 1MB) or unsupported file type; input resets without crashing.
- **Error State (Blank Export Blocked):** Modal alerts user when attempting to export an empty session without canvas drawings or chat messages.
- **Persistence:** Document chunks and BM25 index persist across sessions in IndexedDB until cleared.

## Product Decisions

- **Framework:** React SPA deployed to Cloudflare Pages for fast, zero-backend, client-side hosting.
- **Parser Choice:** LiteParse (WASM / browser stream decompressor) for local, in-browser document parsing and natural 1:1 per-page chunking (without arbitrary character slicing).
- **Search Paradigm:** BM25 lexical index in IndexedDB with query stop-word removal, keyword guidance, and top-3 page retrieval instead of remote vector embeddings to ensure privacy and low overhead.
- **Canvas Architecture:** Persistent Canvas2D scene graph with perimeter edge-to-edge docking, soft-translucent multi-tier palette, and ASCII topology graph inspection.
- **Reporting:** Client-side `jspdf` report generation packaging canvas diagrams and formatted dialogue.
- **WebMCP Integration:** Standard browser-native WebMCP implementation; no custom in-page inspector UI needed as standard external inspectors and agents interact directly.
- **Chat Protocol:** User prompts prefixed with `user:` and accessible via WebMCP tools so visiting models can understand user intent.
- **Reading Typography:** Lora serif font tuned for longform comfort (17px, line-height 1.75, subtle tracking, 72ch measure) with automatic scrolling to the most recent turn.
- **Search Paradigm Decision:** Keyless Tavily AI search as primary endpoint to provide clean, ranked snippets without HTML noise, backed by DuckDuckGo fallback.
- **Voice Architecture Decision:** Decoupled dual-tier topology (`gemini-3.8-live` audio orchestrator + `gemini-3.5-flash-lite` subagent) prevents audio latency and token bloat during complex diagram generation.
- **Voice Persistence Decision:** Ephemeral spoken chitchat preserves executive clarity in the chat stream; only substantive subagent knowledge is archived into IndexedDB deliberation turns.

## What We're Building
- 20/80 split React single-page application with Light/Dark toggle.
- File upload for Doc/PDF < 1MB with LiteParse WASM parsing, natural per-page chunking, and IndexedDB BM25 indexing.
- HTML canvas with live 2D scene graph engine, Clear button, and Export PDF button.
- Chat stream formatted in Lora longform reading typography, multi-line prompt textarea, and auto-scroll to newest message.
- Keyless Tavily web search with automatic DuckDuckGo fallback.
- Isolated voice module in `src/voice/` featuring `gemini-3.8-live` full-duplex audio, subagent diagram generation, preflight audio modal, and AES-GCM-256 key encryption.
- Long-dwell UI layer: warm token dual themes, onboarding WelcomeModal, chat popup maximize, A-/A+ persisted font steps, reading-progress bar, Session Highlights in sidebar Section 3, thinking pulse, copy/star message actions, drag-over dropzone feedback, and session strip.
- Complete WebMCP tool suite (17 tools).
- Cloudflare Pages deployment configuration.
- Project documentation:
  - Documentation site created via `docs7` skill, updated with `docs/tavily-search.mdx` and dedicated `"Voice Agent"` section with `docs/voice-agent.mdx`.
  - `README.md` for humans.
  - `CLAUDE.md` for AI agents.
  - `AGENTS.md` referencing `CLAUDE.md` and `README.md` (and nothing else).

## Deferred From the POC
- Sidebar Section 3 features (kept blank for now).
- Multi-file collections and files ≥ 1MB.

## Non-Goals
- Server-side database or cloud file processing.
- Direct generative image/video AI APIs (DALL-E, Midjourney, etc.).
- Embedded API key billing or LLM proxy servers (visiting agent drives interactions).

## Open Questions
- None blocking specification. Ready to transition into technical spec (`4-spec`).
