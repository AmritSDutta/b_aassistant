# bAssistant — The Local AI Business Analyst Cockpit

**bAssistant** is an entirely client-side, zero-backend workspace that transforms your browser into an intelligent Business Analyst workstation. It pairs with modern AI models and browser WebMCP agents to inspect requirements, ingest architecture documents, visually map systems onto a dynamic canvas, and export boardroom-ready reports — without your data ever leaving your machine.

> **Out of Scope for this iteration:**
> 1. **MCP server endpoint integration** (client operates 100% in-browser via WebMCP protocols without external backend SSE/stdio MCP servers).
> 2. **Image, audio, or video data integration** (processing is focused exclusively on text documents and web references).

---

## Why bAssistant?

- 🔒 **100% Private & Local**: Uploaded documents never travel to an external server. Parsing and BM25 search happen directly in browser memory and local IndexedDB.
- 📐 **60/40 Split Cockpit**: Designed for visual thinkers. The dominant 60% HTML5 Canvas renders architecture diagrams in real time, while the 40% Chat Area maintains a humanized conversational stream.
- 🎨 **Persistent Canvas Scene Graph**: Visuals are structured entities (rectangles, containers, connectors with perimeter docking, step cards), not ephemeral pixel dumps.
- 📄 **Multilingual PDF Export**: Export session artifacts into a styled dual-section PDF (HiDPI canvas snapshot + readable discussion transcript) with native font rendering for English, Bengali (বাংলা), and Hindi (हिन्दी).
- 🧹 **Humanized Conversation**: Raw LLM markdown noise (asterisks, stray formatting markers) is cleaned automatically for high-signal reading.
- 🛋️ **Built for long sessions**: Warm paper/ink dual themes, a first-load how-to-use popup, a full-screen chat reader mode, A-/A+ font steps, reading-progress bar, and star highlights collected in the sidebar — all motion disabled under `prefers-reduced-motion`.
- 🌐 **WebMCP Standard**: Built on the open WebMCP standard with 17 in-browser tools enabling any compatible AI extension or runtime to read docs, draw diagrams, calculate metrics, and search public research — including a read-only `get_tool_usage_prompt` tool that hands visiting agents the full operating guide.

---

## The Cockpit Experience

```
+------------------------------------------------------------------------------------+
| SIDEBAR (20%)   | WORKSPACE (80%)                                                 |
|                 |                                                                  |
| [bAssistant]    | +--------------------------------------------------------------+ |
| Theme Toggle    | | CANVAS2D SCENE GRAPH (60% Height)                           | |
|                 | |                                                              | |
| [Drop File]     | |  [Client App] -----> [WebMCP Bridge] -----> [IndexedDB]     | |
| (<2MB Doc/PDF)  | |                                                              | |
|                 | +--------------------------------------------------------------+ |
| [Export PDF]    | | CHAT STREAM (40% Height)                                     | |
| (Multilingual)  | |                                                              | |
|                 | | User: Outline the system architecture                        | |
|                 | | Assistant: Here is the interactive system diagram...         | |
|                 | +--------------------------------------------------------------+ |
+------------------------------------------------------------------------------------+
```

---

## User Journey: How to Use bAssistant

### 1. Ingest Your Business Documents
Click or drag a file (`.pdf`, `.docx`, `.doc` up to 2MB) into the sidebar uploader. bAssistant leverages in-browser WebAssembly (`@llamaindex/liteparse-wasm` and browser stream decompilation) to extract text and build an in-memory BM25 index within seconds.

### 2. Collaborate with Your AI Assistant
Chat naturally in the bottom stream. When you ask questions like *"What are the data flow bottlenecks in the document?"* or *"Map out the microservices"*:
- The assistant retrieves authentic text chunks from local storage.
- The assistant draws structured components, containers, and connected flows directly on the top canvas.

### 3. Read Clean, Humanized Responses
No more messy raw asterisks or unformatted lists. The chat area formats bullet points, key takeaways, and numbered recommendations with executive typography.

### 4. Export Executive Session Reports
Click **Export PDF** in the sidebar (or ask the assistant to generate one). bAssistant validates the session content, captures a crisp 2x HiDPI snapshot of your canvas diagram, compiles the conversation transcript, and delivers a professional PDF. Multilingual Bengali and Hindi text are faithfully preserved with complex script font-shaping.

---

## Quickstart

### Prerequisites
- Node.js 20+
- Modern Web Browser (Chrome, Edge, Firefox, Brave)

### Run Locally
```bash
# 1. Clone repository and install dependencies
npm.cmd install

# 2. Launch Vite development server
npm.cmd run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Hermetic Verification
```bash
# Run all 93 isolated unit tests
npm.cmd test -- --run

# Validate documentation strict-mode syntax
node C:\Users\amrit\.gemini\config\skills\docs7\scripts\validate_docs7.mjs docs

# Build production bundle
npm.cmd run build
```

---

## Documentation

Full architectural and developer specifications built with `docs7` are located in `docs/`:
- `docs/index.mdx` — Architecture overview & codebase tree
- `docs/canvas-and-pdf.mdx` — Canvas2D scene graph engine & multilingual PDF export
- `docs/architecture.mdx` — Browser cockpit data flow & subsystem communication
- `docs/webmcp.mdx` — WebMCP provider specifications & 17 registered tools
- `docs/document-processing.mdx` — Zero-backend LiteParse WASM & BM25 indexing
- `docs/liteparse-research.mdx` — In-browser document parsing research & benchmarks
- `docs/learnings.mdx` — Practical findings & hackathon development lessons

To preview documentation locally:
```bash
npx docs7 dev docs
```
