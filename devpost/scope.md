---
doc: scope
status: approved
---

# WebMCP Browser Assistant

A zero-backend, single-page browser environment that empowers visiting LLMs with free WebMCP tools for live HTML canvas diagramming, local document querying, and free-tier web/academic research.

## The Unique Kernel
Instead of paying for expensive multimodal generative models or backend infrastructure, this single-page app acts as a browser-native tool provider via WebMCP. Any visiting LLM can immediately draw interactive diagrams live on an HTML canvas, search free external knowledge sources (DuckDuckGo, ArXiv), and query user documents kept strictly in local browser storage.

## Who It's For
Anyone who wants to learn, research, and explore any topic with AI in a cost-efficient, visually rich manner using their own affordable LLM, without sacrificing privacy or paying for high-tier generative image services.

## The Core Loop
1. The user opens the single page to investigate any topic (and optionally uploads a doc or PDF < 1MB, which is pagewise-chunked in-browser using LiteParse and indexed with a client-side BM25 search index in local datastore).
2. The user's visiting LLM connects to the page via WebMCP and discovers the page's exposed tools.
3. The LLM calls free research tools (DuckDuckGo, ArXiv) and local document tools (querying the BM25 index) to gather information.
4. The LLM streams its written explanation into the bottom 40% chat area and simultaneously calls canvas tools to draw live diagrams and graphs in the top 60% canvas area.
5. The user absorbs the text and visuals together and continues the dialogue.

## Inspiration & Identity
- **Mood / Feel:** Clean, utilitarian, responsive, split-screen cockpit for AI-augmented research and visual thinking.
- **Visual Structure:**
  - Left 20%: Branding (top), File Upload (middle), blank area for future tools (bottom).
  - Right 80%: HTML Canvas (top 60%), Textual Chat Area (bottom 40%) formatted with Lora typography for optimal longform reading and auto-scrolling to the latest turn.

## Why This Matters to the Learner
Enables a practical, genuinely beneficial tool for the community that proves WebMCP's potential in the browser: running multimodal interactions on cheap models, keeping all user data strictly local, and using free-tier tools rather than costly subscriptions.

## What "Working" Looks Like
A user opens the single-page application and activates the WebMCP Inspector testing mode. The inspector shows the exposed WebMCP tools registered and operational:
- `search_web`: DuckDuckGo search (DDGS).
- `search_research`: ArXiv search.
- `calculate`: Decimal math calculations.
- `search_document`: Searches uploaded doc content in IndexedDB via BM25 index.
- `clean_document`: Removes stored content from IndexedDB.
- `canvas2d_draw_shapes`: Appends structured Canvas2D shapes (rectangles, ellipses, diamonds, text, stickers) and perimeter-docked arrows.
- `canvas2d_inspect_shapes`: Inspects active canvas scene graph & ASCII topology graph.
- `canvas2d_modify_shape`: Surgical in-place editing of shape label, position, or colors.
- `canvas2d_clear`: Clears the Canvas2D scene graph.
- `export_pdf`: Generates downloadable publication-quality PDF combining canvas diagram and chat dialogue.
- Canvas drawing & chat tools: Live drawing on the top 60% canvas and streaming text into the bottom 40% chat area.
A test run demonstrates a visiting agent calling these tools, retrieving data, updating chat, and drawing on the canvas live.

## The POC Boundary
- **In Now:**
  - React-based single-page application with responsive layout (20% sidebar with branding and file uploader strictly for Doc/PDF < 1MB; 80% main area split into 60% HTML canvas and 40% chat area).
  - Post-upload processing: in-browser natural per-page extraction using LiteParse (browser WASM / PDF decompressor stream) and client-side BM25 searchable index generation stored in browser datastore (IndexedDB) for accepted files (< 1MB only).
  - Advanced HTML Canvas2D scene graph with perimeter edge-to-edge docking for auto-anchoring arrows, soft-translucent color palette (indigo client, emerald gateway, purple database, orange cache/queue, amber logic, sticky-note stickers), and HiDPI resolution.
  - Client-side PDF export (`exportSessionPdf`) merging canvas snapshot and formatted dialogue into a multi-page PDF report.
  - Starting WebMCP tool provider layer exposing:
    - `search_web` (using DDGS behind)
    - `search_research` (using ArXiv search)
    - `calculate` (decimal math)
    - `search_document` (IndexedDB BM25 content search with automatic query stop-word removal, keyword guidance, and top 3 page results)
    - `clean_document` (remove stored IndexedDB content)
    - `canvas2d_draw_shapes`, `canvas2d_inspect_shapes`, `canvas2d_modify_shape`, `canvas2d_clear`
    - `export_pdf`
    - Canvas drawing & chat tools for the 80% workspace
  - WebMCP Inspector testing mode for direct verification and tool execution.
  - Deployment: Deployed to Cloudflare Pages.

## Later
- Additional free-tier tools as project progresses.
- Features for the 3rd (blank) sidebar section.

## Explicitly Cut
- **Files ≥ 1MB:** Strictly rejected; only doc and PDF files under 1MB are supported.
- **Server-side database / backend servers:** Strictly browser-storage only; zero server footprint.
- **Direct generative image/video AI APIs:** Eliminated by design in favor of fast, free programmatic HTML canvas drawing.
- **Built-in paid LLM billing/routing:** Visiting LLM connectivity is handled by the user's environment/agent via WebMCP.
