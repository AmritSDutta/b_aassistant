# CLAUDE.md - AI Agent Operational Guide

This document defines the architecture, conventions, and operational rules for AI agents working on the `bAssistant` codebase.

## Codebase Overview
- **Project**: `bAssistant`
- **Architecture**: Zero-backend, 100% client-side React SPA on Vite, deployed to Cloudflare Pages.
- **Purpose**: Equips visiting LLMs with browser WebMCP tools for canvas diagramming, private document retrieval (LiteParse + BM25 in IndexedDB), and research lookups.

## Key Technical Standards & Invariants
1. **Layout**: Strict 20/80 horizontal split. Left 20% sidebar (Branding, FileUpload, BlankSlot); right 80% workspace with 40% CanvasArea and 60% ChatArea.
2. **WebMCP Bridge**: Multi-standard provider (`src/webmcp/provider.ts`) exposing tools on `navigator.modelContext`, `window.webmcp`, and `window.addEventListener('message')` (JSON-RPC 2.0).
3. **Chat History**: All user messages in chat history must be prefixed with `user:`.
4. **Document Ingestion**: Files must be strictly `< 1MB` and format `.pdf`, `.doc`, `.docx`. Oversized files must trigger the `NotificationModal` popup.
5. **Storage**: Pure IndexedDB (`bAssistantDB`) using stores `documents`, `chunks`, and `bm25_index`. No vector databases or external servers.
6. **Testing**: All unit tests in `src/tests/` must be strictly hermetic and isolated with zero external network or server requirements.
7. **Commands**: Always use `npm.cmd` on Windows rather than `npm` to avoid PowerShell execution policy blocks.

## Development Commands
- `npm run dev`: Launch local Vite dev server (`http://localhost:5173`).
- `npm run test`: Run Vitest hermetic test suite.
- `npm run build`: Compile TypeScript and Vite production bundle into `dist/`.
- `npx docs7 dev docs`: Preview the `docs7` documentation site.

## Documentation Reference
Refer to [README.md](file:///C:/codebase/b_aassistant/README.md) for human-facing quickstart and [docs/](file:///C:/codebase/b_aassistant/docs/docs.json) for full component and architecture documentation.
