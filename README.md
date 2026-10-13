# bAssistant

A zero-backend, single-page browser assistant deployed to Cloudflare Pages that equips visiting LLMs via standard browser WebMCP with live HTML canvas diagramming, local document querying via client-side LiteParse WASM + BM25 in IndexedDB, and free research tools.

## Features

- **Strict 20/80 Cockpit Layout**:
  - **Left 20% Sidebar**: Branding with Light/Dark theme toggle, File Upload (< 1MB Doc/PDF only), and blank reserved slot.
  - **Right 80% Workspace**: Top 40% HTML5 Canvas 2D engine with Clear button; Bottom 60% scrollable Chat history (`user:` prefixed) with input box.
- **Unified Multi-Standard WebMCP Bridge**:
  - `navigator.modelContext`
  - `window.webmcp`
  - `window.postMessage` (JSON-RPC 2.0MCP)
  - Custom events (`webmcp:ready`)
- **100% Private In-Browser Document Indexing**:
  - Files < 1MB (.pdf, .doc, .docx) parsed via LiteParse WASM.
  - Client-side BM25 indexer with inverted index stored in IndexedDB (`bAssistantDB`).
  - Strict size enforcement with error modal popup.
- **Free Research & Math Tools**:
  - `search_web`: DuckDuckGo query API.
  - `search_research`: ArXiv public API query.
  - `calculate`: Precise decimal math evaluation.

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### Installation & Development

```bash
# Clone the repository and install dependencies
npm install

# Start local development server
npm run dev
```

Visit `http://localhost:5173` in your browser.

### Testing

Run the isolated, hermetic Vitest test suite:

```bash
npm run test
```

### Production Build & Deployment

```bash
# Build production bundle
npm run build
```

Deploy the resulting `dist/` directory directly to **Cloudflare Pages**. Zero backend configuration or API keys required.

## Documentation

Comprehensive documentation built with `docs7` is located in the `docs/` folder:
- `docs/index.mdx` - Project overview and structure
- `docs/architecture.mdx` - Architecture diagrams and data flow
- `docs/webmcp.mdx` - WebMCP specification and tool suite
- `docs/document-processing.mdx` - In-browser parsing and BM25 indexing
- `docs/research-tools.mdx` - External research and calculator APIs
- `docs/deployment.mdx` - Cloudflare Pages deployment guide

To view docs locally with docs7:
```bash
npx docs7 dev docs
```
