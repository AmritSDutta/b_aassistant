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
7. [Conversational Reader & Highlights](#7-conversational-reader--highlights)
8. [Session Vault & Multi-Turn Persistence](#8-session-vault--multi-turn-persistence)
9. [Exporting Publication-Ready PDF Reports](#9-exporting-publication-ready-pdf-reports)
10. [Source & Inspection Protection](#10-source--inspection-protection)
11. [Troubleshooting & FAQs](#11-troubleshooting--faqs)

---

## 1. Cockpit Overview & Layout

bAssistant is structured as an ergonomic **20/80 dual-zone cockpit**:

```
+---------------------+-------------------------------------------------------+
| 20% Sidebar         | 80% Primary Workspace                                |
|                     |                                                       |
| [Logo] [Tips] [Theme| [Canvas2D Studio (Top 60%)]                           |
|                     | Live interactive architecture diagrams, flowcharts,  |
| [Document Upload]   | containers, and connectors drawn by visiting AI       |
| (< 2MB PDF/DOCX)    | [Fit View] [Reset] [New Session] [Export PDF]         |
|                     +-------------------------------------------------------+
| [Reference URLs]    | [Dialogue Reader (Bottom 40%)]                        |
| (Up to 10 links)    | Conversational dialogue stream (user: prefixing)      |
|                     | [A-] [A+] [Maximize Reader]                           |
| [Session Highlights]|                                                       |
| Starred takeaways   | [Message Input Field: Ask questions...]               |
|                     |                                                       |
| [Session Vault strip|                                                       |
+---------------------+-------------------------------------------------------+
```

- **Top-Left Header**: Dynamic theme-aware branding logo, `[ tips ]` onboarding guide button, and `[ ☀ light / ☾ dark ]` mode toggle.
- **Left Sidebar**: Document uploader, external reference links manager, session star repository, and sessions archive footer.
- **Main Area**: Top 60% HTML5 Canvas2D studio and bottom 40% readable chat area with font sizing and reading progress tracking.

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

### 17 Built-In WebMCP Tools Available to Your Agent
| Tool Name | Category | Purpose |
| :--- | :--- | :--- |
| `get_tool_usage_prompt` | Core | Returns operating instructions for visiting AI agents. |
| `get_reference_url` | Context | Fetches up to 10 stored reference URLs added by the user. |
| `search_document` | Documents | Queries uploaded PDF/DOCX chunks using client-side BM25. |
| `clean_document` | Documents | Clears active document chunks from IndexedDB. |
| `canvas2d_draw_shapes` | Canvas | Appends structured shapes (`rectangle`, `ellipse`, `diamond`, `text`, `sticker`) and perimeter-docked arrows. |
| `canvas2d_inspect_shapes`| Canvas | Returns active scene graph and ASCII topology tree. |
| `canvas2d_modify_shape` | Canvas | Surgically updates shape text, position, or color in-place. |
| `canvas2d_clear` | Canvas | Resets the 2D scene graph. |
| `search_web` | Research | DuckDuckGo web search query. |
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
3. You will see all 17 tools listed. You can invoke them manually or attach your LLM API key directly in the extension to let your model explore and draw live.

---

## 4. Document Ingestion & Private Search

bAssistant allows you to upload reference documents for private query and analysis.

1. **Size Limit**: Accepts files **under 2MB strictly** (`.pdf`, `.docx`, `.doc`). Oversized files trigger an immediate rejection notification.
2. **Zero Server Footprint**: Parsing is executed 100% in-browser using `@llamaindex/liteparse-wasm` with fallback decompressor streams that handle raw hex tokens (`<...> Tj` and `[...] TJ`). No document bytes leave your computer.
3. **BM25 Search Indexing**: Extracted pages are broken into chunks, filtered of stop-words, and stored into browser **IndexedDB**.
4. **Agent Querying**: Visiting agents query documents with targeted keywords via the `search_document` tool, which returns the top 3 ranked pages with relevance scores.

---

## 5. Managing Reference URLs

Ground your visiting AI model with up to 10 live documentation links or reference articles:

1. In the sidebar under **Reference URLs**, paste any HTTP/HTTPS URL into the input field and click **Add**.
2. bAssistant probes the URL status with a quick HEAD/GET request.
3. Visiting agents invoke `get_reference_url` to read your stored links and tailor their research.
4. Click the **×** button beside any link to remove it from your session.

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

## 7. Conversational Reader & Highlights

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

## 8. Session Vault & Multi-Turn Persistence

bAssistant preserves your complete deliberation state across page reloads:

- **Automatic Persistence**: Every conversational turn, user prompt, AI response, and canvas scene graph snapshot is recorded in browser IndexedDB.
- **Accidental Tab Close / Reload**: Reopening the page automatically rehydrates your dialogue messages, active document, and canvas scene.
- **New Session**: Click **New Session** on the canvas toolbar to start a fresh discussion without losing past archives.
- **Session Vault Modal**:
  - Click `sessions` in the sidebar bottom strip.
  - Browse past sessions, see message and turn counts, restore previous conversations, export past session PDFs, or delete old sessions.

---

## 9. Exporting Publication-Ready PDF Reports

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

## 10. Source & Inspection Protection

To provide distraction-free usage and safeguard application layout integrity, bAssistant includes client-side protection:
- **Right-Click**: Disables the default browser context menu.
- **F12**: Prevents the Developer Tools shortcut key.
- **Inspection Shortcuts**: Disables `Ctrl + Shift + I`, `Ctrl + Shift + J`, and `Ctrl + Shift + C` (or `Cmd + Option` on macOS).
- **View Source / Save**: Disables `Ctrl + U` (View Page Source) and `Ctrl + S` (Save Page).

---

## 11. Troubleshooting & FAQs

### Q: Why did my document upload fail?
- **File size**: Ensure your file is strictly **under 2MB**.
- **Format**: Accepted formats are `.pdf`, `.docx`, and `.doc`.
- **Scanned images**: bAssistant extracts natural text and XML tokens; scanned image-only PDFs without OCR layers cannot be tokenized by BM25.

### Q: Where are my documents and chats stored?
All data stays 100% inside your browser's local **IndexedDB** database. No server receives your documents, chat prompts, or canvas diagrams.

### Q: How do I reopen the onboarding guide?
Click the `[ tips ]` button in the top-left cockpit header beside the theme toggle at any time.

---

*bAssistant is released under the strong copyleft **GNU Affero General Public License v3.0 (AGPL-3.0)**.*
