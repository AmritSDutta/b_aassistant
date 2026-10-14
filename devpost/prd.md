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
4. **Agent Connection & Tool Discovery:** A visiting LLM connects to `bAssistant` using standard browser-native WebMCP, discovering the exposed tools without requiring a specialized in-app inspector UI.
5. **Tool Execution:** The visiting LLM queries the user's message history, calls `search_document` (BM25), `search_web` (DDGS), `search_research` (ArXiv), or `calculate` as appropriate.
6. **Multimodal Output:** The visiting LLM streams its written explanation into the 60% chat area and simultaneously calls canvas tools to render live diagrams, graphs, and illustrations on the top 40% canvas.
7. **Canvas & Storage Control:** User or agent can clear the canvas via a UI button or corresponding WebMCP tool. User or agent can execute `clean_document` to wipe stored IndexedDB chunks and reset the upload interface.

## Screens and Layout
Source: `scope.md > Inspiration & Identity`.

A responsive, single-page cockpit filling 100% of the viewport, vertically partitioned:
- **Left Sidebar (20% width):**
  - **Section 1 (Top) — Branding:** App title "bAssistant", logo placeholder, and Light/Dark mode toggle.
  - **Section 2 (Middle) — File Upload:** Dropzone and file picker for Doc/PDF files strictly under 1MB. Status display showing filename, page count, and "Indexed" badge upon processing.
  - **Section 3 (Bottom) — Blank Slot:** Unoccupied workspace reserved for future capabilities.
- **Main Workspace (80% width):**
  - **Top Area (40% height) — HTML Canvas:** Interactive visual display area for programmatic drawing (shapes, lines, graphs, diagrams). Includes UI action buttons (such as "Clear Canvas") that mirror exposed WebMCP tools.
  - **Bottom Area (60% height) — Chat Area:** Scrollable dialogue log displaying `user:` messages and agent responses, with a bottom text input and send button.

## Look and Feel
- **Theme:** Dual-mode theme support (Light and Dark mode) switched via a toggle in the branding header.
- **Style:** Clean, utilitarian cockpit feel with precise panel dividers, high contrast, readable monospaced/sans typography for code and chat, and responsive proportions.
- **Initial Visual State:** Both the HTML canvas and the chat conversation list start completely blank on initial load.

## Features and Behavior

### 1. Document Upload & In-Browser Indexing
Source: `scope.md > The POC Boundary`.
- **Capability:** Ingestion of Doc and PDF files strictly < 1MB.
- **Processing:** Client-side parsing using LiteParse (browser WASM) into page-level chunks.
- **Storage:** Chunks and BM25 search index stored directly in IndexedDB.
- **Feedback:**
  - Valid file: Displays filename, total page count, and "Indexed" confirmation.
  - Invalid file (≥ 1MB or invalid format): Triggers a clear notification popup explaining the exact rejection reason.

### 2. Chat Conversation & History
Source: `scope.md > The Core Loop`.
- **Input:** Bottom text input and send button allowing the user to type messages.
- **Formatting:** User messages are stored and rendered with a `user:` prefix.
- **Retrieval:** Visiting LLM can retrieve previous user messages and conversation context through an exposed WebMCP tool.
- **Streaming/Posting:** Visiting agent can append structured textual explanations directly into the chat stream.

### 3. Live HTML Canvas Rendering
Source: `scope.md > The Unique Kernel`.
- **Drawing Engine:** Executes drawing tool calls from visiting agents to paint diagrams, geometric shapes, flowcharts, graphs, and annotations.
- **Manual Control:** "Clear Canvas" button on the canvas toolbar to wipe drawing; also callable as a WebMCP tool.

### 4. WebMCP Tool Suite
Source: `scope.md > The POC Boundary`.
The application exposes standard WebMCP tools for visiting LLMs:
- `search_web`: Executes web search queries using DuckDuckGo (DDGS).
- `search_research`: Executes academic literature searches via ArXiv.
- `calculate`: Evaluates decimal math expressions.
- `search_document`: Searches ingested document chunks in IndexedDB using the BM25 index.
- `clean_document`: Purges stored document chunks from IndexedDB and resets upload section.
- `get_chat_history`: Returns chat messages including `user:` prefixed prompts.
- `canvas_draw`: Primitives to draw lines, rectangles, circles, text, and chart elements on the HTML canvas.
- `canvas_clear`: Clears the canvas (mirrors UI button).
- `chat_post`: Appends or streams text into the chat stream.

## States and Boundaries

- **Initial State:** Canvas is blank; chat is blank; file upload shows empty dropzone; theme defaults to selected mode.
- **Document Loaded State:** Upload box reflects file name, page count, and green "Indexed" badge.
- **Document Cleaned State:** Triggered by `clean_document` tool or user action; wipes IndexedDB tables and returns upload box to empty.
- **Error State (File Rejected):** Popup alerts user to size limit (≥ 1MB) or unsupported file type; input resets without crashing.
- **Persistence:** Document chunks and BM25 index persist across sessions in IndexedDB until cleared.

## Product Decisions

- **Framework:** React SPA deployed to Cloudflare Pages for fast, zero-backend, client-side hosting.
- **Parser Choice:** LiteParse (WASM / browser stream decompressor) for local, in-browser document parsing and natural 1:1 per-page chunking (without arbitrary character slicing).
- **Search Paradigm:** BM25 lexical index in IndexedDB with query stop-word removal, keyword guidance, and top-3 page retrieval instead of remote vector embeddings to ensure privacy and low overhead.
- **WebMCP Integration:** Standard browser-native WebMCP implementation; no custom in-page inspector UI needed as standard external inspectors and agents interact directly.
- **Chat Protocol:** User prompts prefixed with `user:` and accessible via WebMCP tools so visiting models can understand user intent.
- **Reading Typography:** Lora serif font tuned for longform comfort (17px, line-height 1.75, subtle tracking, 72ch measure) with automatic scrolling to the most recent turn.

## What We're Building
- 20/80 split React single-page application with Light/Dark toggle.
- File upload for Doc/PDF < 1MB with LiteParse WASM parsing, natural per-page chunking, and IndexedDB BM25 indexing.
- HTML canvas with live drawing engine and Clear button.
- Chat stream formatted in Lora longform reading typography, multi-line prompt textarea, and auto-scroll to newest message.
- Complete starting WebMCP tool suite (`search_web`, `search_research`, `calculate`, `search_document` [returning top 3 pages with stop-word stripping], `clean_document`, canvas drawing/clearing, chat tools).
- Cloudflare Pages deployment configuration.
- Project documentation:
  - Documentation site created via `docs7` skill.
  - `README.md` for humans.
  - `CLAUDE.md` for AI agents.
  - `AGENTS.md` referencing `CLAUDE.md` and `README.md` (and nothing else).

## Deferred From the POC
- Sidebar Section 3 features (kept blank for now).
- Canvas export options (PNG/SVG downloads).
- Multi-file collections and files ≥ 1MB.

## Non-Goals
- Server-side database or cloud file processing.
- Direct generative image/video AI APIs (DALL-E, Midjourney, etc.).
- Embedded API key billing or LLM proxy servers (visiting agent drives interactions).

## Open Questions
- None blocking specification. Ready to transition into technical spec (`4-spec`).
