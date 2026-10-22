# bAssistant — The Local AI Business Analyst Cockpit

**bAssistant** is an entirely client-side, zero-backend workspace that transforms your browser into an intelligent Business Analyst workstation. It pairs with modern AI models and browser WebMCP agents to inspect requirements, ingest architecture documents, visually map systems onto a dynamic canvas, and export boardroom-ready reports — without your data ever leaving your machine.

> **Out of Scope for this iteration:**
> 1. **External backend MCP servers** (client operates 100% in-browser via WebMCP protocols without external backend SSE/stdio MCP servers).
> 2. **Arbitrary video/image file ingestion** (processing focuses on text documents, web references, and real-time live voice audio).

---

## Why bAssistant?

- 🔒 **100% Private & Local**: Uploaded documents never travel to an external server. Parsing and BM25 search happen directly in browser memory and local IndexedDB.
- 🎙️ **Full-Duplex Live Voice & Multi-Provider Subagents**: Bidirectional 16kHz conversational audio powered by Gemini Live, paired with an asynchronous Tier 2 subagent suite (Google Gemini, Requesty AI, Mistral AI, Ollama Cloud) specializing in tech product architecture and real-time Canvas2D diagramming.
- 📐 **60/40 Split Cockpit**: Designed for visual thinkers. The dominant 60% HTML5 Canvas renders architecture diagrams in real time, while the 40% Chat Area maintains a humanized conversational stream.
- 🎨 **Persistent Canvas Scene Graph**: Visuals are structured entities (rectangles, containers, connectors with perimeter docking, step cards), not ephemeral pixel dumps.
- 📄 **Multilingual PDF Export**: Export session artifacts into a styled dual-section PDF (HiDPI canvas snapshot + readable discussion transcript) with native font rendering for English, Bengali (বাংলা), and Hindi (हिन्दी) with complete H1–H6 heading hierarchy formatting.
- 🧹 **Humanized Conversation**: Raw LLM markdown noise (asterisks, stray formatting markers, LaTeX math arrows like `$\rightarrow$`, and `####` to `######` headings) is parsed and formatted automatically into executive typography and clean subheadings.
- 🛋️ **Built for long sessions**: Warm paper/ink dual themes with real-time DOM contrast synchronization via `MutationObserver`, a first-load how-to-use popup, a full-screen chat reader mode, A-/A+ font steps, reading-progress bar, and star highlights collected in the sidebar — all motion disabled under `prefers-reduced-motion`.
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
- Modern Web Browser — developed and tested on Chrome as of now

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
# Run all 226 isolated unit tests (32 Vitest suites, no watch mode)
npm.cmd test -- --run

# Build production bundle (tsc && vite build)
npm.cmd run build
```

To validate the docs site, see the "Documentation" section below.

### Connecting a Visiting AI Agent (First Prompt)
Start every new agent session with this one instruction:

> Call `get_tool_usage_prompt` first and follow it exactly — do not answer or draw until you have.

The guide it returns is the full operating prompt — the tool index, the shape `type` contract, the connector `startId`/`endId` rules, and the verify-with-`canvas2d_inspect_shapes` step — so those rules live in the prompt itself, not your opening message.

---

## Documentation

Full architectural and developer specifications built with `docs7` are located in `docs/`:
- `docs/index.mdx` — Overview, key features & codebase tree
- `docs/quickstart.mdx` — Install, run locally, and connect a visiting agent
- `docs/indroduction.mdx` — Project story, philosophy, challenges & roadmap
- `docs/architecture.mdx` — Zero-backend cockpit data flow & core subsystems
- `docs/cockpit-ui.mdx` — 20/80 analyst cockpit, warm themes, Zen reader & long-dwell ergonomics
- `docs/webmcp.mdx` — WebMCP provider surfaces & the 17 registered tools
- `docs/agent-guide.mdx` — The operating contract returned by `get_tool_usage_prompt`
- `docs/canvas-and-pdf.mdx` — Canvas2D scene graph engine & multilingual PDF export
- `docs/document-processing.mdx` — Zero-backend LiteParse WASM & BM25 indexing
- `docs/research-tools.mdx` — Tavily/DuckDuckGo web search, ArXiv, and decimal calculator tools
- `docs/tavily-search.mdx` — Keyless Tavily web search with DuckDuckGo fallback
- `docs/sessions-vault.mdx` — Session vault, IndexedDB persistence & restore-on-mount
- `docs/voice-agent.mdx` — Full-duplex Gemini Live voice mode & two-tier agent topology
- `docs/subagent-providers.mdx` — Multi-provider Tier 2 subagents (Requesty AI, Mistral, Ollama, Gemini)
- `docs/storage-keys.mdx` — Browser storage key registry (LocalStorage & IndexedDB)
- `docs/background-tasks.mdx` — Asynchronous subagent task dispatch, TaskManager cache & status tool
- `docs/dwell-time-research.mdx` — Evidence-backed long-dwell UI design mechanisms
- `docs/liteparse-research.mdx` — In-browser document parsing research & benchmarks
- `docs/learnings.mdx` — Engineering learnings: WebMCP discovery, Indic PDF, WASM isolation
- `docs/source-protection.mdx` — Client-side inspection-deterrent behaviors
- `docs/deployment.mdx` — CI workflow & Cloudflare Pages hosting
- `docs/license.mdx` — AGPL-3.0-or-later licensing terms

To preview documentation locally:
```bash
npx docs7 dev docs
```

---

## User Manual

For an end-to-end operational guide covering cockpit navigation, document uploads, WebMCP agent connection, canvas controls, session management, and PDF exports, see:

📖 **[UserManual.md](UserManual.md)**

---

## License

**AGPL-3.0-or-later**

> *Strong copyleft software. If you use, modify, or build on any part of this codebase, the AGPL requires your derivative work to be released as open source under the same license.*

See the [LICENSE](LICENSE) file for complete terms and conditions.

