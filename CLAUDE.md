# CLAUDE.md - AI Agent Operational Guide

This document defines the architecture, conventions, and operational rules for AI agents working on the `bAssistant` codebase.

## Codebase Overview
- **Project**: `bAssistant`
- **Architecture**: Zero-backend, 100% client-side React SPA on Vite, deployed to Cloudflare Pages.
- **Purpose**: Equips visiting LLMs with browser WebMCP tools for canvas diagramming, private document retrieval (LiteParse + BM25 in IndexedDB), and research lookups.

## Key Technical Standards & Invariants
1. **Layout**: Strict 20/80 horizontal split. Left 20% sidebar (Branding, FileUpload, ExportPDF); right 80% workspace split into **60% CanvasArea** (HTML5 Canvas2D Scene Graph) and **40% ChatArea** (humanized message stream).
2. **WebMCP Bridge**: Multi-standard provider (`src/webmcp/provider.ts`) exposing 14 tools on `document.modelContext`, `navigator.modelContext`, `window.webmcp`, hidden DOM forms, and `window.addEventListener('message')` (JSON-RPC 2.0).
   - Core tools: `search_document`, `get_document_outline`, `get_document_page`, `canvas_draw`, `canvas_clear`, `canvas2d_draw_shapes`, `canvas2d_inspect_shapes`, `canvas2d_modify_shape`, `export_pdf`, `chat_post`, `get_chat_history`, `search_web`, `search_research`, `calculate`.
3. **Canvas2D Scene Graph**: Shapes (`rectangle`, `ellipse`, `container`, `connector`, `step`, `callout`) persist in `Canvas2dShape[]` state. Connectors use edge-to-edge perimeter docking.
4. **PDF Export Engine**: `src/lib/pdfExportService.ts` exports dual-section executive PDFs (Canvas HiDPI snapshot + Chat transcript). Enforces blank session protection, cleans LLM markdown formatting noise, and renders native Bengali (বাংলা) and Hindi (हिन्दी) complex scripts via 3x HiDPI Canvas2D text rasterization.
5. **Chat Formatting**: `src/components/HumanizedMessage.tsx` cleans conversational chat streams by removing raw markdown asterisk syntax (`**bold**` -> clean bold, `*item` -> clean bullet) for executive readability.
6. **Chat History**: All user messages in chat history must be prefixed with `user:`.
7. **Document Ingestion**: Files must be strictly `< 1MB` and format `.pdf`, `.doc`, `.docx`. Oversized files must trigger the `NotificationModal` popup.
8. **Storage**: Pure IndexedDB (`bAssistantDB`) using stores `documents`, `chunks`, and `bm25_index`. No vector databases or external servers.
9. **Testing**: All unit tests in `src/tests/` must be strictly hermetic and isolated (currently 57 passing tests across 9 suites).
10. **Commands**: Always use `npm.cmd` on Windows rather than `npm` to avoid PowerShell execution policy blocks.

## Development Commands
- `npm.cmd run dev`: Launch local Vite dev server (`http://localhost:5173`).
- `npm.cmd test -- --run`: Run Vitest hermetic test suite (57 passing tests).
- `npm.cmd run build`: Compile TypeScript and Vite production bundle into `dist/`.
- `node C:\Users\amrit\.gemini\config\skills\docs7\scripts\validate_docs7.mjs docs`: Validate docs7 strict syntax.
- `npx docs7 dev docs`: Preview the `docs7` documentation site.

## Documentation Reference
Refer to [README.md](file:///C:/codebase/b_aassistant/README.md) for human-facing quickstart and [docs/](file:///C:/codebase/b_aassistant/docs/docs.json) for full component and architecture documentation.
