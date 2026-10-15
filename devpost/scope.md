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
1. The user opens the single page to investigate any topic (and optionally uploads a doc or PDF < 2MB, which is pagewise-chunked in-browser using LiteParse and indexed with a client-side BM25 search index in local datastore).
2. The user's visiting LLM connects to the page via WebMCP and discovers the page's exposed tools.
3. The LLM calls free research tools (DuckDuckGo, ArXiv) and local document tools (querying the BM25 index) to gather information.
4. The LLM streams its written explanation into the bottom 40% chat area and simultaneously calls canvas tools to draw live diagrams and graphs in the top 60% canvas area.
5. The user absorbs the text and visuals together and continues the dialogue.

## Inspiration & Identity
- **Mood / Feel:** Clean, utilitarian, responsive, split-screen cockpit for AI-augmented research and visual thinking.
- **Visual Structure:**
  - Left 20%: Branding (top), File Upload (middle), Session Highlights (bottom — starred messages collect here).
  - Right 80%: HTML Canvas (top 60%), Textual Chat Area (bottom 40%) formatted with Lora typography for optimal longform reading, humanized text rendering (formatting LLM markdown headings, lists, code cards, and bold text without raw markdown symbols), and auto-scrolling to the latest turn.
- **Warm dual themes:** light = warm paper & navy ink; dark = warm ink surfaces (never cold blue-black), driven by a semantic CSS token layer for comfortable long sessions.

## Why This Matters to the Learner
Enables a practical, genuinely beneficial tool for the community that proves WebMCP's potential in the browser: running multimodal interactions on cheap models, keeping all user data strictly local, and using free-tier tools rather than costly subscriptions.

## What "Working" Looks Like
A user opens the single-page application and activates the WebMCP Inspector testing mode. The inspector shows the exposed WebMCP tools registered and operational:
- `get_tool_usage_prompt`: Read-only, zero-argument tool returning the agent operating guide for using every other tool (agents call it first).
- `get_reference_url`: Read-only, zero-argument tool returning comma-separated reference URLs stored in browser cache (up to 10 verified URLs).
- `search_web`: DuckDuckGo search (DDGS).
- `search_research`: ArXiv search.
- `calculate`: Decimal math calculations.
- `search_document`: Searches uploaded doc content in IndexedDB via BM25 index.
- `clean_document`: Removes stored content from IndexedDB.
- `canvas2d_draw_shapes`: Appends structured Canvas2D shapes (rectangles, ellipses, diamonds, text, stickers) and perimeter-docked arrows.
- `canvas2d_inspect_shapes`: Inspects active canvas scene graph & ASCII topology graph.
- `canvas2d_modify_shape`: Surgical in-place editing of shape label, position, or colors.
- `canvas2d_clear`: Clears the Canvas2D scene graph.
- `export_pdf`: Generates downloadable publication-quality PDF combining top-left logo, canvas diagram, multipage chat dialogue, and mandatory AI disclaimer footer.
- `canvas_draw` / `draw_diagram` / `canvas_clear`: Legacy drawing tools for quick graphs on the top 60% canvas.
- `chat_post` / `get_chat_history`: Stream text into the bottom 40% chat area and read dialogue context.
A test run demonstrates a visiting agent calling these tools, retrieving data, updating chat, and drawing on the canvas live.

## The POC Boundary
- **In Now:**
  - React-based single-page application with responsive layout (20% sidebar with dynamic transparent branding logo, file uploader for Doc/PDF < 2MB, enboldened Reference URLs manager for up to 10 probe-verified links, and enboldened Session Highlights; 80% main area split into 60% HTML canvas and 40% chat area).
  - Post-upload processing: in-browser natural per-page extraction using LiteParse (browser WASM / PDF decompressor stream with hex token decoding `<...> Tj` / `[...] TJ` and in-browser DOCX PKZip `word/document.xml` decompression) and client-side BM25 searchable index generation stored in browser datastore (IndexedDB) for accepted files (< 2MB only).
  - Advanced HTML Canvas2D scene graph with auto-centering `fitToContent`, interactive drag-to-pan, wheel zoom, perimeter edge-to-edge docking, 2.5D drop shadows, universal **medium dark yellow** (`#d97706` / Amber 600) **bold labels** anchored at the **top of elements** (`topCenter`) and on connector pills to guarantee sharp readability in both light and dark modes, soft-translucent color palette (indigo client, emerald gateway, purple database, orange cache/queue, amber logic, sticky-note stickers), and HiDPI resolution.
  - Active session persistence and multi-session history management in browser IndexedDB (`session_turns` & `session_meta`): preserves dialogue history and canvas snapshots across page reloads, with a dedicated Session History Modal to browse, restore, export, or delete past sessions, and a "New Session" restart action.
  - Client-side sequential PDF export (`exportSessionPdf`) with blank session validation (blocking download and alerting when canvas and chat are empty), top-left branding logo (`bassistant_light.jpg`), sequential turn-by-turn reporting (chronological turn badges, user questions if present, per-turn canvas snapshots, and AI responses), Markdown humanization, Indic script rendering (Bengali বাংলা and Hindi हिन्दी), multipage pagination buffer (10mm), and mandatory AI disclaimer footer on every page (`AI generated analysis, verify before applying.`).
  - WebMCP tool provider layer exposing 17 tools:
    - `get_tool_usage_prompt` (read-only, zero-arg: returns the agent operating guide for all other tools)
    - `get_reference_url` (read-only, zero-arg: returns comma-separated list of up to 10 stored reference URLs)
    - `search_web` (using DDGS behind)
    - `search_research` (using ArXiv search)
    - `calculate` (decimal math)
    - `search_document` (IndexedDB BM25 content search with automatic query stop-word removal, keyword guidance, and top 3 page results)
    - `clean_document` (remove stored IndexedDB content)
    - `canvas2d_draw_shapes`, `canvas2d_inspect_shapes`, `canvas2d_modify_shape`, `canvas2d_clear`
    - `export_pdf`
    - `canvas_draw`, `draw_diagram`, `canvas_clear` (legacy drawing tools)
    - `chat_post`, `get_chat_history` (chat tools for the 80% workspace)
  - WebMCP Inspector testing mode for direct verification and tool execution.
  - Long-dwell UI enrichment (see `research.md`): warm token-based dual themes, transparent theme-aware branding logo and tab favicon, first-load onboarding popup (how to use, re-openable), chat maximized as a full-screen reader popup, A-/A+ font steps persisted, 2px reading-progress bar, star highlights collected in Session Highlights (sidebar Section 4), "agent is thinking" pulse, per-message copy, dropzone drag-over highlight, gentle session strip, and `prefers-reduced-motion` support.
  - Dedicated Symbol Humanization (`symbolHumanizer.ts`): Transforms LaTeX notations, arrows (`$\rightarrow$`, `\rightarrow`, `$\to$`, `$\Rightarrow$`, `$\Leftarrow$`, `$\leftrightarrow$`), and comparison/math operators into clean Unicode symbols (`→`, `⇒`, `≤`, `≠`, `×`) in the chat area and into clean ASCII (`->`, `=>`) in PDF export, while preserving multiline sequence flow layouts.
  - SEO, Crawler Discoverability & Indexing Standards: Static plain-text `public/robots.txt` (`User-agent: *`, `Allow: /`, `Sitemap: https://bassistant.pages.dev/sitemap.xml`) preventing single-page application fallback syntax errors, `public/sitemap.xml`, `<meta name="description">` (< 160 characters), Open Graph (`og:*`) / Twitter card tags, JSON-LD `WebApplication` schema, and crawler-friendly `<noscript>` semantic outline.
  - Deployment: Deployed to Cloudflare Pages.

## Later
- Additional free-tier tools as project progresses.
- Features for the 3rd (blank) sidebar section.

## Explicitly Cut
- **Files ≥ 2MB:** Strictly rejected; only doc and PDF files under 2MB are supported.
- **MCP server endpoint integration:** Out of scope for this iteration; operates 100% in-browser via WebMCP client protocols (`document.modelContext`, `navigator.modelContext`, `window.webmcp`, and `postMessage`) without external backend SSE/stdio MCP servers.
- **Image, audio, or video data integration:** Out of scope for this iteration; ingestion and processing are focused strictly on text documents (`.pdf`, `.docx`, `.doc`) and public reference URLs.
- **Server-side database / backend servers:** Strictly browser-storage only; zero server footprint.
- **Direct generative image/video AI APIs:** Eliminated by design in favor of fast, free programmatic HTML canvas drawing.
- **Built-in paid LLM billing/routing:** Visiting LLM connectivity is handled by the user's environment/agent via WebMCP.
