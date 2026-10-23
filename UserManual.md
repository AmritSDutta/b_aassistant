# bAssistant User Manual

> *"Enough is as good as a feast."*  
> Welcome to **bAssistant**, an LLM-agnostic, zero-backend assistant cockpit built for students, teachers, technologists, and science geeks. bAssistant pairs an interactive Canvas2D diagramming studio with an ergonomic conversational reader, running 100% inside your local browser.

---

## Table of Contents
1. [Cockpit Overview & Layout](#1-cockpit-overview--layout)
2. [Quickstart: Launching the App](#2-quickstart-launching-the-app)
3. [Connecting Visiting AI Agents (WebMCP)](#3-connecting-visiting-ai-agents-webmcp)
4. [Document Ingestion & Private Search](#4-document-ingestion--private-search)
5. [Managing Reference URLs](#5-managing-reference-urls)
6. [Interactive Canvas2D Diagram Studio](#6-interactive-canvas2d-diagram-studio)
7. [Bidirectional Live Voice Mode (Gemini Live)](#7-bidirectional-live-voice-mode-gemini-live)
8. [Conversational Reader & Highlights](#8-conversational-reader--highlights)
9. [Session Vault & Multi-Turn Persistence](#9-session-vault--multi-turn-persistence)
10. [Exporting Publication-Ready PDF Reports](#10-exporting-publication-ready-pdf-reports)
11. [Source & Inspection Protection](#11-source--inspection-protection)
12. [Troubleshooting & FAQs](#12-troubleshooting--faqs)

---

## 1. Cockpit Overview & Layout

bAssistant is structured as an ergonomic **20/80 dual-zone cockpit**:

```
+---------------------+-------------------------------------------------------+
| 20% Sidebar         | 80% Primary Workspace                                |
|                     |                                                       |
| [Logo] [Tips]       | [Canvas2D Studio (Top 60%)]                           |
| [🎙️ Voice] [Theme]  | Live interactive architecture diagrams, flowcharts,  |
|                     | containers, and connectors drawn by visiting AI       |
| [Document Upload]   | [Fit View] [Reset] [New Session] [Export PDF]         |
| (< 2MB Doc/Text)    +-------------------------------------------------------+
|                     | [Dialogue Reader (Bottom 40%)]                        |
| [Reference URLs]    | Header: [Voice HUD: Mic, Status, Captions, Settings]  |
| (Up to 10 links)    | Conversational dialogue stream (user: prefixing)      |
|                     | [A-] [A+] [Maximize Reader]                           |
| [Session Highlights]|                                                       |
| Starred takeaways   | [Message Input Field: Ask questions...]               |
|                     |                                                       |
| [Session Vault strip|                                                       |
+---------------------+-------------------------------------------------------+
```

- **Top-Left Header**: Dynamic theme-aware branding logo, and a 2-tiered right-aligned action cluster with Tier 1 utility buttons (`[ tips ]`, `[ 🎙️ voice ]`, `[ ☀ light / ☾ dark ]`) and a Tier 2 long single `[ ⚙️ user preferences ]` button.
- **Left Sidebar**: Document uploader, external reference links manager, session star repository, and sessions archive footer.
- **Main Area**: Top 60% HTML5 Canvas2D studio and bottom 40% readable chat area with font sizing, reading progress tracking, and docked Voice Live Controller HUD.

---

## 2. Quickstart: Launching the App

### Option A: Hosted on Cloudflare Pages
Visit the live deployment in any modern browser (Chrome, Edge, Firefox, Safari):
```
https://bassistant.pages.dev/
```

### Option B: Running Locally
1. Clone the repository:
   ```bash
   git clone https://github.com/AmritSDutta/b_aassistant.git
   cd b_aassistant
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Open `http://localhost:5173` in your browser.

---

## 3. Connecting Visiting AI Agents (WebMCP)

bAssistant is **LLM-agnostic**. It does not lock you into any paid backend subscription; instead, you bring your own visiting AI model or agent harness using the open WebMCP standard.

### How External Agents Connect
bAssistant automatically registers a multi-standard WebMCP provider on four global surfaces:
1. `document.modelContext`
2. `navigator.modelContext`
3. `window.webmcp`
4. `postMessage` JSON-RPC 2.0 (for iframes and browser extensions)

### 19 Built-In WebMCP Tools Available to Your Agent
| Tool Name | Category | Purpose |
| :--- | :--- | :--- |
| `get_tool_usage_prompt` | Core | Returns operating instructions for visiting AI agents. |
| `get_reference_url` | Context | Fetches up to 10 stored reference URLs added by the user. |
| `get_user_preferences` | Context | Fetches up to 10 user preference strings (max 120 chars each) for custom guidelines. |
| `get_current_time` | Context | Returns the user's current local date, weekday, time, timezone, and ISO timestamp. |
| `search_document` | Documents | Queries uploaded PDF/DOCX/TXT/MD chunks using client-side BM25. |
| `clean_document` | Documents | Clears active document chunks from IndexedDB. |
| `canvas2d_draw_shapes` | Canvas | Appends structured shapes (`rectangle`, `ellipse`, `diamond`, `text`, `sticker`) and perimeter-docked arrows. |
| `canvas2d_inspect_shapes`| Canvas | Returns active scene graph and ASCII topology tree. |
| `canvas2d_modify_shape` | Canvas | Surgically updates shape text, position, or color in-place. |
| `canvas2d_clear` | Canvas | Resets the 2D scene graph. |
| `search_web` | Research | Keyless Tavily AI search as primary with automatic DuckDuckGo fallback. |
| `search_research` | Research | ArXiv scientific paper search. |
| `calculate` | Math | Decimal-safe arithmetic calculation. |
| `export_pdf` | Reports | Triggers publication-quality PDF report download. |
| `chat_post` | Chat | Posts agent's answers into the dialogue reader. |
| `get_chat_history` | Chat | Reads past dialogue history turns. |
| `canvas_draw` | Legacy Canvas | Quick sketch draw operations. |
| `draw_diagram` | Legacy Canvas | Flat diagram layout drawing. |
| `canvas_clear` | Legacy Canvas | Clears flat canvas pixels. |

### Testing via WebMCP Inspector
1. Install the Chrome **WebMCP Inspector** extension.
2. Open bAssistant and navigate to the WebMCP Inspector tab in Chrome DevTools.
3. You will see all 19 tools listed. You can invoke them manually or attach your LLM API key directly in the extension to let your model explore and draw live.

### First Instruction to Give Your Agent (Copy–Paste)
Paste this as the opening prompt of a new session:

> Call `get_tool_usage_prompt` first and follow it exactly — do not answer or draw until you have.

That tool returns the full operating prompt, which already contains the drawing contract (every shape needs a `type`; connectors use `startId`/`endId` matching node `id`s) and the verify-with-`canvas2d_inspect_shapes` step — so you never duplicate those rules here.

> **Why:** an agent that skips the guide and omits `type` produces arrows with no node boxes ("0 nodes, 4 connectors").

---

## 4. Document Ingestion & Private Search

bAssistant allows you to upload reference documents for private query and analysis.

1. **Size Limit**: Accepts files **under 2MB strictly** (`.pdf`, `.docx`, `.doc`, `.txt`, `.md`). Oversized files trigger an immediate rejection notification.
2. **Zero Server Footprint**: Parsing is executed 100% in-browser using `@llamaindex/liteparse-wasm` with fallback decompressor streams that handle raw hex tokens (`<...> Tj` and `[...] TJ`). No document bytes leave your computer.
3. **BM25 Search Indexing**: Extracted pages are broken into chunks, filtered of stop-words, and stored into browser **IndexedDB**.
4. **Agent Querying**: Visiting agents query documents with targeted keywords via the `search_document` tool, which returns the top 3 ranked pages with relevance scores.

---

## 5. Managing Reference URLs

Ground your visiting AI model with up to 10 live documentation links or reference articles:

1. In the sidebar under **Reference URLs**, paste any HTTP/HTTPS URL into the input field and click **Add**.
2. bAssistant probes the URL with a single cross-origin (`no-cors`) GET request bounded by a 5-second timeout before caching it.
3. Visiting agents invoke `get_reference_url` to read your stored links and tailor their research.
4. Click the **×** button beside any link to remove it from your session.

### 5.1 User Preferences Engine
Define custom stylistic, architectural, and formatting preferences for your AI assistant:
1. Click the `[ ⚙️ user preferences ]` button in the cockpit header to open the **User Preferences** modal.
2. Enter any custom instruction (e.g., *"Always format diagram nodes in pastel blue"*, *"Highlight security bottlenecks in red"*).
3. **Capacity & Length Rules**: Enforces up to **10 preferences**, each capped at **120 characters**, with live character count indicators (`X / 120`) and remaining slot tracking.
4. **Subagent & WebMCP Integration**:
   - Injected automatically into Tier 2 subagent system prompts during diagram generation.
   - Available to visiting external AI models via the read-only WebMCP tool `get_user_preferences` (returns `string[]`).
5. Persisted securely in client browser storage (`localStorage['b_user_preferences']`).

---

## 6. Interactive Canvas2D Diagram Studio

The top 60% workspace is a high-performance Canvas2D scene graph engine designed for visual thinking.

- **Panning**: Click and drag with your mouse anywhere on the canvas to pan across large architecture maps.
- **Zooming**: Use your mouse wheel to zoom in and out smoothly around your cursor position.
- **Fit View**: Click the **Fit View** button in the canvas toolbar to automatically center all nodes with comfortable padding.
- **Reset**: Click **Reset** to return zoom to 100% and center coordinates at origin.
- **Clear**: Clears the current canvas drawing.
- **High-Contrast Labels**: Nodes feature universal amber accent pills (`#d97706` bold text) anchored at `topCenter` ensuring crisp readability in both light and dark modes.

---

## 7. Bidirectional Live Voice Mode (Gemini Live)

bAssistant features a real-time, low-latency conversational voice assistant powered by Google's Gemini Multimodal Live API over WebSockets, orchestrated through a **Two-Tier Architecture**.

### 7.1 Two-Tier System Architecture
- **Tier 1: Conversational Live Agent** (`gemini-3.8-live` by default; fallbacks `gemini-2.5-flash-native-audio-preview-12-2025` or `gemini-3.1-flash-live-preview`)  
  Streams bidirectional 16kHz PCM audio directly to and from your browser microphone and speakers. It listens, reasons, interrupts naturally, and responds with spoken explanations in milliseconds.
- **Tier 2: General-Purpose Subagent (Specialization: Tech Product Architecture)**  
  A versatile autonomous background subagent specialized in architecting tech products, distributed systems, and technical workflows. When you ask for an architecture diagram, flowchart, or deep technical design, Tier 1 delegates the task via `generate_diagram_and_explanation` and immediately acknowledges verbally (*"I'm drawing that architecture on the canvas for you now..."*). Tier 2 renders the Canvas2D shapes, arranges nodes and perimeter-docked connectors, and writes the complete structured breakdown into the dialogue reader.

### 7.2 Multi-Provider Tier 2 Subagent Suite
bAssistant decouples the visual diagramming engine from any single vendor. You can choose from five subagent provider backends in Voice Settings:

1. **Google Gemini (`gemini`)**:
   - Direct client-side SDK integration via `@google/genai`.
   - Toggle *"Use Tier 1 Gemini API Key"* to reuse your live voice key or supply a dedicated subagent key.
   - Recommended presets: `gemini-3.5-flash-lite` (Recommended), `gemini-3.1-flash-lite`, `gemini-2.5-flash`.
2. **OpenAI (`openai`)**:
   - Frontier reasoning and compact models routed via same-origin `/api/proxy` to eliminate browser CORS blocks.
   - Recommended presets: `gpt-6-luna` (Default frontier reasoning subagent), `gpt-5-nano` (Fast compact subagent).
3. **Requesty AI (`requesty`)**:
   - Unified high-speed AI router with Base URL `https://router.requesty.ai/v1` (auto-mapped to `/chat/completions`).
   - Direct browser CORS enabled with automatic same-origin `/api/proxy` fallback.
   - Cloudflare Pages CSP in `public/_headers` explicitly allows `https://router.requesty.ai` and `https://*.requesty.ai`.
   - Curated presets: `google/gemma-4-31b-it` (Default dense multimodal and structured engine), `nvidia/muse-glimmer-30b` (Superior synthesis & architecture).
4. **Mistral AI (`mistral`)**:
   - Frontier European models with deep coding and system reasoning intelligence.
   - Routed through the same-origin `/api/proxy` to eliminate browser CORS preflight errors.
   - Recommended presets: `ministral-14b-2512` (Default dense subagent), `ministral-8b-2512`, `ministral-3b-2512`.
5. **Ollama Cloud / Local (`ollama`)**:
   - Remote cloud API endpoint `https://ollama.com/api` (routed via `/api/proxy`) or local Ollama daemon (`http://localhost:11434/api/chat`).
   - Recommended presets: `gemma4:31b-cloud` (Default), `nemotron-3-super:cloud`, `nemotron-3-nano:30b-cloud`, `beam:cloud`.
6. **⚙️ Custom Model IDs**:
   - Select **⚙️ Custom Model ID...** in the model dropdown to specify any model identifier supported by your chosen provider (e.g., `meta-llama/llama-3.3-70b-instruct`).

### 7.3 Interactive Connection Preflight (`⚡ Run Quick Test`) & Save Gating
To prevent runtime diagramming failures due to mistyped keys or endpoint typos, Voice Settings enforces an interactive preflight protocol:
1. **Live In-Memory Probe**: When you enter or update an API key, click **⚡ Run Quick Test**.
2. **Ping Verification**: bAssistant dispatches a lightweight probe to verify authentication, network access, and model availability.
3. **Save Gating**: If changes are made to API keys or providers, the **Save Settings** button requires a successful quick test before persisting, preventing broken background states.

### 7.4 Configuration & Client-Side Encryption
1. Click the `[ 🎙️ voice ]` button in the cockpit header or the settings gear in the Voice HUD.
2. Enter your Google Gemini API key for Tier 1.
3. Select your preferred voice persona (`Puck`, `Charon`, `Kore`, `Fenrir`, or `Aoede`).
4. Choose your Tier 2 Subagent Provider, model preset, and subagent API key.
5. **Zero-Knowledge Encryption**: Your Tier 1 Gemini API key is encrypted directly in your browser using **Web Crypto AES-GCM-256** with an ephemeral salt and saved into IndexedDB (`bassistant_secure_vault`). It is never stored in plaintext `localStorage`, never logged, and never transmitted to any proxy. Subagent provider keys are securely stored in local storage (`bassistant_openai_api_key`, `bassistant_requesty_api_key`, `bassistant_mistral_api_key`, `bassistant_ollama_api_key`).

### 7.5 Starting a Voice Session & Preflight Audio Check
1. Click the microphone icon in the Voice HUD docked in the dialogue reader header (or the header shortcut).
2. **Automated Preflight Check**: bAssistant runs a 1-second microphone calibration test:
   - Verifies browser audio permissions.
   - Measures ambient audio level.
   - Alerts you immediately if the microphone is muted or disconnected before initiating the WebSocket stream.
3. Once connected, the HUD status turns green: **Live Listening**.

### 7.6 Spoken Commands & Background Diagram Dispatch
You can talk to bAssistant conversationally just like a pair programmer:
- *"Explain the trade-offs between REST and gRPC."* &rarr; Live spoken conversational answer.
- *"Draw an event-driven architecture with Kafka, order service, payment service, and notification service."* &rarr; Tier 1 issues immediate verbal acknowledgment, while Tier 2 renders the full diagram onto the Canvas2D studio and writes structured notes into chat.
- *"What is the status of my diagram?"* &rarr; The live model checks active background tasks via `get_background_task_status` and updates you verbally.
- *"Search the latest docs for Vite 6 features."* &rarr; Tier 1 uses `search_web` (Tavily/DuckDuckGo) and summarizes key insights.

### 7.7 Voice HUD & Background Task Status
The docked Voice HUD keeps you informed without obstructing your workspace:
- **Status Indicator**: Displays real-time states (`Standby`, `Connecting...`, `Live Listening`, `Thinking...`, `Speaking`).
- **Live Activity Badge**: When background rendering or searching is underway, an animated badge appears (e.g., `⚡ Drawing Architecture...`).
- **Ephemeral Captions**: Transcribes incoming model speech in the HUD without polluting your persistent session chat history with transient spoken chitchat.
- **Task Cache Tracking**: Background operations are tracked in `sessionStorage` (`bassistant_background_tasks`, per-tab, capped at 20 records) so task progress survives transient state changes.

### 7.8 Clean Disconnect & Teardown
- Click the active microphone button in the HUD to end the call.
- The WebSocket connection closes cleanly (status code 1000), microphone audio tracks are released immediately, and the status returns to `Standby`.

---

## 8. Conversational Reader & Highlights

The bottom 40% dialogue stream features long-dwell reading ergonomics:

- **Typography**: Set in *Lora* with comfortable line spacing (1.75) and humanized Markdown formatting (syntax asterisks and raw tags are cleanly formatted).
- **Font Resizing**: Click **A-** or **A+** in the reader toolbar to scale font sizes across 15px, 17px, and 19px. Your choice is persisted in `localStorage`.
- **Zen Full-Screen Reader**: Click the expand icon (⤢) to open the chat stream in an uninterrupted full-screen reading overlay. Press `Esc` or click the compress icon to return.
- **Reading Progress Bar**: A subtle 2px accent progress bar tracks scroll depth through long deliberation logs.
- **Session Highlights (Starring)**:
  - Hover any chat message and click the star icon (**☆**).
  - Starred takeaways collect instantly in the sidebar under **Session Highlights**.
  - Clicking any highlight in the sidebar jumps directly to that message in the dialogue.
- **One-Click Copy**: Hover any turn and click `copy` to copy clean text into your clipboard.

---

## 9. Session Vault & Multi-Turn Persistence

bAssistant preserves your complete deliberation state across page reloads:

- **Automatic Persistence**: Every conversational turn, user prompt, AI response, and canvas scene graph snapshot is recorded in browser IndexedDB.
- **Accidental Tab Close / Reload**: Reopening the page automatically rehydrates your dialogue messages, active document, and canvas scene.
- **New Session**: Click **New Session** on the canvas toolbar to start a fresh discussion without losing past archives.
- **Session Vault Modal**:
  - Click `sessions` in the sidebar bottom strip.
  - Browse past sessions, see message and turn counts, restore previous conversations, export past session PDFs, or delete old sessions.

---

## 10. Exporting Publication-Ready PDF Reports

Export comprehensive, turn-by-turn executive reports directly from the client:

1. Click **Export PDF** in the canvas toolbar.
2. **Blank Session Protection**: If both the canvas and chat are empty, bAssistant blocks the download with a helpful prompt: *"Cannot export a blank session. Please draw a diagram or post a chat message first."*
3. **Executive Report Structure**:
   - **Header**: Official bAssistant branding logo and generation timestamp.
   - **Visual Snapshot**: High-resolution, aspect-ratio-contained render of the Canvas2D diagram.
   - **Turn-by-Turn Dialogue**: Sequential turns with chronological badges, user prompts, per-turn canvas snapshots, and AI responses.
   - **Multilingual Support**: Offscreen rendering strips properly shape complex Indic scripts (Bengali বাংলা and Hindi हिन्दी).
   - **Mandatory AI Disclaimer**: Every page includes the verified compliance footer:
     > *"AI generated analysis, verify before applying."*

---

## 11. Source & Inspection Protection

To provide distraction-free usage and safeguard application layout integrity, bAssistant includes client-side protection:
- **Right-Click**: Disables the default browser context menu.
- **F12**: Prevents the Developer Tools shortcut key.
- **Inspection Shortcuts**: Disables `Ctrl + Shift + I`, `Ctrl + Shift + J`, and `Ctrl + Shift + C` (or `Cmd + Option` on macOS).
- **View Source / Save**: Disables `Ctrl + U` (View Page Source) and `Ctrl + S` (Save Page).

---

## 12. Troubleshooting & FAQs

### Q: Why did my document upload fail?
- **File size**: Ensure your file is strictly **under 2MB**.
- **Format**: Accepted formats are `.pdf`, `.docx`, and `.doc`.
- **Scanned images**: bAssistant extracts natural text and XML tokens; scanned image-only PDFs without OCR layers cannot be tokenized by BM25.

### Q: Where are my documents, voice keys, and chats stored?
All data stays 100% inside your browser's local storage: the IndexedDB database **`bAssistantDB`** (documents, chunks, BM25 index, session turns, active session id) and **`bassistant_secure_vault`** (encrypted voice-key material), plus `sessionStorage` for per-tab background task state. No server receives your documents, chat prompts, API keys, or canvas diagrams.

### Q: How does Web Search work without an API key?
bAssistant's `search_web` tool leverages keyless Tavily AI extraction as its primary engine, backed by automated DuckDuckGo fallback. You do not need to configure any search credentials.

### Q: Why does Live Voice Mode need a Gemini API Key?
Live Voice Mode establishes a direct, ultra-low latency WebSocket stream directly from your browser to Google's Gemini Multimodal Live API (`wss://generativelanguage.googleapis.com`). Because bAssistant has zero backend servers, your personal key authorizes the stream directly from your client. It is encrypted in IndexedDB using AES-GCM-256 and never leaves your browser.

### Q: Why doesn't the voice model read long code or markdown aloud?
To prevent auditory fatigue, bAssistant's two-tier design instructs Tier 1 (Voice) to give concise spoken answers and immediately delegate architectural diagrams and comprehensive technical notes to Tier 2 (Visual Subagent). Detailed structured text is posted directly to the dialogue reader while you continue talking.

### Q: What if the voice status stays on "Connecting..." or fails?
1. Verify that your Gemini API key is valid and has Multimodal Live API access enabled in Google AI Studio.
2. Check your browser microphone permissions for `bassistant.pages.dev` or `localhost`.
3. If your microphone was muted or in use by another app, close other meeting tabs and reconnect.

### Q: How do I reopen the onboarding guide?
Click the `[ tips ]` button in the top-left cockpit header beside the theme toggle at any time.

---

*bAssistant is released under the strong copyleft **GNU General Public License v3.0 (GPL-3.0)**.*
